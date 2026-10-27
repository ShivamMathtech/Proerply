from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    ForeignKey,
    JSON,
    UniqueConstraint,
    CheckConstraint,
)
from .db import Base


def uid():
    return str(uuid4())


def now():
    return datetime.now(timezone.utc).isoformat()


class Role(Base):
    __tablename__ = "roles"
    id = Column(String(20), primary_key=True)
    permissions = Column(JSON, nullable=False, default=list)


class User(Base):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True, default=uid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(80), nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), ForeignKey("roles.id"), nullable=False, default="learner")
    created_at = Column(String(40), nullable=False, default=now)


class Profile(Base):
    __tablename__ = "profiles"
    user_id = Column(
        String(50), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    bio = Column(Text, nullable=False, default="")
    avatar = Column(Text, nullable=False, default="")
    public_profile = Column(Boolean, nullable=False, default=False)
    notifications = Column(Boolean, nullable=False, default=False)
    onboarding = Column(Boolean, nullable=False, default=False)
    search_history = Column(JSON, nullable=False, default=list)


class Session(Base):
    __tablename__ = "sessions"
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    csrf = Column(String(100), nullable=False)
    expires = Column(Float, nullable=False, index=True)


class Reset(Base):
    __tablename__ = "password_resets"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code_hash = Column(Text, nullable=False)
    token_hash = Column(String(64), nullable=True, index=True)
    expires = Column(Float, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    used = Column(Boolean, nullable=False, default=False)


class Category(Base):
    __tablename__ = "categories"
    name = Column(String(60), primary_key=True)


class Instructor(Base):
    __tablename__ = "instructors"
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String(80), nullable=False)
    title = Column(String(160), nullable=False)
    bio = Column(Text, nullable=False, default="")
    color = Column(String(20), nullable=False, default="blue")
    initials = Column(String(5), nullable=False, default="")


class Course(Base):
    __tablename__ = "courses"
    id = Column(String(60), primary_key=True)
    title = Column(String(160), nullable=False, index=True)
    category = Column(
        String(60), ForeignKey("categories.name"), nullable=False, index=True
    )
    instructor_id = Column(
        String(50), ForeignKey("instructors.id"), nullable=False, index=True
    )
    price_cents = Column(Integer, nullable=False, default=0)
    level = Column(String(20), nullable=False, default="Beginner")
    published = Column(Boolean, nullable=False, default=False, index=True)
    info = Column(JSON, nullable=False, default=dict)
    updated_at = Column(String(40), nullable=False, default=now)
    __table_args__ = (CheckConstraint("price_cents >= 0", name="nonnegative_price"),)


class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(String(100), primary_key=True)
    course_id = Column(
        String(60),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, nullable=False)
    title = Column(String(160), nullable=False)
    section = Column(String(100), nullable=False)
    minutes = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    exercise = Column(Text, nullable=False, default="")
    video_url = Column(Text, nullable=False, default="")


class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(String(60), ForeignKey("courses.id"), nullable=False, index=True)
    created_at = Column(String(40), nullable=False, default=now)
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="one_enrollment_per_user_course"),
    )


class Progress(Base):
    __tablename__ = "learning_progress"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    lesson_id = Column(
        String(100), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    completed = Column(Boolean, nullable=False, default=False)
    position = Column(Float, nullable=False, default=0)
    updated_at = Column(String(40), nullable=False, default=now)
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="one_progress_per_lesson"),
    )


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(String(60), primary_key=True)
    course_id = Column(
        String(60),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    title = Column(String(200), nullable=False)
    pass_score = Column(Integer, nullable=False, default=75)
    revision = Column(Integer, nullable=False, default=1)


class Question(Base):
    __tablename__ = "questions"
    id = Column(String(100), primary_key=True)
    quiz_id = Column(
        String(60),
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    correct = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)


class AnswerOption(Base):
    __tablename__ = "answer_options"
    id = Column(String(50), primary_key=True, default=uid)
    question_id = Column(
        String(100),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("question_id", "position", name="one_option_position"),
    )


class Attempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    quiz_id = Column(String(60), ForeignKey("quizzes.id"), nullable=False, index=True)
    revision = Column(Integer, nullable=False, default=1)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    answers = Column(JSON, nullable=False)
    feedback = Column(JSON, nullable=False)
    created_at = Column(String(40), nullable=False, default=now)


class Order(Base):
    __tablename__ = "orders"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(String(60), ForeignKey("courses.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")
    status = Column(String(20), nullable=False, default="pending")
    provider_id = Column(String(255), nullable=True, unique=True)
    created_at = Column(String(40), nullable=False, default=now)


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    id = Column(String(255), primary_key=True)
    order_id = Column(String(50), ForeignKey("orders.id"), nullable=True)
    created_at = Column(String(40), nullable=False, default=now)


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    due_at = Column(String(40), nullable=False)
    description = Column(Text, nullable=False, default="")
    completed = Column(Boolean, nullable=False, default=False)


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String(50), primary_key=True, default=uid)
    pair_key = Column(String(120), nullable=False, unique=True)
    created_at = Column(String(40), nullable=False, default=now)


class Member(Base):
    __tablename__ = "conversation_members"
    conversation_id = Column(
        String(50), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True
    )
    user_id = Column(String(50), ForeignKey("users.id"), primary_key=True)


class Message(Base):
    __tablename__ = "messages"
    id = Column(String(50), primary_key=True, default=uid)
    conversation_id = Column(
        String(50),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(String(40), nullable=False, default=now)
    read = Column(Boolean, nullable=False, default=False)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(String(40), nullable=False, default=now)


class Badge(Base):
    __tablename__ = "badges"
    id = Column(String(60), primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    kind = Column(String(20), nullable=False)
    threshold = Column(Integer, nullable=False)


class Achievement(Base):
    __tablename__ = "achievements"
    user_id = Column(String(50), ForeignKey("users.id"), primary_key=True)
    badge_id = Column(String(60), ForeignKey("badges.id"), primary_key=True)
    awarded_at = Column(String(40), nullable=False, default=now)


class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(String(50), primary_key=True, default=uid)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(String(60), ForeignKey("courses.id"), nullable=False)
    name = Column(String(80), nullable=False)
    course_title = Column(String(160), nullable=False)
    issued_at = Column(String(40), nullable=False, default=now)
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="one_certificate_per_course"),
    )


class Audit(Base):
    __tablename__ = "audits"
    id = Column(String(50), primary_key=True, default=uid)
    actor_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    created_at = Column(String(40), nullable=False, default=now)


class Call(Base):
    __tablename__ = "calls"
    conversation_id = Column(
        String(50), ForeignKey("conversations.id"), primary_key=True
    )
    caller_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    offer = Column(JSON, nullable=True)
    answer = Column(JSON, nullable=True)
    ended = Column(Boolean, nullable=False, default=False)
    expires = Column(Float, nullable=False)
