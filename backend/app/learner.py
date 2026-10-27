from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, delete, func
from . import models as m, schemas as s
from .db import get_db
from .security import current_user, optional_user, throttle
from .serializers import *
from .domain import (
    get_course,
    enrolled,
    require_enrollment,
    award,
    enroll_once,
    safe_insert,
    conversation_member,
)

router = APIRouter(tags=["Learning workspace"])


def unlocked(db, c, u):
    return bool(
        u
        and (
            enrolled(db, u.id, c.id)
            or u.role == "admin"
            or (
                u.role == "instructor"
                and db.get(m.Instructor, c.instructor_id).user_id == u.id
            )
        )
    )


def course_list(
    db,
    user,
    q="",
    category="",
    level="",
    rating=0,
    duration="",
    price="",
    sort="",
    offset=0,
    limit=100,
):
    courses = list(
        db.scalars(
            select(m.Course).where(m.Course.published.is_(True)).order_by(m.Course.id)
        )
    )
    if category:
        courses = [c for c in courses if c.category == category]
    if level:
        courses = [c for c in courses if c.level == level]
    if rating:
        courses = [c for c in courses if c.info.get("rating", 0) >= rating]
    if price:
        courses = [
            c
            for c in courses
            if (c.price_cents == 0 if price == "free" else c.price_cents > 0)
        ]
    if q:
        needle = q.lower()
        courses = [
            c
            for c in courses
            if needle
            in " ".join(
                [
                    c.title,
                    c.category,
                    c.info.get("description", ""),
                    *c.info.get("outcomes", []),
                    db.get(m.Instructor, c.instructor_id).name,
                ]
            ).lower()
        ]
    result = [course_out(db, c, unlocked(db, c, user)) for c in courses]
    if duration:
        result = [
            c
            for c in result
            if (c["duration"] <= 60 if duration == "short" else c["duration"] > 60)
        ]
    if sort in ("rating", "popular", "price", "price-desc"):
        result.sort(
            key=lambda c: (
                c["rating"]
                if sort == "rating"
                else c["students"] if sort == "popular" else c["price"]
            ),
            reverse=sort in ("rating", "popular", "price-desc"),
        )
    return result[offset : offset + limit]


@router.get("/courses")
@router.get("/courses/search")
def courses(
    q: str = Query("", max_length=200),
    category: str = "",
    level: str = "",
    rating: float = Query(0, ge=0, le=5),
    duration: str = "",
    price: str = "",
    sort: str = "",
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(optional_user),
):
    return course_list(
        db, user, q, category, level, rating, duration, price, sort, offset, limit
    )


@router.get("/courses/{cid}")
def course(cid: str, db=Depends(get_db), user=Depends(optional_user)):
    c = get_course(db, cid, user)
    return course_out(db, c, unlocked(db, c, user))


@router.get("/courses/{cid}/lessons")
def lessons(cid: str, db=Depends(get_db), user=Depends(current_user)):
    get_course(db, cid, user)
    require_enrollment(db, user, cid)
    return [
        lesson_out(l)
        for l in db.scalars(
            select(m.Lesson)
            .where(m.Lesson.course_id == cid)
            .order_by(m.Lesson.position)
        )
    ]


@router.get("/categories")
def categories(db=Depends(get_db)):
    return list(db.scalars(select(m.Category.name).order_by(m.Category.name)))


@router.get("/instructors")
def instructors(db=Depends(get_db)):
    return [instructor_out(x) for x in rows(db, m.Instructor)]


@router.get("/users/me")
def me(db=Depends(get_db), user=Depends(current_user)):
    return user_out(db, user)


@router.patch("/users/me")
def update_me(data: s.ProfileUpdate, db=Depends(get_db), user=Depends(current_user)):
    p = db.get(m.Profile, user.id)
    for k, v in data.model_dump(exclude_none=True).items():
        if k == "name":
            if not v.strip():
                raise HTTPException(422, "Display name cannot be blank.")
            user.name = v.strip()
        else:
            setattr(p, {"publicProfile": "public_profile"}.get(k, k), v)
    db.commit()
    return user_out(db, user)


@router.get("/users/{uid}")
def public_user(uid: str, db=Depends(get_db), user=Depends(current_user)):
    u = db.get(m.User, uid)
    if not u:
        raise HTTPException(404, "Learner not found.")
    p = db.get(m.Profile, uid)
    return {
        "user": {
            "id": u.id,
            "name": u.name,
            "avatar": p.avatar,
            "publicProfile": p.public_profile,
            "bio": p.bio if p.public_profile else "",
        },
        "certificates": (
            [certificate_out(c) for c in rows(db, m.Certificate, user_id=uid)]
            if p.public_profile
            else []
        ),
    }


@router.get("/search-history")
def history(db=Depends(get_db), user=Depends(current_user)):
    return db.get(m.Profile, user.id).search_history


@router.post("/search-history", status_code=204)
def remember(data: s.SearchIn, db=Depends(get_db), user=Depends(current_user)):
    p = db.get(m.Profile, user.id)
    q = data.q.strip()
    p.search_history = (
        ([q] + [x for x in p.search_history if x != q])[:8] if q else p.search_history
    )
    db.commit()


