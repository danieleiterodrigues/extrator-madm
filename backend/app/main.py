from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, schemas, utils
from .database import engine, get_db, DB_PATH, SessionLocal
from pydantic import BaseModel
import json
import os
from dotenv import load_dotenv
from sqlalchemy import text # Make sure text is imported


class AnalysisResult(BaseModel):
    record_id: int
    status: str # 'Válido', 'Inválido', etc. Mapped to DB status
    justificativa: str
    score: float
    validity: str
    
# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Extrator de Acidentes API")

# Serve Static Files (Frontend)
# In production (Docker), the frontend build is copied to /app/static or similar
# We will assume a relative path '../frontend/dist' for local dev, or valid path in Docker
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static")
if not os.path.exists(static_dir):
    # Fallback for local dev if dist is in frontend folder
    static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../frontend/dist")

if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")
else:
    print(f"WARNING: Static directory {static_dir} not found. Frontend serving disabled.")

# --- STARTUP: Ensure Admin User Exists ---
@app.on_event("startup")
def startup_db_client():
    # Sync Schema (Ensure columns exist)
    try:
        utils.sync_db_schema(engine, models.Base)
    except Exception as e:
        print(f"SCHEMA SYNC FAILD: {e}")

    db = SessionLocal()
    try:
        # --- RESET STUCK IMPORTS ---
        # If server was killed during processing, records might be stuck in PROCESSING
        stuck_imports = db.query(models.Import).filter(models.Import.status.in_(["PROCESSING", "PENDING"])).all()
        # Note: PENDING might be valid if queue system, but here it's direct background task. 
        # Actually PENDING is set on upload, then background task immediately runs. 
        # If server restarts, that background task is lost. So PENDING is also stuck.
        
        if stuck_imports:
            print(f"--- DETECTED {len(stuck_imports)} STUCK IMPORTS (Resetting to ERROR) ---")
            for imp in stuck_imports:
                imp.status = "ERROR"
            db.commit()

        # Case insensitive check
        admin = db.query(models.User).filter(func.lower(models.User.username) == "admin").first()
        if not admin:
            # Create Master User
            master_user = models.User(
                username="ADMIN",
                password="adm123", # In prod use hashing!
                name="Admin User",
                role="SUPERADMIN"
            )
            db.add(master_user)
            db.commit()
            print("--- MASTER USER 'ADMIN' CREATED ---")
        else:
            # Auto-repair if exists but has wrong/missing data (like null role)
            if admin.role != "SUPERADMIN" or admin.name != "Admin User":
                admin.role = "SUPERADMIN"
                admin.name = "Admin User"
                # Ensure password is correct too just in case
                admin.password = "adm123" 
                db.add(admin)
                db.commit()
                print("--- MASTER USER 'ADMIN' REPAIRED ---")
                
    finally:
        db.close()

from sqlalchemy import func

# --- Auth Routes ---
@app.post("/login", response_model=schemas.UserResponse)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # Case insensitive lookup
    user = db.query(models.User).filter(func.lower(models.User.username) == user_in.username.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Usuário ou senha incorretos")
    
    # Simple password check (plaintext for prototype as requested)
    if user.password != user_in.password:
        raise HTTPException(status_code=400, detail="Usuário ou senha incorretos")
    
    # Return user with dummy token
    return schemas.UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role,
        token="demo-token-123" 
    )

