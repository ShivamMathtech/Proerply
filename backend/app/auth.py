import json, secrets, smtplib, time
from pathlib import Path
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, delete, update
from sqlalchemy.exc import IntegrityError
from . import models as m, schemas as s
from .db import get_db
from .config import settings
from .security import (
    current_user,
    optional_user,
    new_session,
    throttle,
    digest,
    hasher,
    verify,
    dummy_hash,
    audit,
)
from .serializers import user_out

router = APIRouter(prefix="/auth", tags=["Authentication"])


def limit(request, action, email=""):
    ip = request.client.host if request.client else "unknown"
    throttle(action + ":ip:" + ip, 30 if action == "login" else 15)
    if email:
        throttle(action + ":email:" + email.lower(), 10)


@router.get("/session")
def session(request: Request, user=Depends(optional_user), db=Depends(get_db)):
    return {
        "user": user_out(db, user) if user else None,
        "csrfToken": request.state.session.csrf if user else "",
    }


@router.post("/register", status_code=201)
def register(
    data: s.Register, request: Request, response: Response, db=Depends(get_db)
):
    limit(request, "register", str(data.email))
    email = str(data.email).lower()
    if db.scalar(select(m.User).where(m.User.email == email)):
        raise HTTPException(409, "An account with this email already exists.")
    u = m.User(
        email=email,
        name=data.name,
        password_hash=hasher.hash(data.password),
        role="learner",
    )
    db.add(u)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists.")
    db.add(m.Profile(user_id=u.id))
    audit(db, u, "Account registered")
    db.flush()
    sess = new_session(db, u, response, request)
    return {"user": user_out(db, u), "csrfToken": sess.csrf}


@router.post("/login")
def login(
    data: s.Credentials, request: Request, response: Response, db=Depends(get_db)
):
    limit(request, "login", str(data.email))
    user = db.scalar(select(m.User).where(m.User.email == str(data.email).lower()))
    ok = verify(data.password, user.password_hash if user else dummy_hash)
    if not user or not ok:
        raise HTTPException(401, "Email or password is incorrect.")
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(data.password)
    sess = new_session(db, user, response, request)
    return {"user": user_out(db, user), "csrfToken": sess.csrf}


@router.post("/refresh")
def refresh(
    request: Request, response: Response, user=Depends(current_user), db=Depends(get_db)
):
    sess = new_session(db, user, response, request)
    return {"user": user_out(db, user), "csrfToken": sess.csrf}


@router.post("/logout", status_code=204)
def logout(
    request: Request, response: Response, user=Depends(current_user), db=Depends(get_db)
):
    db.delete(request.state.session)
    db.commit()
    response.delete_cookie(
        "proerply_session",
        path="/api",
        secure=settings.secure,
        samesite=settings.cookie_samesite,
    )


@router.post("/forgot-password")
def forgot(data: s.Email, request: Request, db=Depends(get_db)):
    limit(request, "reset", str(data.email))
    if settings.app_env == "production" and not settings.smtp_host:
        raise HTTPException(
            503, "Password recovery is not configured. Contact the administrator."
        )
    email = str(data.email).lower()
    u = db.scalar(select(m.User).where(m.User.email == email))
    code = f"{secrets.randbelow(1000000):06d}"
    code_hash = hasher.hash(code)
    if u:
        db.execute(delete(m.Reset).where(m.Reset.user_id == u.id))
        reset = m.Reset(user_id=u.id, code_hash=code_hash, expires=time.time() + 600)
        db.add(reset)
        db.commit()
        if settings.smtp_host:
            mail = EmailMessage()
            mail["From"] = settings.smtp_from
            mail["To"] = email
            mail["Subject"] = "Your Proerply reset code"
            mail.set_content(
                f"Your password reset code is {code}. It expires in 10 minutes. If you did not request this, ignore this message."
            )
            try:
                with smtplib.SMTP(
                    settings.smtp_host, settings.smtp_port, timeout=15
                ) as smtp:
                    if settings.smtp_starttls:
                        smtp.starttls()
                    if settings.smtp_user:
                        smtp.login(settings.smtp_user, settings.smtp_password)
                    smtp.send_message(mail)
            except (OSError, smtplib.SMTPException):
                # Do not expose whether the account exists; this status is uniform below.
                reset.used = True
                db.commit()
        else:
            directory = Path("data/dev-mailbox")
            directory.mkdir(parents=True, exist_ok=True)
            target = directory / (reset.id + ".json")
            target.write_text(
                json.dumps({"email": email, "code": code, "expiresAt": reset.expires}),
                encoding="utf-8",
            )
            target.chmod(0o600)
    message = "If the account exists, a reset code has been requested. Check your email or contact the administrator if delivery fails."
    if not settings.smtp_host:
        message = "Development mode: no email was sent. If the account exists, its code is in backend/data/dev-mailbox/. See the setup guide."
    return {"message": message}


@router.post("/verify-reset-code")
def verify_code(data: s.Verify, request: Request, db=Depends(get_db)):
    limit(request, "verify", str(data.email))
    u = db.scalar(select(m.User).where(m.User.email == str(data.email).lower()))
    r = (
        db.scalar(
            select(m.Reset)
            .where(m.Reset.user_id == u.id, m.Reset.used.is_(False))
            .with_for_update()
        )
        if u
        else None
    )
    if not r or r.expires < time.time() or r.attempts >= 5 or r.token_hash:
        raise HTTPException(
            400, "Invalid or expired code. Start password recovery again."
        )
    r.attempts += 1
    if not verify(data.code, r.code_hash):
        db.commit()
        raise HTTPException(400, "Invalid or expired code.")
    token = secrets.token_urlsafe(40)
    r.token_hash = digest(token)
    r.code_hash = hasher.hash(secrets.token_urlsafe(24))
    db.commit()
    return {"token": token}


@router.post("/reset-password", status_code=204)
def reset_password(data: s.ResetPassword, request: Request, db=Depends(get_db)):
    limit(request, "new-password")
    r = db.scalar(
        select(m.Reset)
        .where(
            m.Reset.token_hash == digest(data.token),
            m.Reset.used.is_(False),
            m.Reset.expires > time.time(),
        )
        .with_for_update()
    )
    if not r:
        raise HTTPException(400, "Invalid or expired reset token.")
    result = db.execute(
        update(m.Reset)
        .where(m.Reset.id == r.id, m.Reset.used.is_(False))
        .values(used=True)
    )
    if result.rowcount != 1:
        raise HTTPException(400, "Reset token was already used.")
    user = db.get(m.User, r.user_id)
    user.password_hash = hasher.hash(data.password)
    db.execute(delete(m.Session).where(m.Session.user_id == user.id))
    audit(db, user, "Password reset; all sessions revoked")
    db.commit()
