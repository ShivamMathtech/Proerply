import json, time
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from app.main import app
from app import models as m
from app.config import settings
from app.seed import seed
from app.payments import fulfill_event
from app.security import digest, verify
from app.serializers import rows

P = "/api/v1"


def test_health_and_catalog(client):
    assert client.get(P + "/health").json()["status"] == "ok"
    catalog = client.get(P + "/courses").json()
    assert len(catalog) == 6
    assert all(
        q.get("correct") is None for c in catalog for q in c["quiz"]["questions"]
    )
    assert all(l["content"] == "" for c in catalog for l in c["lessons"])
    assert {
        c["id"] for c in client.get(P + "/courses?q=Leo%20Williams&price=free").json()
    } == {"python", "react"}
    assert len(client.get(P + "/courses?limit=2&offset=2").json()) == 2
    assert client.get(P + "/courses/not-found").status_code == 404


def test_registration_login_validation_and_csrf(client, db_session):
    assert client.get(P + "/users/me").status_code == 401
    assert (
        client.post(
            P + "/auth/register",
            json={"name": "A", "email": "bad", "password": "short"},
        ).status_code
        == 422
    )
    payload = {
        "name": "New Learner",
        "email": "new@example.com",
        "password": "GoodPassword123!",
    }
    result = client.post(P + "/auth/register", json=payload)
    assert result.status_code == 201, result.text
    uid = result.json()["user"]["id"]
    assert "HttpOnly" in result.headers["set-cookie"]
    assert client.patch(P + "/users/me", json={"bio": "test"}).status_code == 403
    client.headers["X-CSRF-Token"] = result.json()["csrfToken"]
    assert client.patch(P + "/users/me", json={"bio": "Hello"}).json()["bio"] == "Hello"
    assert client.patch(P + "/users/me", json={"role": "admin"}).status_code == 422
    assert client.post(P + "/auth/register", json=payload).status_code == 409
    assert (
        client.post(
            P + "/auth/login",
            json={"email": payload["email"], "password": "WrongPass123!"},
        ).status_code
        == 401
    )
    with db_session() as db:
        stored = db.get(m.User, uid)
        assert stored.password_hash.startswith("$argon2id$")
        assert verify(payload["password"], stored.password_hash)


def test_sessions_rotate_and_logout(client, login):
    login()
    first = client.cookies.get("proerply_session")
    r = client.post(P + "/auth/refresh")
    assert r.status_code == 200
    second = client.cookies.get("proerply_session")
    assert second != first
    client.headers["X-CSRF-Token"] = r.json()["csrfToken"]
    assert client.post(P + "/auth/logout").status_code == 204
    assert client.get(P + "/users/me").status_code == 401
    client.cookies.set("proerply_session", first)
    assert client.get(P + "/users/me").status_code == 401


def test_rbac_and_instructor_isolation(client, login):
    login()
    assert client.get(P + "/admin/analytics").status_code == 403
    login("instructor@proerply.demo")
    cs = client.get(P + "/admin/courses").json()
    assert {c["id"] for c in cs} == {"design", "brand"}
    assert (
        client.patch(P + "/admin/users/learner", json={"role": "admin"}).status_code
        == 403
    )
    stolen = cs[0]
    stolen["id"] = "react"
    stolen["quiz"]["id"] = "react"
    assert client.put(P + "/admin/courses/react", json=stolen).status_code == 403
    assert client.get(P + "/admin/analytics").json()["usersList"] == []


def test_enrollment_and_certificate_rules(client, login, db_session):
    login()
    assert (
        client.post(P + "/enrollments", json={"courseId": "design"}).status_code == 402
    )
    for _ in range(2):
        assert (
            client.post(P + "/enrollments", json={"courseId": "python"}).status_code
            == 200
        )
    assert (
        client.put(P + "/progress/design-1", json={"completed": True}).status_code
        == 403
    )
    assert (
        client.post(
            P + "/quizzes/react/submit", json={"answers": {}, "score": 100}
        ).status_code
        == 422
    )
    questions = client.get(P + "/quizzes/react").json()["questions"]
    answers = {q["id"]: i for q, i in zip(questions, [0, 1, 2, 3])}
    result = client.post(P + "/quizzes/react/submit", json={"answers": answers})
    assert result.status_code == 200, result.text
    assert result.json()["score"] == 100
    assert client.get(P + "/certificates").json() == []
    for i in range(1, 5):
        assert (
            client.put(
                P + f"/progress/react-{i}", json={"completed": True, "position": 25}
            ).status_code
            == 200
        )
    assert len(client.get(P + "/certificates").json()) == 1
    assert len(client.get(P + "/achievements").json()) == 3
    assert (
        client.put(P + "/progress/react-1", json={"completed": True}).status_code == 200
    )
    assert len(client.get(P + "/certificates").json()) == 1
    with db_session() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(m.Enrollment)
                .where(
                    m.Enrollment.user_id == "learner",
                    m.Enrollment.course_id == "python",
                )
            )
            == 1
        )


