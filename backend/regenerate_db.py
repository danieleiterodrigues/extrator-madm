import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from app.database import engine, SessionLocal
from app import models
from sqlalchemy import inspect, text

def init_and_verify():
    print("Initializing Database...")
    # This should create the tables if they don't exist
    models.Base.metadata.create_all(bind=engine)
    print("Tables created (if not existed).")

    print("Verifying 'people_records' columns...")
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('people_records')]
    
    required_col = 'tipo_de_cat'
    if required_col in columns:
        print(f"SUCCESS: Column '{required_col}' found.")
    else:
        print(f"FAILURE: Column '{required_col}' NOT found.")
        sys.exit(1)

    # Ensure Admin Exists (mimic startup)
    db = SessionLocal()
    try:
        from sqlalchemy import func
        admin = db.query(models.User).filter(func.lower(models.User.username) == "admin").first()
        if not admin:
            print("Creating default admin...")
            master_user = models.User(username="ADMIN", password="adm123", name="Admin User", role="SUPERADMIN")
            db.add(master_user)
            db.commit()
            print("Admin created.")
    finally:
        db.close()

if __name__ == "__main__":
    init_and_verify()
