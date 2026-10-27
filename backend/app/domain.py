from decimal import Decimal, ROUND_HALF_UP
from fastapi import HTTPException
from sqlalchemy import select, delete, func
from sqlalchemy.exc import IntegrityError
from . import models as m
from .serializers import quiz_out, rows


def get_course(db, cid, user=None):
    c = db.get(m.Course, cid)
    if not c:
        raise HTTPException(404, "Course not found.")
    if not c.published:
        owner = db.get(m.Instructor, c.instructor_id)
        if not user or (
            user.role != "admin"
            and owner.user_id != user.id
            and not enrolled(db, user.id, cid)
        ):
            raise HTTPException(404, "Course not found.")
    return c


def enrolled(db, uid, cid):
    return db.scalar(
        select(m.Enrollment).where(
            m.Enrollment.user_id == uid, m.Enrollment.course_id == cid
        )
    )


def require_enrollment(db, user, cid):
    if not enrolled(db, user.id, cid):
        raise HTTPException(403, "Enroll in the course first.")


def can_manage(db, user, c):
    if user.role == "admin":
        return
    if (
        user.role != "instructor"
        or db.get(m.Instructor, c.instructor_id).user_id != user.id
    ):
        raise HTTPException(403, "You can manage only your own courses.")


def safe_insert(db, obj):
    try:
        with db.begin_nested():
            db.add(obj)
            db.flush()
        return True
    except IntegrityError:
        return False


def enroll_once(db, uid, cid):
    existing = enrolled(db, uid, cid)
    if existing:
        return existing
    value = m.Enrollment(user_id=uid, course_id=cid)
    if safe_insert(db, value):
        return value
    return enrolled(db, uid, cid)


def award(db, user):
    db.flush()
    completed = set(
        db.scalars(
            select(m.Progress.lesson_id).where(
                m.Progress.user_id == user.id, m.Progress.completed.is_(True)
            )
        )
    )
    valid_passes = set()
    for attempt in rows(db, m.Attempt, user_id=user.id, passed=True):
        quiz = db.get(m.Quiz, attempt.quiz_id)
        if quiz and quiz.revision == attempt.revision:
            valid_passes.add(quiz.course_id)
    for e in rows(db, m.Enrollment, user_id=user.id):
        lesson_ids = set(
            db.scalars(select(m.Lesson.id).where(m.Lesson.course_id == e.course_id))
        )
        if lesson_ids and lesson_ids <= completed and e.course_id in valid_passes:
            c = db.get(m.Course, e.course_id)
            if not db.scalar(
                select(m.Certificate).where(
                    m.Certificate.user_id == user.id, m.Certificate.course_id == c.id
                )
            ):
                safe_insert(
                    db,
                    m.Certificate(
                        user_id=user.id,
                        course_id=c.id,
                        name=user.name,
                        course_title=c.title,
                    ),
                )
    certificates = db.scalar(
        select(func.count())
        .select_from(m.Certificate)
        .where(m.Certificate.user_id == user.id)
    )
    scores = [a.score for a in rows(db, m.Attempt, user_id=user.id)]
    for b in rows(db, m.Badge):
        value = (
            len(completed)
            if b.kind == "lesson"
            else max(scores, default=0) if b.kind == "quiz" else certificates
        )
        if value >= b.threshold and not db.get(m.Achievement, (user.id, b.id)):
            safe_insert(db, m.Achievement(user_id=user.id, badge_id=b.id))


def save_course(db, data, seed=False):
    c = db.get(m.Course, data.id)
    for l in data.lessons:
        other = db.get(m.Lesson, l.id)
        if other and other.course_id != data.id:
            raise HTTPException(409, "A lesson ID belongs to another course.")
    for q in data.quiz.questions:
        other = db.get(m.Question, q.id)
        if other and other.quiz_id != data.id:
            raise HTTPException(409, "A question ID belongs to another course.")
    if not db.get(m.Category, data.category):
        raise HTTPException(422, "Choose an existing category.")
    if not db.get(m.Instructor, data.instructorId):
        raise HTTPException(422, "Choose an existing instructor.")
    old_info = c.info if c else {}
    if not c:
        c = m.Course(id=data.id)
        db.add(c)
    c.title = data.title
    c.category = data.category
    c.instructor_id = data.instructorId
    c.price_cents = int(
        (Decimal(str(data.price)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )
    c.level = data.level
    c.published = data.published
    c.updated_at = m.now()
    c.info = {
        k: getattr(data, k)
        for k in ["color", "art", "description", "language", "outcomes", "requirements"]
    }
    c.info.update(
        rating=data.rating if seed else old_info.get("rating", 0),
        students=data.students if seed else old_info.get("students", 0),
    )
    db.flush()
    wanted = {l.id for l in data.lessons}
    db.execute(
        delete(m.Lesson).where(m.Lesson.course_id == c.id, m.Lesson.id.not_in(wanted))
    )
    for i, l in enumerate(data.lessons):
        item = db.get(m.Lesson, l.id)
        if not item:
            item = m.Lesson(id=l.id, course_id=c.id)
            db.add(item)
        item.position = i
        item.title = l.title
        item.section = l.section
        item.minutes = l.minutes
        item.content = l.content
        item.exercise = l.exercise
        item.video_url = l.videoUrl
    q = db.get(m.Quiz, c.id)
    old_quiz = quiz_out(db, q, True) if q else None
    if not q:
        q = m.Quiz(id=c.id, course_id=c.id, revision=1)
        db.add(q)
    elif old_quiz != data.quiz.model_dump():
        q.revision += 1
    q.title = data.quiz.title
    q.pass_score = data.quiz.passScore
    db.flush()
    db.execute(delete(m.Question).where(m.Question.quiz_id == c.id))
    db.flush()
    for i, x in enumerate(data.quiz.questions):
        db.add(
            m.Question(
                id=x.id,
                quiz_id=c.id,
                position=i,
                text=x.text,
                correct=x.correct,
                explanation=x.explanation,
            )
        )
    db.flush()
    for x in data.quiz.questions:
        for i, text in enumerate(x.options):
            db.add(m.AnswerOption(question_id=x.id, position=i, text=text))
    db.flush()
    return c


def conversation_member(db, cid, user):
    c = db.get(m.Conversation, cid)
    if not c or not db.get(m.Member, (cid, user.id)):
        raise HTTPException(404, "Conversation not found.")
    return c
