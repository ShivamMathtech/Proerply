"""Create an explicitly requested administrator/instructor account on the server."""

import argparse, getpass
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select
from .db import SessionLocal
from . import models as m
from .security import hasher
from .seed import seed

parser = argparse.ArgumentParser()
parser.add_argument("--email", required=True)
parser.add_argument("--name", required=True)
parser.add_argument(
    "--role", choices=["admin", "instructor", "learner"], default="admin"
)
args = parser.parse_args()
email = str(TypeAdapter(EmailStr).validate_python(args.email)).lower()
password = getpass.getpass("Password (at least 12 characters): ")
if len(password) < 12 or password != getpass.getpass("Repeat password: "):
    raise SystemExit("Passwords must match and contain at least 12 characters.")
with SessionLocal() as db:
    seed(db, demo=False)
    if db.scalar(select(m.User).where(m.User.email == email)):
        raise SystemExit("Account exists; no changes made.")
    u = m.User(
        name=args.name[:80],
        email=email,
        role=args.role,
        password_hash=hasher.hash(password),
    )
    db.add(u)
    db.flush()
    db.add(m.Profile(user_id=u.id))
    if args.role == "instructor":
        db.add(
            m.Instructor(
                id=u.id,
                user_id=u.id,
                name=u.name,
                title="Instructor",
                bio="",
                initials=u.name[:2].upper(),
            )
        )
    db.commit()
print("Account created.")