@app.get("/users", response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/users", response_model=schemas.UserResponse)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nome de usuário já existe")
    
    new_user = models.User(
        username=user_in.username,
        password=user_in.password,
        name=user_in.name,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_in: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Check username uniqueness if changing
    if user_in.username and user_in.username != user.username:
        existing = db.query(models.User).filter(models.User.username == user_in.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nome de usuário já existe")
        user.username = user_in.username
        
    if user_in.name:
        user.name = user_in.name
    if user_in.role:
        user.role = user_in.role
    if user_in.password:
        user.password = user_in.password
        
    db.commit()
    db.refresh(user)
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    # Prevent deleting the Master Admin (ID 1)
    if user_id == 1:
        raise HTTPException(status_code=400, detail="Não é possível excluir o usuário ADMIN principal")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    db.delete(user)
    db.commit()
    return {"message": "Usuário excluído com sucesso"}

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration Helpers ---
DEFAULT_PROMPT_TEMPLATE = """Analise a lista de relatos de acidentes/ocorrências abaixo de saúde e segurança do trabalho.
Analise TODOS os campos disponíveis (Motivo, Diagnóstico, CID, Descrição, etc).
Se houver qualquer indício de DOENÇA FÍSICA, ACIDENTE DE TRABALHO, ou DOENÇA PSICOLÓGICA/MENTAL, deve ser considerado VÁLIDO.

Para cada item, retorne JSON:
- id: O ID de entrada (Mantenha estritamente o mesmo ID)
- motivo: Classificação sucinta do agravo (ex: "Acidente Típico", "Doença Osteomuscular", "Transtorno Mental", "Lesão Física", etc).
- justificativa: Explique qual doença, acidente ou CID foi identificado no texto.
- score: Confiança (0.0 a 1.0)
- validity: "Válido" (se confirmada doença/acidente), "Inválido" (se não for relacionado a saúde/acidente) ou "Atenção" (se inconclusivo).

Relatos:
{records}"""

def get_setting_value(db: Session, key: str, default: str = "") -> str:
    item = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    return item.value if item else default

def set_setting_value(db: Session, key: str, value: str):
    item = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if not item:
        item = models.SystemConfig(key=key, value=value)
        db.add(item)
    else:
        item.value = value

# --- Routes ---

@app.on_event("startup")
def startup_db_check():
    print("\n--- DATABASE DIAGNOSTICS ---")
    print(f"DB Path: {DB_PATH}")
    
    db = SessionLocal()
    try:
        # Check Pragmas (Only for SQLite)
        if "sqlite" in str(db.bind.url):
            journal_mode = db.execute(text("PRAGMA journal_mode")).scalar()
            foreign_keys = db.execute(text("PRAGMA foreign_keys")).scalar()
            print(f"PRAGMA journal_mode: {journal_mode}")
            print(f"PRAGMA foreign_keys: {foreign_keys}")
        else:
             print(f"Database Type: {db.bind.dialect.name}")
        
        # Check Counts
        import_count = db.query(models.Import).count()
        record_count = db.query(models.PeopleRecord).count()
        analysis_count = db.query(models.Analysis).count()
        
        print(f"Imports: {import_count}")
        print(f"PeopleRecords: {record_count}")
        print(f"Analyses: {analysis_count}")
        
        # List Imports
        imports = db.query(models.Import).all()
        for i in imports:
            print(f" -> Import ID {i.id}: {i.filename} ({i.status})")
            
        print("----------------------------\n")
    finally:
        db.close()

@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_dir, "index.html"))



@app.get("/settings", response_model=schemas.SystemSettings)
def get_settings(db: Session = Depends(get_db)):
    prompt = get_setting_value(db, "ANALYSIS_PROMPT", "")
    if not prompt:
        prompt = DEFAULT_PROMPT_TEMPLATE
        
    # Read DB settings from env or default
    db_url = os.getenv("DATABASE_URL", "")
    db_host, db_port, db_user, db_pass, db_name = "localhost", "5432", "postgres", "", "extrator"
    
    # Simple parse attempt if URL exists
    if db_url and "postgresql://" in db_url:
        try:
            # postgresql://user:pass@host:port/dbname
            # This is rough parsing, but enough for UI pre-fill
            parts = db_url.replace("postgresql://", "").split("@")
            if len(parts) == 2:
                creds, serv = parts[0], parts[1]
                if ":" in creds: db_user, db_pass = creds.split(":")
                if "/" in serv: 
                    hostport, db_name = serv.split("/")
                    if ":" in hostport: db_host, db_port = hostport.split(":")
                    else: db_host = hostport
        except:
            pass

    return {
        "ai_provider": get_setting_value(db, "AI_PROVIDER", "gemini"),
        "gemini_key": get_setting_value(db, "GEMINI_API_KEY", ""),
        "openai_key": get_setting_value(db, "OPENAI_API_KEY", ""),
        "analysis_prompt": prompt,
        "db_host": db_host,
        "db_port": db_port,
        "db_name": db_name,
        "db_user": db_user,
        "db_password": db_pass
    }

