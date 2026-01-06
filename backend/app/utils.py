import pandas as pd
from typing import List, Dict
import io
import re
from datetime import datetime
from sqlalchemy import inspect, text

def normalize_text(text: str) -> str:
    """Removes leading/trailing whitespace and returns None if empty."""
    if not isinstance(text, str):
        return str(text) if pd.notna(text) else None
    
    cleaned = text.strip()
    return cleaned if cleaned else None

def normalize_date(value: str) -> str:
    """Attempts to parse various date formats and return DD-MM-YYYY."""
    if pd.isna(value) or value is None:
        return None
    
    value_str = str(value).strip()
    
    # Common formats to try
    formats = [
        "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", 
        "%Y/%m/%d", "%d.%m.%Y", "%Y.%m.%d"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(value_str.split()[0], fmt) # Split to handle potential time component
            return dt.strftime("%d-%m-%Y")
        except ValueError:
            continue
            
    return value_str # Return original if parse fails, validation will catch it later

def normalize_digits(value: str) -> str:
    """Removes non-digit characters."""
    if pd.isna(value) or value is None:
        return None
    return re.sub(r'\D', '', str(value))

def sync_db_schema(engine, model_base):
    """
    Checks if all columns defined in the SQLAlchemy models exist in the database tables.
    If not, adds them using ALTER TABLE.
    """
    print("--- STARTING SCHEMA SYNC ---")
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        for table_name, table in model_base.metadata.tables.items():
            if not inspector.has_table(table_name):
                print(f"Table {table_name} does not exist. Skipping (create_all should handle it).")
                continue
            
            # Get existing columns in DB
            existing_cols = {c['name'] for c in inspector.get_columns(table_name)}
            
            # Check model columns
            for column in table.columns:
                if column.name not in existing_cols:
                    print(f"Detected missing column: {table_name}.{column.name}")
                    
                    # Determine column type for SQL
                    # Simple type compilation
                    col_type = column.type.compile(engine.dialect)
                    
                    # Handle Nullable
                    nullable = "NULL" if column.nullable else "NOT NULL"
                    
                    # Construct ALTER Statement
                    # SQLite has limited ALTER TABLE support, but ADD COLUMN is supported
                    try:
                        alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type} {nullable}'
                        print(f"Executing: {alter_stmt}")
                        conn.execute(text(alter_stmt))
                    except Exception as e:
                        print(f"FAILED to add column {column.name}: {e}")
                        
        conn.commit()
    print("--- SCHEMA SYNC COMPLETE ---")

def parse_file(file_path: str) -> List[Dict]:
    """
    Parses a CSV or Excel file from DISK and returns a list of dictionaries with normalized keys.
    """
    try:
        lower_path = file_path.lower()
        if lower_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif lower_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or XLSX.")
    except Exception as e:
        raise ValueError(f"Error reading file: {str(e)}")
    
    # Normalize column names: lowercase, strip, remove special chars, replace dots (from duplicates) with underscores
    df.columns = [str(col).lower().strip().replace(' ', '_').replace('/', '_').replace('.', '_') for col in df.columns]
    
    records = []
    
    # Iterate over rows
    # Convert to strict types to avoid numpy types issues with JSON/DB later if needed
    
    # Handling NaN - Replace with None for SQL compatibility
    df = df.where(pd.notnull(df), None)
    
    from datetime import datetime, date, time
    
    for _, row in df.iterrows():
        record = row.to_dict()
        
        # Sanitize types for SQLite compatibility and User Formatting Preferences
        for k, v in record.items():
            if v is None:
                continue
            
            # Handle Pandas Timestamp/Date objects -> DD/MM/YYYY string
            if isinstance(v, (pd.Timestamp, datetime, date)):
                if pd.isna(v):
                    record[k] = None
                    continue
                    
                # If it's a timestamp/datetime, formatted with strftime
                if isinstance(v, (pd.Timestamp, datetime)):
                     record[k] = v.strftime("%d/%m/%Y")
                else:
                     record[k] = v.strftime("%d/%m/%Y")
            
            # Handle Time objects -> HH:MM string
            elif isinstance(v, time):
                record[k] = v.strftime("%H:%M")

            # Handle Floats that are actually Integers (remove .0)
            elif isinstance(v, float):
                if v.is_integer():
                    record[k] = str(int(v))
                else:
                    record[k] = str(v)
            
            # Fallback for other objects
            elif not isinstance(v, (str, int, float, bool)):
                 record[k] = str(v)
                 
            # Ensure strings don't have trailing .0 if they look like numbers (aggressive cleanup)
            if isinstance(record[k], str) and record[k].endswith(".0") and record[k][:-2].isdigit():
                 record[k] = record[k][:-2]
                
        records.append(record)
        
    return records
