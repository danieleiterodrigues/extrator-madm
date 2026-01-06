
import sqlite3

def check_columns():
    try:
        conn = sqlite3.connect(r'C:\ProjetosDaniel\extrator-madm\backend\extrator.db')
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(people_records)")
        columns = cursor.fetchall()
        print("Columns in people_records:")
        for col in columns:
            print(f"- {col[1]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
