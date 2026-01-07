import pandas as pd
from typing import List, Dict
import io
import re
from datetime import datetime
from sqlalchemy import inspect, text
import numpy as np
from unidecode import unidecode

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
                        
                        print(f"DEBUG: OperationalError: {e}")
                        
        conn.commit()
        
    # --- PERFORMANCE INDEXES ---
    print("--- ENSURING PERFORMANCE INDEXES ---")
    with engine.connect() as conn:
        # SQLite / Postgres compatible 'IF NOT EXISTS'
        indexes = [
            # PeopleRecord
            "CREATE INDEX IF NOT EXISTS idx_people_records_valid ON people_records (valid)",
            "CREATE INDEX IF NOT EXISTS idx_people_records_import_id ON people_records (import_id)",
            # Analysis
            "CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses (status)",
            "CREATE INDEX IF NOT EXISTS idx_analyses_record_id ON analyses (record_id)",
        ]
        
        for idx_stmt in indexes:
            try:
                conn.execute(text(idx_stmt))
            except Exception as e:
                print(f"Index creation warning: {e}")
        conn.commit()
        
    print("--- SCHEMA SYNC COMPLETE ---")

KNOWN_KEYS = {
    "nome", "data_nascimento", "nascimento", "data_de_nascimento", 
    "documento", "cpf", "rg", "telefone", "celular", "contato", 
    "motivo", "motivo_acidente", "descricao", "agente_causador", 
    "descrição_da_situação_geradora_do_acidente_ou_doença"
}

def normalize_text_series(series: pd.Series) -> pd.Series:
    """Vectorized text normalization."""
    return series.astype(str).str.strip().replace({'nan': None, 'None': None, '': None})

def normalize_digits_series(series: pd.Series) -> pd.Series:
    """Vectorized digit normalization."""
    # Convert to string, replace non-digits, handle NaN
    return series.astype(str).str.replace(r'\D', '', regex=True).replace('', None)

def normalize_date_series(series: pd.Series) -> pd.Series:
    """Vectorized date normalization."""
    # Coerce to datetime, then format.
    # robust handling for multiple formats requires to_datetime with flexible parsing
    # We use dayfirst=True for BR format 
    dates = pd.to_datetime(series, dayfirst=True, errors='coerce')
    return dates.dt.strftime("%d-%m-%Y").where(dates.notnull(), None)

