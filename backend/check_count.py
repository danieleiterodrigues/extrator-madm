from app.database import SessionLocal
from app import models

db = SessionLocal()
count = db.query(models.PeopleRecord).count()
print(f"Total Records in DB: {count}")

null_dates = db.query(models.PeopleRecord).filter(models.PeopleRecord.created_at == None).count()
print(f"Records with NULL created_at: {null_dates}")

imports = db.query(models.Import).all()
for imp in imports:
    print(f"Import {imp.id}: {imp.filename} - Status: {imp.status} - Records: {len(imp.records)}")
