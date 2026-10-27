from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings


class Base(DeclarativeBase):
    pass


if settings.database_url.startswith("sqlite:///"):
    file = settings.database_url.removeprefix("sqlite:///")
    if file != ":memory:":
        Path(file).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(
    settings.database_url,
    connect_args=(
        {"check_same_thread": False, "timeout": 30}
        if settings.database_url.startswith("sqlite")
        else {}
    ),
    pool_pre_ping=True,
)
if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def pragmas(connection, _):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=DELETE")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
