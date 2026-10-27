from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from . import models as m, schemas as s
from .db import get_db
from .security import staff, admin, audit
from .serializers import *
from .domain import save_course, can_manage

router = APIRouter(prefix="/admin", tags=["Administration & instructor studio"])


def managed_courses(db, user):
    query = select(m.Course).order_by(m.Course.title)
    if user.role != "admin":
        query = query.join(
            m.Instructor, m.Course.instructor_id == m.Instructor.id
        ).where(m.Instructor.user_id == user.id)
    return list(db.scalars(query))


@router.get("/courses")
def courses(db=Depends(get_db), user=Depends(staff)):
    return [course_out(db, c, True, True) for c in managed_courses(db, user)]


@router.put("/courses/{cid}")
def update_course(cid: str, data: s.CourseIn, db=Depends(get_db), user=Depends(staff)):
    if cid != data.id:
        raise HTTPException(422, "Course ID must match the URL.")
    old = db.get(m.Course, cid)
    if old:
        can_manage(db, user, old)
    i = db.get(m.Instructor, data.instructorId)
    if not i:
        raise HTTPException(422, "Instructor does not exist.")
    if user.role != "admin" and i.user_id != user.id:
        raise HTTPException(403, "You cannot assign a course to another instructor.")
    c = save_course(db, data)
    audit(db, user, "Saved course: " + c.id)
    db.commit()
    return course_out(db, c, True, True)


@router.get("/analytics")
def analytics(db=Depends(get_db), user=Depends(staff)):
    courses = managed_courses(db, user)
    ids = [c.id for c in courses]
    ens = list(db.scalars(select(m.Enrollment).where(m.Enrollment.course_id.in_(ids))))
    certs = list(
        db.scalars(select(m.Certificate).where(m.Certificate.course_id.in_(ids)))
    )
    orders = list(
        db.scalars(
            select(m.Order)
            .where(m.Order.course_id.in_(ids))
            .order_by(m.Order.created_at.desc())
            .limit(500)
        )
    )
    users = rows(db, m.User) if user.role == "admin" else []
    audits = list(
        db.scalars(
            select(m.Audit)
            .where(True if user.role == "admin" else m.Audit.actor_id == user.id)
            .order_by(m.Audit.created_at.desc())
            .limit(30)
        )
    )
    return {
        "users": len(users) if user.role == "admin" else len({e.user_id for e in ens}),
        "enrollments": len(ens),
        "completion": len(certs),
        "revenue": sum(o.amount for o in orders if o.status == "paid") / 100,
        "courses": [
            {
                "id": c.id,
                "title": c.title,
                "students": sum(e.course_id == c.id for e in ens),
                "completed": sum(x.course_id == c.id for x in certs),
            }
            for c in courses
        ],
        "orders": [order_out(db, o) for o in orders],
        "usersList": [user_out(db, u) for u in users],
        "audits": [
            {"id": a.id, "action": a.action, "createdAt": a.created_at} for a in audits
        ],
    }


@router.patch("/users/{uid}")
def role(uid: str, data: s.RoleIn, db=Depends(get_db), user=Depends(admin)):
    if uid == user.id:
        raise HTTPException(409, "You cannot change your own role.")
    other = db.get(m.User, uid)
    if not other:
        raise HTTPException(404, "User not found.")
    other.role = data.role
    if data.role == "instructor" and not db.scalar(
        select(m.Instructor).where(m.Instructor.user_id == uid)
    ):
        db.add(
            m.Instructor(
                id=uid,
                user_id=uid,
                name=other.name,
                title="Instructor",
                bio="",
                initials=other.name[:2].upper(),
            )
        )
    audit(db, user, f"Changed role for {uid} to {data.role}")
    db.commit()
    return user_out(db, other)


@router.post("/categories")
def category(data: s.CategoryIn, db=Depends(get_db), user=Depends(admin)):
    name = data.name.strip()
    if len(name) < 2:
        raise HTTPException(422, "Category name is too short.")
    if not db.get(m.Category, name):
        db.add(m.Category(name=name))
        audit(db, user, "Added category: " + name)
        db.commit()
    return list(db.scalars(select(m.Category.name).order_by(m.Category.name)))


@router.put("/instructors/{iid}")
def instructor(iid: str, data: s.InstructorIn, db=Depends(get_db), user=Depends(admin)):
    if iid != data.id:
        raise HTTPException(422, "Instructor ID must match.")
    owner = db.get(m.User, data.userId)
    if not owner or owner.role not in ("instructor", "admin"):
        raise HTTPException(422, "An instructor role is required.")
    other = db.scalar(
        select(m.Instructor).where(
            m.Instructor.user_id == owner.id, m.Instructor.id != iid
        )
    )
    if other:
        raise HTTPException(409, "This user already has an instructor profile.")
    i = db.get(m.Instructor, iid)
    if not i:
        i = m.Instructor(id=iid)
        db.add(i)
    if i.user_id and i.user_id != owner.id:
        raise HTTPException(409, "Changing profile ownership is not supported.")
    for k, v in data.model_dump().items():
        setattr(i, {"userId": "user_id"}.get(k, k), v)
    audit(db, user, "Updated instructor: " + iid)
    db.commit()
    return instructor_out(i)


@router.get("/badges")
def badges(db=Depends(get_db), user=Depends(staff)):
    return [badge_out(b) for b in rows(db, m.Badge)]


@router.put("/badges/{bid}")
def badge(bid: str, data: s.BadgeIn, db=Depends(get_db), user=Depends(admin)):
    if bid != data.id:
        raise HTTPException(422, "Badge ID must match.")
    b = db.get(m.Badge, bid)
    if not b:
        b = m.Badge(id=bid)
        db.add(b)
    for k, v in data.model_dump().items():
        setattr(b, k, v)
    audit(db, user, "Updated badge rule: " + bid)
    db.commit()
    return badge_out(b)


@router.get("/conversations")
def moderation(
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(admin),
):
    return [
        conversation_out(db, c, user.id)
        for c in db.scalars(
            select(m.Conversation)
            .order_by(m.Conversation.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ]


@router.delete("/conversations/{cid}/messages/{mid}", status_code=204)
def remove_message(cid: str, mid: str, db=Depends(get_db), user=Depends(admin)):
    mes = db.get(m.Message, mid)
    if not mes or mes.conversation_id != cid:
        raise HTTPException(404, "Message not found.")
    db.delete(mes)
    audit(db, user, "Removed message " + mid + " from " + cid)
    db.commit()