def process_import_file_vectorized(file_path: str, import_id: int) -> List[Dict]:
    """
    Optimized processing of import file using Pandas vectorization.
    Performs reading, cleaning, and validation in bulk.
    """
    try:
        lower_path = file_path.lower()
        if lower_path.endswith(".csv"):
            df = pd.read_csv(file_path, dtype=str) # Read all as string to avoid auto-casting issues
        elif lower_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path, dtype=str)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or XLSX.")
    except Exception as e:
        raise ValueError(f"Error reading file: {str(e)}")
    
    # Normalize column names: remove accents, special chars
    def clean_col(col):
        # 1. To string, lower, strip
        s = str(col).lower().strip()
        # 2. unidecode to Remove Accents (ç -> c, ã -> a)
        s = unidecode(s)
        # 3. Replace common separators
        s = s.replace(' ', '_').replace('/', '_').replace('.', '_').replace('-', '_')
        # 4. Remove specific noise chars like ? ()
        s = s.replace('?', '').replace('(', '').replace(')', '')
        # 5. Fallback: Keep only alphanumeric and _
        s = re.sub(r'[^a-z0-9_]', '', s)
        return s

    df.columns = [clean_col(c) for c in df.columns]
    
    # --- 1. Normalization ---
    # We identify columns based on loose matching logic similar to main.py
    
    # Nome
    if 'nome' in df.columns:
        df['nome_clean'] = normalize_text_series(df['nome'])
    else:
        df['nome_clean'] = None

    # Data Nascimento
    dt_cols = [c for c in ['data_nascimento', 'nascimento', 'data_de_nascimento'] if c in df.columns]
    if dt_cols:
        # Take the first one found, assuming priority
        df['data_nascimento_clean'] = normalize_date_series(df[dt_cols[0]])
    else:
        df['data_nascimento_clean'] = None

    # Documento
    doc_cols = [c for c in ['documento', 'cpf', 'rg'] if c in df.columns]
    if doc_cols:
        df['documento_clean'] = normalize_digits_series(df[doc_cols[0]])
    else:
        df['documento_clean'] = None

    # Telefone
    tel_cols = [c for c in ['telefone', 'celular', 'contato'] if c in df.columns]
    if tel_cols:
        df['telefone_clean'] = normalize_digits_series(df[tel_cols[0]])
    else:
        df['telefone_clean'] = None

    # Motivo
    mot_cols = [c for c in ['motivo', 'motivo_acidente', 'descricao', 
                            'descrição_da_situação_geradora_do_acidente_ou_doença', 
                            'agente_causador'] if c in df.columns]
    
    if mot_cols:
        # Coalesce: take first non-null
        # Pandas 'combine_first' or just iterate
        s_motivo = df[mot_cols[0]]
        for c in mot_cols[1:]:
            if c in df.columns:
                s_motivo = s_motivo.combine_first(df[c])
        df['motivo_clean'] = normalize_text_series(s_motivo)
    else:
        df['motivo_clean'] = None

    # --- 2. Dynamic 'Motivo' Logic (Extra Columns) ---
    # If motivo is empty, check for extra columns content
    # Get columns that are NOT in KNOWN_KEYS
    extra_cols = [c for c in df.columns if c not in KNOWN_KEYS and not c.endswith('_clean')]
    
    if extra_cols:
        # check if any extra column has content
        # we can sum boolean mask
        # replace NaN/None/Empty with False
        mask_extra = df[extra_cols].apply(lambda x: x.str.strip().astype(bool), axis=1, result_type='reduce').any(axis=1)
        
        # If motivo is null AND extra content exists, set motivo
        mask_motivo_missing = df['motivo_clean'].isna()
        df.loc[mask_motivo_missing & mask_extra, 'motivo_clean'] = "Conteúdo em Colunas Extras"

    # --- 3. Validation ---
    
    # Nome
    missing_nome = df['nome_clean'].isna()
    # Data
    missing_data = df['data_nascimento_clean'].isna()
    # Doc
    missing_doc = df['documento_clean'].isna()
    # Motivo
    missing_motivo = df['motivo_clean'].isna()
    
    df['valid'] = True
    df['error_message'] = ""
    
    # Helper to append error
    def append_error(mask, msg):
        df.loc[mask, 'valid'] = False
        df.loc[mask, 'error_message'] += msg + "; "

    append_error(missing_nome, "Nome obrigatório")
    append_error(missing_data, "Data de nascimento inválida ou ausente")
    append_error(missing_doc, "Documento obrigatório")
    append_error(missing_motivo, "Motivo obrigatório")
    
    # Clean up trailing semicolon
    df['error_message'] = df['error_message'].astype(str).str.strip('; ')
    df.loc[df['error_message'] == '', 'error_message'] = None

    # --- 4. Final Formatting ---
    df['nome'] = df['nome_clean']
    df['data_nascimento'] = df['data_nascimento_clean']
    df['documento'] = df['documento_clean']
    df['telefone'] = df['telefone_clean']
    df['motivo_acidente'] = df['motivo_clean']
    
    df['import_id'] = import_id
    from datetime import datetime
    df['created_at'] = datetime.utcnow()
    
    # Drop temp clean cols
    drop_cols = [c for c in df.columns if c.endswith('_clean')]
    df.drop(columns=drop_cols, inplace=True, errors='ignore')
    
    # Drop ID if exists in file to avoid conflict
    if 'id' in df.columns:
        df.drop(columns=['id'], inplace=True, errors='ignore')
        
    # Replace NaN with None for SQL
    df = df.where(pd.notnull(df), None)
    
    return df.to_dict(orient='records')

def parse_file(file_path: str) -> List[Dict]:
    """Compatibility wrapper for old tests/calls."""
    # Pass dummy import_id 0
    return process_import_file_vectorized(file_path, import_id=0)