def test_wrong_quiz_and_invalid_options(client, login):
    login()
    assert (
        client.post(
            P + "/quizzes/react/submit", json={"answers": {"react-q1": 99}}
        ).status_code
        == 422
    )
    wrong = {f"react-q{i}": (i % 4) for i in range(1, 5)}
    result = client.post(P + "/quizzes/react/submit", json={"answers": wrong}).json()
    assert (
        result["score"] == 0 and not result["passed"] and len(result["feedback"]) == 4
    )


def test_reminder_ownership_and_crud(client, login):
    login()
    data = {
        "title": "Practice today",
        "dueAt": "2030-01-01T10:00:00+05:30",
        "description": "A little focus",
        "completed": False,
    }
    r = client.post(P + "/reminders", json=data)
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["dueAt"].startswith("2030-01-01T04:30")
    login("admin@proerply.demo")
    assert client.patch(P + "/reminders/" + rid, json=data).status_code == 404
    assert client.delete(P + "/reminders/" + rid).status_code == 404
    login()
    data["completed"] = True
    assert client.patch(P + "/reminders/" + rid, json=data).json()["completed"]
    assert client.delete(P + "/reminders/" + rid).status_code == 204
    assert client.post(P + "/reminders", json={**data, "title": ""}).status_code == 422
    assert (
        client.post(
            P + "/reminders", json={**data, "dueAt": "2030-01-01T10:00:00"}
        ).status_code
        == 422
    )


def test_chat_ownership_and_real_message_delivery(client, login):
    login()
    r = client.post(
        P + "/conversations/mentor/messages", json={"text": "A real local message"}
    )
    assert r.status_code == 201
    assert len(client.get(P + "/conversations/mentor/messages").json()) == 2
    login("admin@proerply.demo")
    assert client.get(P + "/conversations/mentor/messages").status_code == 404
    assert (
        client.post(
            P + "/conversations/mentor/messages", json={"text": "Unauthorized"}
        ).status_code
        == 404
    )
    login("instructor@proerply.demo")
    assert (
        client.get(P + "/conversations/mentor/messages").json()[-1]["text"]
        == "A real local message"
    )
    assert client.post(P + "/conversations/mentor/read").status_code == 204
    assert client.get(P + "/conversations/mentor/messages").json()[-1]["read"]


def test_public_profile_privacy_and_avatar_validation(client, login):
    login()
    assert (
        client.patch(
            P + "/users/me", json={"publicProfile": False, "bio": "Private bio"}
        ).status_code
        == 200
    )
    login("admin@proerply.demo")
    r = client.get(P + "/users/learner").json()
    assert (
        "email" not in r["user"] and r["user"]["bio"] == "" and r["certificates"] == []
    )
    assert (
        client.patch(
            P + "/users/me", json={"avatar": "data:image/svg+xml;base64,abcd"}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            P + "/users/me", json={"avatar": "data:image/png;base64,YWJj"}
        ).status_code
        == 422
    )


def test_admin_course_edit_and_question_id_protection(client, login):
    login("admin@proerply.demo")
    c = next(c for c in client.get(P + "/admin/courses").json() if c["id"] == "design")
    c["title"] = "Design for thoughtful people"
    c["lessons"][0]["content"] = "A changed, meaningful original reading lesson."
    r = client.put(P + "/admin/courses/design", json=c)
    assert r.status_code == 200, r.text
    assert client.get(P + "/courses/design").json()["title"] == c["title"]
    c["quiz"]["questions"][0]["id"] = "react-q1"
    assert client.put(P + "/admin/courses/design", json=c).status_code == 409
    assert (
        client.patch(P + "/admin/users/admin", json={"role": "learner"}).status_code
        == 409
    )
    assert (
        client.post(
            P + "/admin/categories", json={"name": "Creative coding"}
        ).status_code
        == 200
    )


