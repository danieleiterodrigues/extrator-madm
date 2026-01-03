from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AnalysisBase(BaseModel):
    status: str
    justificativa: str
    score: Optional[float] = 0.0
    prompt_version: Optional[str] = None

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    id: int
    record_id: int
    analyzed_at: datetime

    class Config:
        from_attributes = True

class PeopleRecordBase(BaseModel):
    nome: Optional[str]
    data_nascimento: Optional[str]
    documento: Optional[str]
    telefone: Optional[str]
    motivo_acidente: Optional[str]
    valid: bool
    error_message: Optional[str]
    
class PeopleRecordCreate(PeopleRecordBase):
    pass

class PeopleRecord(PeopleRecordBase):
    id: int
    import_id: int
    created_at: datetime
    analysis: Optional[Analysis] = None

    class Config:
        from_attributes = True
        extra = "allow"

class ImportBase(BaseModel):
    filename: str
    status: str

class ImportCreate(ImportBase):
    pass

class Import(ImportBase):
    id: int
    uploaded_at: datetime
    records: List[PeopleRecord] = []

    class Config:
        from_attributes = True

class PeopleRecordPagination(BaseModel):
    items: List[PeopleRecord]
    total: int

class SystemSettings(BaseModel):
    ai_provider: str = "gemini"
    gemini_key: Optional[str] = ""
    openai_key: Optional[str] = ""
    analysis_prompt: Optional[str] = ""
    
    # Database Settings
    db_host: Optional[str] = "localhost"
    db_port: Optional[str] = "5432"
    db_name: Optional[str] = "extrator"
    db_password: Optional[str] = ""

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    name: Optional[str]
    role: Optional[str]
    token: Optional[str] = None

    class Config:
        from_attributes = True
