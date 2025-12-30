import pandas as pd
from typing import List, Dict
import io
import re
from datetime import datetime

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

def parse_file(contents: bytes, filename: str) -> List[Dict]:
    """
    Parses a CSV or Excel file and returns a list of dictionaries with normalized keys.
    """
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise ValueError("Unsupported file format. Please upload CSV or XLSX.")
    except Exception as e:
        raise ValueError(f"Error reading file: {str(e)}")
    
    # Normalize column names: lowercase, strip, remove special chars
    df.columns = [str(col).lower().strip().replace(' ', '_').replace('/', '_') for col in df.columns]
    
    records = []
    
    # Iterate over rows
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                record[col] = None
            else:
                record[col] = val
        records.append(record)
        
    return records
