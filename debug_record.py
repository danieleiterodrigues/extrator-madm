import sys
import os
from sqlalchemy import create_engine, text

# Setup paths
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Database connection
# Assuming default SQLite for now as I recall seeing it in logs, but checking env is safer.
# For quick debug script, I'll try the default sqlite path used in main.py
DB_PATH = os.path.join(os.getcwd(), 'backend', 'app', 'extrator.db')
db_url = f"sqlite:///{DB_PATH}"

print(f"Connecting to {db_url}")
engine = create_engine(db_url)

with engine.connect() as conn:
    # Fetch record
    query = text("SELECT * FROM people_records WHERE id = 41188")
    result = conn.execute(query).mappings().fetchone()
    
    if result:
        print("\n--- RECORD 41188 DATA ---")
        for k, v in result.items():
            print(f"{k}: {v}")
    else:
        print("Record 41188 not found.")