@app.post("/settings")
def update_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db)):
    set_setting_value(db, "AI_PROVIDER", settings.ai_provider)
    if settings.gemini_key is not None:
        set_setting_value(db, "GEMINI_API_KEY", settings.gemini_key)
    if settings.openai_key is not None:
        set_setting_value(db, "OPENAI_API_KEY", settings.openai_key)
    if settings.analysis_prompt is not None:
        set_setting_value(db, "ANALYSIS_PROMPT", settings.analysis_prompt)
    
    # Handle Database Settings -> Write to .env
    if settings.db_user and settings.db_password:
        # Construct Postgres URL
        # postgresql://user:password@host:port/dbname
        db_url = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
        
        # Write to .env file
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.env")
        try:
            # Read existing lines
            lines = []
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    lines = f.readlines()
            
            # Remove existing DATABASE_URL
            lines = [l for l in lines if not l.startswith("DATABASE_URL=")]
            
            # Append new
            lines.append(f"\nDATABASE_URL={db_url}\n")
            
            with open(env_path, "w") as f:
                f.writelines(lines)
                
            print(f"DEBUG: Updated DATABASE_URL in .env to {db_url}")
        except Exception as e:
            print(f"ERROR writing .env: {e}")

    db.commit()
    return {"message": "Settings updated (Restart needed for DB changes)"}

def process_import_background(import_id: int, file_path: str):
    import time
    start_time = time.time()
    print(f"BACKGROUND: Starting processing for import {import_id} file {file_path}")
    db = SessionLocal()
    db_import = db.query(models.Import).filter(models.Import.id == import_id).first()
    if not db_import:
        print("BACKGROUND: Import record not found.")
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        return

    try:
        # 1. Parse file from DISK
        # parse_file now expects a path
        print(f"BACKGROUND: Parsing file...")
        t0 = time.time()
        # 1. Parse file from DISK using VECTORIZED function
        # parse_file expects a path
        print(f"BACKGROUND: Parsing file vectorized...")
        t0 = time.time()
        # This now does reading + cleaning + validation
        records_data = utils.process_import_file_vectorized(file_path, db_import.id)
        parse_duration = time.time() - t0
        print(f"BACKGROUND: File parsed in {parse_duration:.2f}s. Rows: {len(records_data) if records_data else 0}")
        
        if not records_data:
            # Handle empty file
            db_import.status = "PROCESSED"
            db.commit()
            return

        # --- DYNAMIC COLUMN LOGIC START ---
        from sqlalchemy import inspect, text, Table, MetaData
        
        # Get all keys from file
        file_columns = set()
        for r in records_data:
            file_columns.update(r.keys())
            
        # Inspect DB columns
        inspector = inspect(engine)
        existing_columns = {c['name'] for c in inspector.get_columns('people_records')}
        
        # columns to add
        new_columns = file_columns - existing_columns
        
        if new_columns:
            print(f"BACKGROUND: Found new columns to add: {new_columns}")
            # Use granular transactions for schema updates to avoid long locks
            # One connection for all ALTERS, but commit immediately
            try:
                with engine.connect() as conn:
                    with conn.begin(): # Explicit transaction
                        for col_name in new_columns:
                            try:
                                alter_query = text(f'ALTER TABLE people_records ADD COLUMN "{col_name}" TEXT')
                                conn.execute(alter_query)
                                print(f"BACKGROUND: Added column '{col_name}'")
                            except Exception as e:
                                print(f"BACKGROUND ERROR adding column {col_name}: {e}")
            except Exception as e:
                print(f"BACKGROUND: Schema update transaction error: {e}")
            
            # FORCE PAUSE to let DB breathe and locks release
            print("BACKGROUND: Pausing 1s after schema update...")
            time.sleep(1)

        
        # Update Total Records Count
        # Re-fetch import to ensure session is fresh
        db.expire(db_import)
        db_import.total_records = len(records_data)
        db.commit()
        
        # --- PREPARE DATA FOR INSERT (BATCHED) ---
        metadata = MetaData()
        # Reflect table to get all columns including new ones
        # Use a fresh inspector logic if needed, but autoload should hit DB
        people_records_table = Table('people_records', metadata, autoload_with=engine)
        
        from datetime import datetime
        
        BATCH_SIZE = 2500 # Increased for production latency
        current_batch = []
        processed_count = 0
        
        print("BACKGROUND: Starting record validation and insertion loop...")
        t_loop_start = time.time()
        

        for data in records_data:
            # Removed loop logic, replaced by bulk insert below
            pass 


        # BATCHED INSERTION
        total_records = len(records_data)
        for i in range(0, total_records, BATCH_SIZE):
            batch = records_data[i:i + BATCH_SIZE]
            t_insert = time.time()
            with engine.begin() as conn:
                    conn.execute(people_records_table.insert(), batch)
            
            insert_dt = time.time() - t_insert
            processed_count += len(batch)
            print(f"BACKGROUND: Inserted batch {i//BATCH_SIZE + 1}. Time: {insert_dt:.3f}s. Total: {processed_count}")
            
            # Update progress
            db_import.processed_records = processed_count
            db.commit()

        print(f"BACKGROUND: Bulk Insert finished in {time.time() - t_loop_start:.2f}s")

        
        db_import.status = "PROCESSED"
        db.commit()
        
        total_duration = time.time() - start_time
        print(f"BACKGROUND: Finished processing import {import_id} in {total_duration:.2f}s. Total: {processed_count}")

    except Exception as e:
        print(f"BACKGROUND ERROR: {e}")
        import traceback
        traceback.print_exc()
        db_import.status = "ERROR"
        db.commit()
    finally:
        db.close()
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"BACKGROUND: Removed temp file {file_path}")
        except Exception as e:
            print(f"BACKGROUND: Error removing temp file: {e}")

