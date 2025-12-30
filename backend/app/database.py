from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

import os
from dotenv import load_dotenv

load_dotenv()


# Ensure we use the absolute path to the DB in the same folder as this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "extrator.db"))

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL Configuration
    print(f"DEBUG: Using PostgreSQL Database")
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

else:
    # SQLite Configuration (Fallback)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    print(f"DEBUG: Using SQLite Database: {DB_PATH}")

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False, "timeout": 60}
    )

    # Enable Foreign Keys and WAL for robust persistence
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            # cursor.execute("PRAGMA journal_mode=WAL") 
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()
        except Exception as e:
            print(f"CRITICAL DB ERROR during connection: {e}")

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
