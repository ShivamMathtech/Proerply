import os
from pathlib import Path
import tempfile
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

os.environ["APP_ENV"] = "development"
os.environ["SEED_DEMO_USERS"] = "false"
from app.main import app
from app.db import Base, get_db
from app.seed import seed
from app.security import _buckets


@pytest.fixture()
def db_session(tmp_path, monkeypatch):
    engine = create_engine(
        "sqlite:///" + str(tmp_path / "test.db"),
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def fk(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    import app.main as application

    monkeypatch.setattr(application, "engine", engine)
    Factory = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    with Factory() as db:
        seed(db, demo=True, password="DemoPass123!")

    def override():
        with Factory() as db:
            yield db

    app.dependency_overrides[get_db] = override
    _buckets.clear()
    yield Factory
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def client(db_session):
    # Lifespan migration health is tested separately against the migrated default database.
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def login(client):
    def run(email="learner@proerply.demo", password="DemoPass123!"):
        r = client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )
        assert r.status_code == 200, r.text
        client.headers["X-CSRF-Token"] = r.json()["csrfToken"]
        return r.json()["user"]

    return run
