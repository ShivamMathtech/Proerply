import base64
from datetime import datetime
from typing import Literal
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Credentials(Strict):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Register(Credentials):
    name: str = Field(min_length=2, max_length=80)

    @field_validator("name")
    @classmethod
    def name_valid(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Enter your name.")
        return v.strip()


class Email(Strict):
    email: EmailStr


class Verify(Email):
    code: str = Field(pattern=r"^\d{6}$")


class ResetPassword(Strict):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(Strict):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    bio: str | None = Field(default=None, max_length=1000)
    avatar: str | None = Field(default=None, max_length=420000)
    publicProfile: bool | None = None
    notifications: bool | None = None
    onboarding: bool | None = None

    @field_validator("avatar")
    @classmethod
    def safe_image(cls, v):
        if not v:
            return v
        if not any(
            v.startswith("data:image/" + t + ";base64,")
            for t in ["png", "jpeg", "webp"]
        ):
            raise ValueError("PNG/JPG/WebP data URL required.")
        try:
            data = base64.b64decode(v.split(",", 1)[1], validate=True)
        except Exception:
            raise ValueError("Invalid image data.")
        if len(data) > 300000:
            raise ValueError("Image exceeds 300 KB.")
        if not (
            data.startswith(b"\x89PNG\r\n\x1a\n")
            or data.startswith(b"\xff\xd8\xff")
            or (data.startswith(b"RIFF") and data[8:12] == b"WEBP")
        ):
            raise ValueError("Invalid image signature.")
        return v


class CourseId(Strict):
    courseId: str = Field(min_length=1, max_length=60)


class ProgressIn(Strict):
    completed: bool | None = None
    position: float | None = Field(default=None, ge=0, le=360000, allow_inf_nan=False)


class AnswersIn(Strict):
    answers: dict[str, int]


class ReminderIn(Strict):
    id: str | None = None
    title: str = Field(min_length=1, max_length=120)
    dueAt: datetime
    description: str = Field(default="", max_length=1000)
    completed: bool = False

    @field_validator("title")
    @classmethod
    def nonblank(cls, v):
        if not v.strip():
            raise ValueError("Title is required.")
        return v.strip()

    @field_validator("dueAt")
    @classmethod
    def timezone_required(cls, v):
        if v.tzinfo is None:
            raise ValueError("An explicit timezone is required.")
        return v


class TextIn(Strict):
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("text")
    @classmethod
    def nonblank(cls, v):
        if not v.strip():
            raise ValueError("Text is required.")
        return v.strip()


class UserId(Strict):
    userId: str = Field(min_length=1, max_length=50)


class SearchIn(Strict):
    q: str = Field(min_length=1, max_length=200)


class RoleIn(Strict):
    role: Literal["learner", "instructor", "admin"]


class CategoryIn(Strict):
    name: str = Field(min_length=2, max_length=60)


class InstructorIn(Strict):
    id: str = Field(pattern=r"^[\w-]{1,50}$")
    userId: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=2, max_length=160)
    bio: str = Field(max_length=3000)
    color: str = Field(max_length=20)
    initials: str = Field(max_length=5)


class BadgeIn(Strict):
    id: str = Field(pattern=r"^[\w-]{1,60}$")
    title: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=2, max_length=1000)
    kind: Literal["lesson", "quiz", "course"]
    threshold: int = Field(ge=1, le=1000)

    @model_validator(mode="after")
    def valid_score(self):
        if self.kind == "quiz" and self.threshold > 100:
            raise ValueError("Quiz threshold must be <=100.")
        return self


class LessonIn(Strict):
    id: str = Field(pattern=r"^[\w-]{1,100}$")
    title: str = Field(min_length=2, max_length=160)
    section: str = Field(min_length=1, max_length=100)
    minutes: int = Field(ge=1, le=600)
    content: str = Field(min_length=10, max_length=20000)
    exercise: str = Field(min_length=1, max_length=5000)
    videoUrl: str = Field(default="", max_length=2000)

    @field_validator("videoUrl")
    @classmethod
    def https_only(cls, v):
        if v and not v.startswith("https://"):
            raise ValueError("Video URL must use HTTPS.")
        return v


class QuestionIn(Strict):
    id: str = Field(pattern=r"^[\w-]{1,100}$")
    text: str = Field(min_length=4, max_length=2000)
    options: list[str] = Field(min_length=2, max_length=8)
    correct: int = Field(ge=0, le=7)
    explanation: str = Field(min_length=2, max_length=3000)

    @model_validator(mode="after")
    def validate_options(self):
        if self.correct >= len(self.options) or any(
            not o.strip() or len(o) > 1000 for o in self.options
        ):
            raise ValueError("Provide valid options and a correct index.")
        return self


class QuizIn(Strict):
    id: str = Field(max_length=60)
    title: str = Field(min_length=2, max_length=200)
    passScore: int = Field(ge=1, le=100)
    questions: list[QuestionIn] = Field(min_length=1, max_length=50)


class CourseIn(Strict):
    id: str = Field(pattern=r"^[\w-]{1,60}$")
    title: str = Field(min_length=4, max_length=160)
    category: str = Field(min_length=2, max_length=60)
    instructorId: str = Field(min_length=1, max_length=50)
    price: float = Field(ge=0, le=10000, allow_inf_nan=False)
    level: Literal["Beginner", "Intermediate", "Advanced"]
    rating: float = Field(default=0, ge=0, le=5, allow_inf_nan=False)
    students: int = Field(default=0, ge=0)
    color: Literal["blue", "peach", "mint", "yellow", "lavender", "rose"]
    art: Literal["code", "design", "data", "photo", "brand", "python"]
    description: str = Field(min_length=15, max_length=5000)
    language: str = Field(min_length=2, max_length=40)
    published: bool
    duration: int = Field(ge=0, le=60000)
    outcomes: list[str] = Field(min_length=1, max_length=30)
    requirements: list[str] = Field(max_length=30)
    lessons: list[LessonIn] = Field(min_length=1, max_length=100)
    quiz: QuizIn

    @model_validator(mode="after")
    def unique_ids(self):
        if len({l.id for l in self.lessons}) != len(self.lessons) or len(
            {q.id for q in self.quiz.questions}
        ) != len(self.quiz.questions):
            raise ValueError("Lesson and question IDs must be unique.")
        if self.quiz.id != self.id:
            raise ValueError("Quiz ID must equal course ID.")
        if any(
            not v.strip() or len(v) > 500 for v in self.outcomes + self.requirements
        ):
            raise ValueError(
                "Outcomes/requirements must be nonempty and <=500 characters."
            )
        return self


class SDP(Strict):
    type: Literal["offer", "answer"]
    sdp: str = Field(min_length=1, max_length=100000)


class Signal(Strict):
    offer: SDP | None = None
    answer: SDP | None = None
    ended: bool | None = None

    @model_validator(mode="after")
    def one_action(self):
        if sum(x is not None for x in [self.offer, self.answer, self.ended]) != 1:
            raise ValueError("Exactly one signaling action is required.")
        if self.offer and self.offer.type != "offer":
            raise ValueError("Invalid offer.")
        if self.answer and self.answer.type != "answer":
            raise ValueError("Invalid answer.")
        return self
