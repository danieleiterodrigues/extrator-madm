from app.database import SessionLocal, engine
from app import models
from sqlalchemy import text

def fix_admin():
    db = SessionLocal()
    try:
        print("Checking Admin user...")
        # Use raw SQL or ORM to find admin
        # Using simple SQL to be sure
        
        # Check if user exists
        admin = db.query(models.User).filter(models.User.username == "ADMIN").first()
        if not admin:
            admin = db.query(models.User).filter(models.User.username == "admin").first()
            
        if admin:
            print(f"Found admin: {admin.username}, Role: {admin.role}")
            
            # Force update
            admin.role = 'SUPERADMIN'
            admin.name = 'Admin User'
            admin.password = 'adm123'
            admin.username = 'ADMIN' # Standardize casing
            
            db.add(admin)
            db.commit()
            print("SUCCESS: Admin user repaired.")
            print(f"New State -> Username: {admin.username}, Password: {admin.password}, Role: {admin.role}")
        else:
            print("Admin user not found, creating...")
            master_user = models.User(
                username="ADMIN",
                password="adm123",
                name="Admin User",
                role="SUPERADMIN"
            )
            db.add(master_user)
            db.commit()
            print("SUCCESS: Admin user created.")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_admin()