@app.post("/upload", response_model=schemas.Import)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    # Streaming save to temp file
    try:
        # Create temp dir if not exists
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Generate unique filename keeping extension
        name, ext = os.path.splitext(file.filename)
        unique_name = f"{name}_{os.urandom(4).hex()}{ext}"
        file_path = os.path.join(temp_dir, unique_name)
        
        print(f"UPLOAD: Saving file to {file_path}")
        with open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024): # 1MB chunks
                buffer.write(content)
                
    except Exception as e:
        print(f"UPLOAD FAILED SAVE: {e}")
        raise HTTPException(status_code=400, detail=f"Error saving file: {str(e)}")

    # 1. Create Import record
    db_import = models.Import(filename=file.filename, status="PROCESSING")
    db.add(db_import)
    db.commit()
    db.refresh(db_import)
    
    # 2. Dispatch Background Task
    background_tasks.add_task(process_import_background, db_import.id, file_path)
    
    return db_import

@app.get("/imports", response_model=List[schemas.ImportList])
def read_imports(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    try:
        imports = db.query(models.Import).order_by(models.Import.uploaded_at.desc()).offset(skip).limit(limit).all()
        return imports
    except Exception as e:
        print(f"DEBUG: read_imports FAILED: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/imports/{import_id}")
def delete_import(import_id: int, db: Session = Depends(get_db)):
    db_import = db.query(models.Import).filter(models.Import.id == import_id).first()
    if not db_import:
        raise HTTPException(status_code=404, detail="Import not found")
    
    # Delete associated records first
    # 1. Get all record IDs for this import
    record_ids_query = db.query(models.PeopleRecord.id).filter(models.PeopleRecord.import_id == import_id)
    
    # 2. Delete linked Analyses
    # Note: query.delete() does not emit ORM cascades, so we delete analyses manually or rely on DB FK.
    # To be safe and support SQLite without strict FK enforcement if configured that way:
    db.query(models.Analysis).filter(models.Analysis.record_id.in_(record_ids_query)).delete(synchronize_session=False)
    
    # 3. Delete PeopleRecords
    db.query(models.PeopleRecord).filter(models.PeopleRecord.import_id == import_id).delete(synchronize_session=False)
    
    db.delete(db_import)
    db.commit()
    return {"message": "Import deleted successfully"}

@app.get("/records", response_model=schemas.PeopleRecordPagination)
def read_records(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None, # 'valid', 'invalid', 'pending_analysis'
    search: Optional[str] = None,
    sort_by: Optional[str] = None, # 'id', 'classification'
    order_desc: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(models.PeopleRecord)
    
    if status == 'valid':
        query = query.filter(models.PeopleRecord.valid == True)
    elif status == 'invalid':
        query = query.filter(models.PeopleRecord.valid == False)
    elif status == 'pending_analysis':
        # Select records that are Valid but NOT in Analysis table
        # Explicitly fetching IDs to debug "Infinite Loop" and ensure exclusion
        analyzed_ids = [r[0] for r in db.query(models.Analysis.record_id).all()]
        print(f"DEBUG: Found {len(analyzed_ids)} analyzed records in DB.")
        
        query = query.filter(models.PeopleRecord.valid == True)
        if analyzed_ids:
            query = query.filter(~models.PeopleRecord.id.in_(analyzed_ids))
    elif status == 'analyzed':
        query = query.join(models.Analysis)
    elif status == 'analyzed_valid':
        query = query.join(models.Analysis).filter(models.Analysis.status == 'Válido')
    elif status == 'analyzed_invalid':
        query = query.join(models.Analysis).filter(models.Analysis.status == 'Inválido')
    elif status == 'analyzed_attention':
        query = query.join(models.Analysis).filter(models.Analysis.status == 'Atenção')
    elif status == 'analyzed_manual':
        query = query.join(models.Analysis).filter(models.Analysis.status == 'Validar Manualmente')
    elif status == 'Ignorado':
        query = query.filter(models.PeopleRecord.valid == False)
    
    if search:
        search_fmt = f"%{search}%"
        from sqlalchemy import or_
        filters = [
            models.PeopleRecord.nome.ilike(search_fmt),
            models.PeopleRecord.documento.ilike(search_fmt),
            models.PeopleRecord.motivo_acidente.ilike(search_fmt)
        ]
        
        if search == 'N/A':
            filters.append(models.PeopleRecord.motivo_acidente == None)
            filters.append(models.PeopleRecord.motivo_acidente == '')
            
        query = query.filter(or_(*filters))
        
    total = query.count()
    
    # Sorting Logic
    if sort_by == 'id':
        if order_desc:
            query = query.order_by(models.PeopleRecord.id.desc())
        else:
            query = query.order_by(models.PeopleRecord.id.asc())
            
    elif sort_by == 'classification':
        # Need to join with Analysis if not already joined
        # But some status filters already joined. SQLAlchemy handles redundant joins smartly usually, 
        # but explicit outerjoin is safer if we want to include records without analysis (though 'classification' sort implies analysis concern)
        # If we sort by classification, nulls (no analysis) should probably be last or first.
        # Let's do outerjoin to be safe.
        query = query.outerjoin(models.Analysis)
        if order_desc:
            query = query.order_by(models.Analysis.status.desc())
        else:
            query = query.order_by(models.Analysis.status.asc())
    else:
        # Default
        query = query.order_by(models.PeopleRecord.created_at.desc())

    records = query.offset(skip).limit(limit).all()
    
    # --- DYNAMIC COLUMN FETCHING START ---
    if records:
        from sqlalchemy import MetaData, Table, select
        # Reflect table to see ALL current columns (including those added dynamically)
        metadata = MetaData()
        # We need to use valid engine connection
        people_table = Table('people_records', metadata, autoload_with=engine)
        
        # Get IDs to fetch raw data
        record_ids = [r.id for r in records]
        
        if record_ids:
            with engine.connect() as conn:
                stmt = select(people_table).where(people_table.c.id.in_(record_ids))
                raw_rows = conn.execute(stmt).mappings().all()
                
            # Create a map for fast lookup: id -> raw_row
            raw_map = {row['id']: dict(row) for row in raw_rows}
            
            # Merge logic:
            # We want: 
            # 1. The Pydantic model to receive the raw dict (so it sees the extra fields)
            # 2. But we ALSO need the 'analysis' relationship which is handled by ORM
            
            merged_items = []
            for r in records:
                # Base data from raw row (contains dynamic columns)
                # Fallback to Empty dict if not found (shouldn't happen)
                data = raw_map.get(r.id, {})
                
                # Manually attach the relation object from the ORM instance
                # Pydantic (v2) from_attributes=True + extra='allow' should handle a dict that has an object in it?
                # Actually, standard Pydantic prefers dicts for input if we want 'extra' fields to key-value map.
                # If we pass a dict with 'analysis': AnalysisORMObject, Pydantic should validate 'analysis' field against Analysis schema using from_attributes logic.
                
                data['analysis'] = r.analysis
                merged_items.append(data)
                
            return {"items": merged_items, "total": total}

    return {"items": records, "total": total}

@app.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_records = db.query(models.PeopleRecord).count()
    valid_records = db.query(models.PeopleRecord).filter(models.PeopleRecord.valid == True).count()
    invalid_records = db.query(models.PeopleRecord).filter(models.PeopleRecord.valid == False).count()
    
    # Analysis Status Counts (Using JOIN to ensure we only count analyses for valid records)
    analyzed_records = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True).count()
    analyzed_valid = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True, models.Analysis.status == 'Válido').count()
    analyzed_invalid = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True, models.Analysis.status == 'Inválido').count()
    analyzed_attention = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True, models.Analysis.status == 'Atenção').count()
    analyzed_manual = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True, models.Analysis.status == 'Validar Manualmente').count()

    from sqlalchemy import func
    reasons_query = db.query(
        models.PeopleRecord.motivo_acidente, 
        func.count(models.PeopleRecord.id)
    ).group_by(models.PeopleRecord.motivo_acidente).all()
    
    reasons_stats = [{"motivo": r[0] or "N/A", "count": r[1]} for r in reasons_query]
    
    return {
        "total_records": total_records,
        "valid_records": valid_records,
        "invalid_records": invalid_records,
        "analyzed_records": analyzed_records,
        "analyzed_valid": analyzed_valid,
        "analyzed_invalid": analyzed_invalid,
        "analyzed_attention": analyzed_attention,
        "analyzed_manual": analyzed_manual,
        "by_reason": reasons_stats
    }

