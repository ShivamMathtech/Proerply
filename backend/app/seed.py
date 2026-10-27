"""Repeatable seed. Existing courses, accounts and learner activity are preserved."""

import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from .db import SessionLocal
from .config import settings
from . import models as m
from .schemas import CourseIn
from .security import hasher
from .domain import save_course, enroll_once


def seed(db, demo=None, password=None):
    demo = settings.seed_demo_users if demo is None else demo
    password = settings.seed_password if password is None else password
    for role, perms in {
        "learner": ["learn", "own_records"],
        "instructor": ["learn", "own_records", "own_courses"],
        "admin": ["learn", "own_records", "manage_all"],
    }.items():
        if not db.get(m.Role, role):
            db.add(m.Role(id=role, permissions=perms))
    catalog = json.loads(Path(__file__).with_name("catalog.json").read_text())
    for category in catalog["categories"]:
        if not db.get(m.Category, category):
            db.add(m.Category(name=category))
    for badge in catalog["badges"]:
        if not db.get(m.Badge, badge["id"]):
            db.add(m.Badge(**badge))
    db.commit()
    if not demo:
        return
    if settings.app_env == "production":
        raise RuntimeError("Demo account seeding is forbidden in production.")
    if not password or len(password) < 12:
        raise RuntimeError(
            "Set SEED_PASSWORD to a local development password of at least 12 characters."
        )
    people = [
        ("learner", "Alex Morgan", "learner", "learner"),
        ("teacher", "Maya Chen", "instructor", "instructor"),
        ("teacher2", "Leo Williams", "instructor", "leo"),
        ("teacher3", "Sara Patel", "instructor", "sara"),
        ("admin", "Jordan Lee", "admin", "admin"),
    ]
    for uid, name, role, email in people:
        if not db.get(m.User, uid):
            db.add(
                m.User(
                    id=uid,
                    name=name,
                    email=email + "@proerply.demo",
                    role=role,
                    password_hash=hasher.hash(password),
                )
            )
            db.flush()
            db.add(
                m.Profile(
                    user_id=uid,
                    bio="Learning a little, every day.",
                    public_profile=role != "admin",
                    onboarding=True,
                )
            )
    db.commit()
    for data in catalog["instructors"]:
        if not db.get(m.Instructor, data["id"]):
            db.add(
                m.Instructor(
                    id=data["id"],
                    user_id=data["userId"],
                    name=data["name"],
                    title=data["title"],
                    bio=data["bio"],
                    color=data["color"],
                    initials=data["initials"],
                )
            )
    db.commit()
    for data in catalog["courses"]:
        if not db.get(m.Course, data["id"]):
            save_course(db, CourseIn.model_validate(data), seed=True)
    db.commit()
    enroll_once(db, "learner", "react")
    if not db.get(m.Reminder, "welcome-reminder"):
        db.add(
            m.Reminder(
                id="welcome-reminder",
                user_id="learner",
                title="A little learning, a big step",
                description="Make time for your first React lesson.",
                due_at=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            )
        )
    if not db.get(m.Conversation, "mentor"):
        db.add(m.Conversation(id="mentor", pair_key="learner:teacher"))
        db.flush()
        db.add_all(
            [
                m.Member(conversation_id="mentor", user_id="learner"),
                m.Member(conversation_id="mentor", user_id="teacher"),
            ]
        )
        db.flush()
        db.add(
            m.Message(
                conversation_id="mentor",
                sender_id="teacher",
                text="Welcome to Proerply. This is a seeded welcome message. New messages in API mode are sent to real accounts; no automated replies are generated.",
            )
        )
    db.commit()


if __name__ == "__main__":
    with SessionLocal() as db:
        seed(db)
    print(
        "Seed complete. Existing records were preserved. Demo accounts enabled:",
        settings.seed_demo_users,
    )
