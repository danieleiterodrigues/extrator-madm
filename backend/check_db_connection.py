import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

def check_connection():
    db_url = os.getenv("DATABASE_URL")
    print(f"Checking connection for: {db_url}")
    
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        return

    try:
        # Parse the URL manually to show what we are trying to connect to
        # postgresql://user:password@host:port/dbname
        if "postgresql://" in db_url:
            prefix_removed = db_url.replace("postgresql://", "")
            creds, rest = prefix_removed.split("@")
            user, password = creds.split(":")
            host_port, dbname = rest.split("/")
            if ":" in host_port:
                host, port = host_port.split(":")
            else:
                host, port = host_port, "5432"
            
            print(f"  -> Host: {host}")
            print(f"  -> Port: {port}")
            print(f"  -> User: {user}")
            print(f"  -> DB: {dbname}")
            
        print("\nAttempting to connect...")
        conn = psycopg2.connect(db_url)
        print("SUCCESS! Connection established.")
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"\nCONNECTION FAILED: {e}")
        print("\nTroubleshooting Tips:")
        if "Connection refused" in str(e):
            print("- Verify if PostgreSQL service is running.")
            print("- Verify if the Host and Port are correct.")
        elif "password authentication failed" in str(e):
            print("- Verify if the password and username are correct in .env.")
        elif "does not exist" in str(e):
            print(f"- The database might not exist. Try creating it with: createdb {dbname}")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    check_connection()