@app.get("/engine/metrics")
def get_engine_metrics(db: Session = Depends(get_db)):
    # Calculate real metrics
    total_valid = db.query(models.PeopleRecord).filter(models.PeopleRecord.valid == True).count()
    
    # Analyzed count should only include analyses for records that still exist and are valid
    analyzed_count = db.query(models.Analysis).join(models.PeopleRecord).filter(models.PeopleRecord.valid == True).count()
    
    pending_leads = total_valid - analyzed_count
    if pending_leads < 0: pending_leads = 0 
    
    processed_leads = analyzed_count
    
    import random
    current_batch = f"#{random.randint(1000, 9999)}"
    
    return {
        "pendingLeads": pending_leads,
        "processedLeads": processed_leads,
        "currentBatch": current_batch
    }

@app.get("/engine/logs")
def get_engine_logs():
    from datetime import datetime
    levels = ["INFO", "SUCCESS", "AI-ENGINE", "WARNING"]
    msgs = [
        "Iniciando ciclo de análise...",
        "Carregando lote de registros pendentes",
        "Conexão com API estabelecida",
        "Analisando contexto semântico",
        "Registro classificado",
        "Otimizando prompts de extração"
    ]
    logs = []
    base_time = datetime.now()
    for i in range(10):
        logs.append({
            "timestamp": base_time.strftime("%H:%M:%S"),
            "level": levels[i % len(levels)],
            "message": msgs[i % len(msgs)]
        })
    return logs



