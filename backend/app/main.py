from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
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

# --- STARTUP: Ensure Admin User Exists ---
@app.on_event("startup")
def startup_db_client():
    db = SessionLocal()
    try:
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
DEFAULT_PROMPT_TEMPLATE = """Analise a lista de relatos de acidentes abaixo. Para cada um, retorne um objeto JSON contendo:
- id: O ID fornecido na entrada (MUITO IMPORTANTE MANTER O ID CORRETO)
- motivo: Classificação do acidente (ex: Colisão, Atropelamento, Queda, etc)
- justificativa: Breve explicação
- score: Confiança (0.0 a 1.0)
- validity: "Válido" se parece ser um acidente de fato, "Inválido" se não for, "Atenção" se incerto.

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
    return {"message": "Extrator API is running"}

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

@app.post("/upload", response_model=schemas.Import)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Read file content
    try:
        contents = await file.read()
        filename = file.filename
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error reading file")

    # 1. Create Import record
    db_import = models.Import(filename=filename, status="PROCESSING")
    db.add(db_import)
    db.commit()
    db.refresh(db_import)
    
    try:
        # 2. Parse file
        records_data = utils.parse_file(contents, filename)
        
        # 3. Create PeopleRecord entries
        people_records = []
        for data in records_data:
            # Normalize fields
            nome = utils.normalize_text(data.get("nome"))
            
            data_nascimento = utils.normalize_date(data.get("data_nascimento") or data.get("nascimento"))
            
            documento_raw = data.get("documento") or data.get("cpf") or data.get("rg")
            documento = utils.normalize_digits(documento_raw)
            
            telefone_raw = data.get("telefone") or data.get("celular") or data.get("contato")
            telefone = utils.normalize_digits(telefone_raw)
            
            motivo = utils.normalize_text(data.get("motivo") or data.get("motivo_acidente") or data.get("descricao"))
            
            # Validation Logic
            is_valid = True
            errors = []
            
            if not nome:
                is_valid = False
                errors.append("Nome obrigatório")
            if not data_nascimento:
                is_valid = False
                errors.append("Data de nascimento inválida ou ausente")
            if not documento:
                is_valid = False
                errors.append("Documento obrigatório")
            if not motivo:
                is_valid = False
                errors.append("Motivo obrigatório")
                
            error_msg = "; ".join(errors) if errors else None

            record = models.PeopleRecord(
                import_id=db_import.id,
                nome=nome,
                data_nascimento=data_nascimento,
                documento=documento,
                telefone=telefone,
                motivo_acidente=motivo,
                valid=is_valid,
                error_message=error_msg
            )
            people_records.append(record)
        
        db.add_all(people_records)
        
        # Update import status
        db_import.status = "PROCESSED"
        db.commit()
        db.refresh(db_import)
        
        return db_import

    except Exception as e:
        db_import.status = "ERROR"
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/imports", response_model=List[schemas.Import])
def read_imports(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    print(f"DEBUG: ENTERING read_imports endpoint. LIMIT={limit}")
    try:
        imports = db.query(models.Import).order_by(models.Import.uploaded_at.desc()).offset(skip).limit(limit).all()
        print(f"DEBUG: Found {len(imports)} imports in DB")
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
    records = query.order_by(models.PeopleRecord.created_at.desc()).offset(skip).limit(limit).all()
    
    if status == 'pending_analysis':
         ids = [str(r.id) for r in records]
         print(f"DEBUG: Pending Analysis Query returned {len(records)} items. IDs: {ids}")

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
    prompt_records = "\n".join([f"ID: {r.get('id')} | Relato: {r.get('description')}" for r in valid_records])
    
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
                 
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": "You are a helpful data analysis assistant. Return only valid JSON array."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.1
            )
            content = response.choices[0].message.content
                
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
