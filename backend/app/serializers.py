from sqlalchemy import select
from . import models as m


def rows(db, model, **where):
    return list(db.scalars(select(model).filter_by(**where)))


def user_out(db, u):
    p = db.get(m.Profile, u.id)
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "bio": p.bio,
        "avatar": p.avatar,
        "publicProfile": p.public_profile,
        "notifications": p.notifications,
        "onboarding": p.onboarding,
    }


def instructor_out(i):
    return {
        "id": i.id,
        "userId": i.user_id,
        "name": i.name,
        "title": i.title,
        "bio": i.bio,
        "color": i.color,
        "initials": i.initials,
    }


def lesson_out(l, unlocked=True):
    return {
        "id": l.id,
        "title": l.title,
        "section": l.section,
        "minutes": l.minutes,
        "content": l.content if unlocked else "",
        "exercise": l.exercise if unlocked else "",
        "videoUrl": l.video_url if unlocked else "",
    }


def quiz_out(db, q, answers=False):
    questions = []
    for x in db.scalars(
        select(m.Question)
        .where(m.Question.quiz_id == q.id)
        .order_by(m.Question.position)
    ):
        item = {
            "id": x.id,
            "text": x.text,
            "options": [
                o.text
                for o in db.scalars(
                    select(m.AnswerOption)
                    .where(m.AnswerOption.question_id == x.id)
                    .order_by(m.AnswerOption.position)
                )
            ],
        }
        if answers:
            item.update(correct=x.correct, explanation=x.explanation)
        questions.append(item)
    return {
        "id": q.id,
        "title": q.title,
        "passScore": q.pass_score,
        "questions": questions,
    }


def course_out(db, c, unlocked=True, answers=False):
    lessons = list(
        db.scalars(
            select(m.Lesson)
            .where(m.Lesson.course_id == c.id)
            .order_by(m.Lesson.position)
        )
    )
    q = db.get(m.Quiz, c.id)
    return {
        **c.info,
        "id": c.id,
        "title": c.title,
        "category": c.category,
        "instructorId": c.instructor_id,
        "price": c.price_cents / 100,
        "level": c.level,
        "published": c.published,
        "duration": sum(l.minutes for l in lessons),
        "lessons": [lesson_out(l, unlocked) for l in lessons],
        "quiz": (
            quiz_out(db, q, answers)
            if q
            else {"id": c.id, "title": "Assessment", "passScore": 75, "questions": []}
        ),
    }


def enrollment_out(e):
    return {"courseId": e.course_id, "createdAt": e.created_at}


def progress_out(db, p):
    return {
        "lessonId": p.lesson_id,
        "courseId": db.get(m.Lesson, p.lesson_id).course_id,
        "completed": p.completed,
        "position": p.position,
        "updatedAt": p.updated_at,
    }


def attempt_out(a):
    return {
        "id": a.id,
        "quizId": a.quiz_id,
        "score": a.score,
        "passed": a.passed,
        "answers": a.answers,
        "feedback": a.feedback,
        "createdAt": a.created_at,
    }


def reminder_out(r):
    return {
        "id": r.id,
        "title": r.title,
        "dueAt": r.due_at,
        "description": r.description,
        "completed": r.completed,
    }


def message_out(m):
    return {
        "id": m.id,
        "senderId": m.sender_id,
        "text": m.text,
        "createdAt": m.created_at,
        "read": m.read,
    }


def conversation_out(db, c, user_id):
    members = [x.user_id for x in rows(db, m.Member, conversation_id=c.id)]
    names = [db.get(m.User, i).name for i in members if i != user_id]
    msgs = list(
        db.scalars(
            select(m.Message)
            .where(m.Message.conversation_id == c.id)
            .order_by(m.Message.created_at.desc())
            .limit(200)
        )
    )
    return {
        "id": c.id,
        "name": ", ".join(names) or "Conversation",
        "subtitle": "Private learning conversation",
        "members": members,
        "messages": [message_out(x) for x in reversed(msgs)],
    }


def badge_out(b):
    return {
        "id": b.id,
        "title": b.title,
        "description": b.description,
        "kind": b.kind,
        "threshold": b.threshold,
    }


def achievement_out(db, a):
    return {**badge_out(db.get(m.Badge, a.badge_id)), "awardedAt": a.awarded_at}


def certificate_out(c):
    return {
        "id": c.id,
        "courseId": c.course_id,
        "courseTitle": c.course_title,
        "name": c.name,
        "issuedAt": c.issued_at,
    }


def order_out(db, o):
    return {
        "id": o.id,
        "courseId": o.course_id,
        "title": db.get(m.Course, o.course_id).title,
        "amount": o.amount / 100,
        "currency": o.currency.upper(),
        "status": o.status,
        "createdAt": o.created_at,
    }