@app.post("/analyses/batch")
def save_analysis_batch(results: List[AnalysisResult], db: Session = Depends(get_db)):
    saved_count = 0
    from datetime import datetime
    for res in results:
        existing = db.query(models.Analysis).filter(models.Analysis.record_id == res.record_id).first()
        if existing:
            existing.status = res.validity
            existing.justificativa = res.justificativa
            existing.score = res.score
            existing.analyzed_at = datetime.utcnow()
        else:
            analysis = models.Analysis(
                record_id=res.record_id,
                status=res.validity,
                justificativa=res.justificativa,
                score=res.score,
                prompt_version="v1-auto",
                analyzed_at=datetime.utcnow()
            )
            db.add(analysis)
        saved_count += 1
    
    print(f"DEBUG: Saving batch of {len(results)} records...")
    
    # Retry logic without manual lock
    import time
    from sqlalchemy.exc import OperationalError
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            print(f"DEBUG: Attempting commit {attempt+1}/{max_retries}...")
            db.commit()
            print("DEBUG: Commit successful.")
            
            # IMMEDIATE VERIFICATION
            total_after = db.query(models.Analysis).count()
            print(f"\n\n==================================================")
            print(f"DEBUG: TOTAL ANALYSIS ROWS IN DB NOW: {total_after}")
            print(f"DEBUG: PATH USED: {db.bind.url}")
            print(f"==================================================\n\n")
            
            break 
        except OperationalError as e:
            db.rollback()
            print(f"DEBUG: OperationalError: {e}")
            if "database is locked" in str(e) and attempt < max_retries - 1:
                time.sleep(0.5) 
                continue
            raise HTTPException(status_code=500, detail=f"Database Lock Error: {str(e)}")
        except Exception as e:
            db.rollback()
            print(f"DEBUG: General Error: {e}")
            raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
            
    return {"message": f"Processed {saved_count} records"}

