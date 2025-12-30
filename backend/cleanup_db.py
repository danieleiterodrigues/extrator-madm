from app.database import SessionLocal, engine
from app import models
from sqlalchemy import text

# Create session
db = SessionLocal()

try:
    print("--- Database Integrity Check ---")
    
    # Count total records
    total_records = db.query(models.PeopleRecord).count()
    total_analyses = db.query(models.Analysis).count()
    
    print(f"Total People Records: {total_records}")
    print(f"Total Analysis Records: {total_analyses}")
    
    # Find Orphans (Analyses without parent Record)
    # Using SQL for direct verification
    orphans = db.execute(text("SELECT count(*) FROM analyses WHERE record_id NOT IN (SELECT id FROM people_records)")).scalar()
    
    print(f"Orphaned Analyses found: {orphans}")
    
    if orphans > 0:
        print("Cleaning up orphans...")
        db.execute(text("DELETE FROM analyses WHERE record_id NOT IN (SELECT id FROM people_records)"))
        db.commit()
        print("Cleanup complete.")
    else:
        print("Database is consistent.")
        
finally:
    db.close()
