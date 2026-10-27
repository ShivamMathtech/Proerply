import hashlib, secrets, time
from collections import defaultdict, deque
from threading import Lock
from fastapi import Depends, HTTPException, Request, Response
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from sqlalchemy import select, delete
from .db import get_db
from . import models as m
from .config import settings

hasher = PasswordHasher()
dummy_hash = hasher.hash(secrets.token_urlsafe(32))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def verify(password, hashed):
    try:
        return hasher.verify(hashed, password)
    except (VerificationError, InvalidHashError):
        return False


_lock = Lock()
_buckets = defaultdict(deque)


def throttle(key, limit=10, window=300):
    current = time.time()
    with _lock:
        if len(_buckets) > 10000:
            for k in list(_buckets):
                if not _buckets[k] or _buckets[k][-1] < current - window:
                    del _buckets[k]
        bucket = _buckets[key]
        while bucket and bucket[0] < current - window:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(
                429,
                "Too many attempts. Please try again later.",
                headers={"Retry-After": str(window)},
            )
        bucket.append(current)


def optional_user(request: Request, db=Depends(get_db)):
    token = request.cookies.get("proerply_session", "")
    session = db.get(m.Session, digest(token)) if token else None
    if not session or session.expires < time.time():
        return None
    user = db.get(m.User, session.user_id)
    request.state.session = session
    return user


def current_user(request: Request, db=Depends(get_db), user=Depends(optional_user)):
    if not user:
        raise HTTPException(401, "Please sign in to continue.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        csrf = request.headers.get("X-CSRF-Token", "")
        if not csrf or not secrets.compare_digest(csrf, request.state.session.csrf):
            raise HTTPException(
                403, "Invalid CSRF token. Refresh the page and try again."
            )
    return user


def staff(user=Depends(current_user)):
    if user.role not in ("admin", "instructor"):
        raise HTTPException(403, "Instructor or administrator access is required.")
    return user


def admin(user=Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Administrator access is required.")
    return user


def new_session(db, user, response: Response, request: Request | None = None):
    if request:
        old = request.cookies.get("proerply_session", "")
        if old:
            db.execute(delete(m.Session).where(m.Session.token_hash == digest(old)))
    token = secrets.token_urlsafe(48)
    session = m.Session(
        token_hash=digest(token),
        user_id=user.id,
        csrf=secrets.token_urlsafe(32),
        expires=time.time() + settings.session_days * 86400,
    )
    db.add(session)
    db.execute(delete(m.Session).where(m.Session.expires < time.time()))
    db.commit()
    response.set_cookie(
        "proerply_session",
        token,
        httponly=True,
        secure=settings.secure,
        samesite=settings.cookie_samesite,
        max_age=settings.session_days * 86400,
        path="/api",
    )
    return session


def audit(db, user, action):
    db.add(m.Audit(actor_id=user.id if user else None, action=action))