@app.post("/records/{record_id}/reprocess")
def reprocess_record(record_id: int, db: Session = Depends(get_db)):
    """
    Sets a record's valid status to True, effectively moving it back to the Pending queue.
    Useful for manually correcting records marked as 'Ignored' (valid=False).
    """
    record = db.query(models.PeopleRecord).filter(models.PeopleRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.valid = True
    # If there was an analysis (unlikely for ignored, but possible), we might want to wipe it?
    # For now, we assume Ignored means NO analysis.
    
    db.commit()
    return {"message": "Record sent to analysis queue (Pending)"}

@app.post("/engine/analyze")
def analyze_batch(records: List[dict], db: Session = Depends(get_db)):
    # 1. Determine Provider and API Key
    provider = get_setting_value(db, "AI_PROVIDER", "gemini")
    
    # 2. Pre-filter records: Separate valid descriptions from empty/short ones
    valid_records = []
    short_records = []
    
    for r in records:
        desc = r.get('description', '') or ''
        # If description is too short, mark as invalid immediately
        if len(desc.strip()) < 5:
            short_records.append({
                "record_id": r.get('id'),
                "motivo": "Dados insuficientes",
                "justificativa": "Relato vazio ou com informações insuficientes para análise.",
                "score": 0.0,
                "validity": "Inválido",
                "status": "Inválido" # For DB
            })
        else:
            valid_records.append(r)
            
    # If no valid records content-wise, return short records immediately
    if not valid_records:
        return short_records

    # 3. Prompt Construction (Only for valid records)
    # Build prompt using ALL available fields except internal metadata
    ignored_keys = ['id', 'import_id', 'valid', 'validity', 'score', 'status', 'created_at', 'analysis', 'error_message', 'record_id']
    
    formatted_records = []
    for r in valid_records:
        # Build string like "motivo: Colisão | cor: Azul | ..."
        # Use sorting to ensure deterministic order if needed, or just standard dict order
        parts = [f"ID: {r.get('id')}"]
        
        # Include description/motivo first if available for clarity, though not strictly required if we iterate all
        # To be nice to the LLM, let's put 'motivo_acidente' or 'description' early if found.
        # But simple iteration is fine.
        
        for k, v in r.items():
            if k not in ignored_keys:
                 parts.append(f"{k}: {v}")
        
        formatted_records.append(" | ".join(parts))

    prompt_records = "\n".join(formatted_records)
    
    # Check for custom prompt
    custom_prompt = get_setting_value(db, "ANALYSIS_PROMPT", "")
    
    if not custom_prompt or len(custom_prompt.strip()) < 10:
        custom_prompt = DEFAULT_PROMPT_TEMPLATE

    # Inject records
    if "{records}" in custom_prompt:
         full_prompt = custom_prompt.replace("{records}", prompt_records)
    else:
         # Fallback if user removed the placeholder
         full_prompt = f"{custom_prompt}\n\nRelatos:\n{prompt_records}"
    
    print(f"DEBUG PROMPT START:\n{full_prompt[:500]}...\nDEBUG PROMPT END") # Logs first 500 chars

    # 4. Call AI
    ai_results = []
    
    try:
        content = ""
        
        if provider == "gpt":
            api_key = get_setting_value(db, "OPENAI_API_KEY")
            if not api_key:
                load_dotenv()
                load_dotenv(dotenv_path="../.env")
                api_key = os.getenv("OPENAI_API_KEY")
    
            if not api_key:
                 raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
                 
            from openai import OpenAI, RateLimitError
            import time
            import random

            client = OpenAI(api_key=api_key)
            
            # Retry configuration
            max_retries = 5
            base_delay = 1
            
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model="gpt-4o-mini", 
                        messages=[
                            {"role": "system", "content": "You are a helpful data analysis assistant. Return only valid JSON array."},
                            {"role": "user", "content": full_prompt}
                        ],
                        temperature=0.1
                    )
                    content = response.choices[0].message.content
                    break # Success, exit retry loop
                    
                except RateLimitError as e:
                    print(f"DEBUG: OpenAI Rate Limit hit (Attempt {attempt+1}/{max_retries}).")
                    if attempt == max_retries - 1:
                        print(f"DEBUG: Max retries exhausted for OpenAI.")
                        raise e
                    
                    # Exponential Backoff + Jitter
                    delay = (base_delay * (2 ** attempt)) + (random.random() * 0.5)
                    print(f"DEBUG: Sleeping for {delay:.2f} seconds...")
                    time.sleep(delay)
                except Exception as e:
                     raise e
                
        else: # Default: Gemini
            api_key = get_setting_value(db, "GEMINI_API_KEY")
            if not api_key:
                load_dotenv() 
                load_dotenv(dotenv_path="../.env")
                api_key = os.getenv("GEMINI_API_KEY")
                
            if not api_key:
                raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
                
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            content = response.text.strip()

        # 5. Parse JSON Safe
        # Remove MD blocks if any
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.replace("```", "").strip()
            
        try:
            ai_results = json.loads(content)
        except json.JSONDecodeError as je:
             print(f"JSON Parse Error: {je}")
             print(f"Raw Content: {content}")
             # Return error for valid records instead of crashing
             return short_records + [{
                 "record_id": r.get('id'),
                 "motivo": "Erro de Análise",
                 "justificativa": "IA retornou resposta inválida.",
                 "score": 0.0,
                 "validity": "Atenção",
                 "status": "Atenção"
             } for r in valid_records]

        # Ensure mapping from 'id' to 'record_id'
        if isinstance(ai_results, list):
            for item in ai_results:
                if 'id' in item and 'record_id' not in item:
                    item['record_id'] = item['id']
                    
        return short_records + ai_results
        
    except Exception as e:
        print(f"AI Provider Error: {e}")
        # Identify if it was failure to generate
        raise HTTPException(status_code=500, detail=str(e))

# SPA Catch-all (Must be last)
# Use global static_dir computed earlier
if os.path.exists(static_dir):
    from fastapi.responses import FileResponse
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Exclude API routes just in case they fell through
        if full_path.startswith("api") or full_path.startswith("assets") or full_path.startswith("docs") or full_path.startswith("openapi"):
            raise HTTPException(status_code=404)
        
        # Check if file exists in static (e.g. favicon.ico)
        if os.path.exists(os.path.join(static_dir, full_path)):
            return FileResponse(os.path.join(static_dir, full_path))

        return FileResponse(os.path.join(static_dir, "index.html"))