@router.delete("/search-history", status_code=204)
def clear_history(db=Depends(get_db), user=Depends(current_user)):
    db.get(m.Profile, user.id).search_history = []
    db.commit()


@router.get("/enrollments/me")
def enrollments(db=Depends(get_db), user=Depends(current_user)):
    return [enrollment_out(x) for x in rows(db, m.Enrollment, user_id=user.id)]


@router.post("/enrollments")
def enroll(data: s.CourseId, db=Depends(get_db), user=Depends(current_user)):
    c = get_course(db, data.courseId, user)
    existing = enrolled(db, user.id, c.id)
    if existing:
        return enrollment_out(existing)
    if c.price_cents and not db.scalar(
        select(m.Order).where(
            m.Order.user_id == user.id,
            m.Order.course_id == c.id,
            m.Order.status == "paid",
        )
    ):
        raise HTTPException(402, "This course requires a verified payment.")
    e = enroll_once(db, user.id, c.id)
    db.commit()
    return enrollment_out(e)


@router.get("/progress")
def progress(db=Depends(get_db), user=Depends(current_user)):
    return [progress_out(db, x) for x in rows(db, m.Progress, user_id=user.id)]


@router.put("/progress/{lid}")
def update_progress(
    lid: str, data: s.ProgressIn, db=Depends(get_db), user=Depends(current_user)
):
    l = db.get(m.Lesson, lid)
    if not l:
        raise HTTPException(404, "Lesson not found.")
    require_enrollment(db, user, l.course_id)
    p = db.scalar(
        select(m.Progress).where(
            m.Progress.user_id == user.id, m.Progress.lesson_id == lid
        )
    )
    if not p:
        p = m.Progress(user_id=user.id, lesson_id=lid)
        if not safe_insert(db, p):
            p = db.scalar(
                select(m.Progress).where(
                    m.Progress.user_id == user.id, m.Progress.lesson_id == lid
                )
            )
    if data.completed is not None:
        p.completed = data.completed
    if data.position is not None:
        p.position = data.position
    p.updated_at = m.now()
    db.flush()
    award(db, user)
    db.commit()
    return progress_out(db, p)


@router.get("/quizzes/{qid}")
def quiz(qid: str, db=Depends(get_db), user=Depends(current_user)):
    q = db.get(m.Quiz, qid)
    if not q:
        raise HTTPException(404, "Assessment not found.")
    require_enrollment(db, user, q.course_id)
    return quiz_out(db, q)


@router.post("/quizzes/{qid}/submit")
def submit_quiz(
    qid: str, data: s.AnswersIn, db=Depends(get_db), user=Depends(current_user)
):
    throttle("quiz:" + user.id, 30)
    q = db.get(m.Quiz, qid)
    if not q:
        raise HTTPException(404, "Assessment not found.")
    require_enrollment(db, user, q.course_id)
    questions = quiz_out(db, q, True)["questions"]
    if set(data.answers) != {x["id"] for x in questions} or any(
        data.answers[x["id"]] < 0 or data.answers[x["id"]] >= len(x["options"])
        for x in questions
    ):
        raise HTTPException(422, "Answer every current question with a valid option.")
    score = int(
        100
        * sum(data.answers[x["id"]] == x["correct"] for x in questions)
        / len(questions)
        + 0.5
    )
    a = m.Attempt(
        user_id=user.id,
        quiz_id=q.id,
        revision=q.revision,
        score=score,
        passed=score >= q.pass_score,
        answers=data.answers,
        feedback=[
            {"id": x["id"], "correct": x["correct"], "explanation": x["explanation"]}
            for x in questions
        ],
    )
    db.add(a)
    db.flush()
    award(db, user)
    db.commit()
    return attempt_out(a)


@router.get("/assessments")
def attempts(db=Depends(get_db), user=Depends(current_user)):
    return [
        attempt_out(a)
        for a in db.scalars(
            select(m.Attempt)
            .join(m.Quiz, m.Quiz.id == m.Attempt.quiz_id)
            .where(m.Attempt.user_id == user.id, m.Attempt.revision == m.Quiz.revision)
            .order_by(m.Attempt.created_at)
        )
    ]


@router.get("/reminders")
def reminders(db=Depends(get_db), user=Depends(current_user)):
    return [reminder_out(r) for r in rows(db, m.Reminder, user_id=user.id)]


def own_reminder(db, user, rid):
    r = db.get(m.Reminder, rid)
    if not r or r.user_id != user.id:
        raise HTTPException(404, "Reminder not found.")
    return r


@router.post("/reminders", status_code=201)
def add_reminder(data: s.ReminderIn, db=Depends(get_db), user=Depends(current_user)):
    r = m.Reminder(
        user_id=user.id,
        title=data.title,
        due_at=data.dueAt.astimezone(timezone.utc).isoformat(),
        description=data.description,
        completed=data.completed,
    )
    db.add(r)
    db.commit()
    return reminder_out(r)