def test_reset_single_use_and_session_revocation(
    client, login, db_session, tmp_path, monkeypatch
):
    login()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(settings, "smtp_host", "")
    result = client.post(
        P + "/auth/forgot-password", json={"email": "learner@proerply.demo"}
    )
    assert result.status_code == 200
    assert "no email was sent" in result.json()["message"]
    mail = json.loads(next(Path("data/dev-mailbox").glob("*.json")).read_text())
    assert (
        client.post(
            P + "/auth/verify-reset-code",
            json={
                "email": mail["email"],
                "code": "000000" if mail["code"] != "000000" else "111111",
            },
        ).status_code
        == 400
    )
    verified = client.post(
        P + "/auth/verify-reset-code",
        json={"email": mail["email"], "code": mail["code"]},
    )
    assert verified.status_code == 200
    assert (
        client.post(
            P + "/auth/verify-reset-code",
            json={"email": mail["email"], "code": mail["code"]},
        ).status_code
        == 400
    )
    token = verified.json()["token"]
    assert (
        client.post(
            P + "/auth/reset-password",
            json={"token": token, "password": "NewPassword123!"},
        ).status_code
        == 204
    )
    assert client.get(P + "/users/me").status_code == 401
    assert (
        client.post(
            P + "/auth/reset-password",
            json={"token": token, "password": "AnotherPassword123!"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            P + "/auth/login",
            json={"email": mail["email"], "password": "NewPassword123!"},
        ).status_code
        == 200
    )


def test_payment_forgery_and_disabled_provider(client, login, monkeypatch):
    login()
    monkeypatch.setattr(settings, "stripe_secret_key", "")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "")
    assert (
        client.post(
            P + "/payments/checkout",
            json={"courseId": "design", "amount": 0, "status": "paid"},
        ).status_code
        == 422
    )
    assert (
        client.post(P + "/payments/checkout", json={"courseId": "design"}).status_code
        == 503
    )
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")
    assert (
        client.post(
            P + "/payments/webhook", json={"type": "checkout.session.completed"}
        ).status_code
        == 400
    )
    assert not any(
        e["courseId"] == "design" for e in client.get(P + "/enrollments/me").json()
    )


def test_verified_payment_event_is_idempotent(db_session):
    with db_session() as db:
        o = m.Order(
            user_id="learner",
            course_id="design",
            amount=4900,
            currency="usd",
            provider_id="cs_test_1",
        )
        db.add(o)
        db.commit()
        event = {
            "id": "evt_1",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_1",
                    "payment_status": "paid",
                    "amount_total": 4900,
                    "currency": "usd",
                    "client_reference_id": o.id,
                    "metadata": {"order_id": o.id},
                }
            },
        }
        fulfill_event(db, event)
        fulfill_event(db, event)
        assert db.get(m.Order, o.id).status == "paid"
        assert (
            db.scalar(
                select(func.count())
                .select_from(m.Enrollment)
                .where(
                    m.Enrollment.user_id == "learner",
                    m.Enrollment.course_id == "design",
                )
            )
            == 1
        )


def test_seed_is_repeatable(db_session):
    with db_session() as db:
        before = {
            t: db.scalar(select(func.count()).select_from(t))
            for t in [m.User, m.Course, m.Lesson, m.Question, m.Message, m.Enrollment]
        }
        seed(db, demo=True, password="DemoPass123!")
        assert before == {
            t: db.scalar(select(func.count()).select_from(t)) for t in before
        }


def test_calls_authorize_participants(client, login):
    login()
    offer = {"offer": {"type": "offer", "sdp": "v=0\r\ns=sample"}}
    assert client.post(P + "/calls/mentor", json=offer).status_code == 200
    assert (
        client.post(
            P + "/calls/mentor", json={"answer": {"type": "answer", "sdp": "v=0"}}
        ).status_code
        == 403
    )
    login("admin@proerply.demo")
    assert client.get(P + "/calls/mentor").status_code == 404
    login("instructor@proerply.demo")
    assert (
        client.post(
            P + "/calls/mentor", json={"answer": {"type": "answer", "sdp": "v=0"}}
        ).status_code
        == 200
    )
    assert client.post(P + "/calls/mentor", json={"ended": True}).status_code == 200


def test_origin_throttling_and_body_limit(client, login):
    assert (
        client.post(
            P + "/auth/login",
            json={"email": "learner@proerply.demo", "password": "DemoPass123!"},
            headers={"origin": "https://untrusted.example"},
        ).status_code
        == 403
    )
    for _ in range(10):
        client.post(
            P + "/auth/login",
            json={"email": "missing@example.com", "password": "WrongPassword123!"},
        )
    assert (
        client.post(
            P + "/auth/login",
            json={"email": "missing@example.com", "password": "WrongPassword123!"},
        ).status_code
        == 429
    )
    assert (
        client.post(
            P + "/auth/login",
            content=b"x" * (1024 * 1024 + 1),
            headers={"content-type": "application/json"},
        ).status_code
        == 413
    )