@router.patch("/reminders/{rid}")
def edit_reminder(
    rid: str, data: s.ReminderIn, db=Depends(get_db), user=Depends(current_user)
):
    r = own_reminder(db, user, rid)
    r.title = data.title
    r.due_at = data.dueAt.astimezone(timezone.utc).isoformat()
    r.description = data.description
    r.completed = data.completed
    db.commit()
    return reminder_out(r)


@router.delete("/reminders/{rid}", status_code=204)
def delete_reminder(rid: str, db=Depends(get_db), user=Depends(current_user)):
    db.delete(own_reminder(db, user, rid))
    db.commit()


@router.get("/conversations")
def conversations(db=Depends(get_db), user=Depends(current_user)):
    return [
        conversation_out(db, c, user.id)
        for c in db.scalars(
            select(m.Conversation)
            .join(m.Member, m.Member.conversation_id == m.Conversation.id)
            .where(m.Member.user_id == user.id)
            .order_by(m.Conversation.created_at.desc())
            .limit(100)
        )
    ]


@router.post("/conversations")
def start_conversation(data: s.UserId, db=Depends(get_db), user=Depends(current_user)):
    throttle("conversation:" + user.id, 20)
    if data.userId == user.id:
        raise HTTPException(422, "Choose another learner or instructor.")
    other = db.get(m.User, data.userId)
    if not other:
        raise HTTPException(404, "Learner not found.")
    key = ":".join(sorted([user.id, other.id]))
    c = db.scalar(select(m.Conversation).where(m.Conversation.pair_key == key))
    if not c:
        c = m.Conversation(pair_key=key)
        if safe_insert(db, c):
            db.add_all(
                [
                    m.Member(conversation_id=c.id, user_id=user.id),
                    m.Member(conversation_id=c.id, user_id=other.id),
                ]
            )
            db.commit()
        else:
            c = db.scalar(select(m.Conversation).where(m.Conversation.pair_key == key))
    return conversation_out(db, c, user.id)


@router.get("/conversations/{cid}/messages")
def messages(
    cid: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db=Depends(get_db),
    user=Depends(current_user),
):
    conversation_member(db, cid, user)
    return [
        message_out(mes)
        for mes in db.scalars(
            select(m.Message)
            .where(m.Message.conversation_id == cid)
            .order_by(m.Message.created_at)
            .offset(offset)
            .limit(limit)
        )
    ]


@router.post("/conversations/{cid}/messages", status_code=201)
def send_message(
    cid: str, data: s.TextIn, db=Depends(get_db), user=Depends(current_user)
):
    throttle("message:" + user.id, 60, 60)
    conversation_member(db, cid, user)
    msg = m.Message(conversation_id=cid, sender_id=user.id, text=data.text)
    db.add(msg)
    db.commit()
    return message_out(msg)


@router.post("/conversations/{cid}/read", status_code=204)
def read_messages(cid: str, db=Depends(get_db), user=Depends(current_user)):
    conversation_member(db, cid, user)
    for msg in db.scalars(
        select(m.Message).where(
            m.Message.conversation_id == cid,
            m.Message.sender_id != user.id,
            m.Message.read.is_(False),
        )
    ):
        msg.read = True
    db.commit()


@router.get("/achievements")
def achievements(db=Depends(get_db), user=Depends(current_user)):
    return [achievement_out(db, a) for a in rows(db, m.Achievement, user_id=user.id)]


@router.get("/certificates")
def certificates(db=Depends(get_db), user=Depends(current_user)):
    return [certificate_out(c) for c in rows(db, m.Certificate, user_id=user.id)]


@router.get("/notifications")
def notifications(db=Depends(get_db), user=Depends(current_user)):
    return [
        {"id": n.id, "title": n.title, "read": n.read, "createdAt": n.created_at}
        for n in rows(db, m.Notification, user_id=user.id)
    ]


@router.post("/notifications/{nid}/read", status_code=204)
def read_notification(nid: str, db=Depends(get_db), user=Depends(current_user)):
    n = db.get(m.Notification, nid)
    if not n or n.user_id != user.id:
        raise HTTPException(404, "Notification not found.")
    n.read = True
    db.commit()


@router.get("/workspace")
def workspace(db=Depends(get_db), user=Depends(optional_user)):
    result = {
        k: []
        for k in [
            "enrollments",
            "progress",
            "attempts",
            "reminders",
            "conversations",
            "achievements",
            "certificates",
            "orders",
            "history",
        ]
    }
    result["user"] = user_out(db, user) if user else None
    if user:
        result.update(
            enrollments=enrollments(db, user),
            progress=progress(db, user),
            attempts=attempts(db, user),
            reminders=reminders(db, user),
            conversations=conversations(db, user),
            achievements=achievements(db, user),
            certificates=certificates(db, user),
            orders=[order_out(db, o) for o in rows(db, m.Order, user_id=user.id)],
            history=db.get(m.Profile, user.id).search_history,
        )
    return result
