from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Import(Base):
    __tablename__ = "imports"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PENDING") # PENDING, PROCESSED, ERROR
    
    records = relationship("PeopleRecord", back_populates="import_file", cascade="all, delete-orphan")

class PeopleRecord(Base):
    __tablename__ = "people_records"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("imports.id"))
    
    nome = Column(String, nullable=True)
    data_nascimento = Column(String, nullable=True) # Manter string para validação posterior ou data se normalizado
    documento = Column(String, index=True)
    telefone = Column(String, nullable=True)
    motivo_acidente = Column(Text, nullable=True)
    
    valid = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    import_file = relationship("Import", back_populates="records")
    analysis = relationship("Analysis", back_populates="record", uselist=False, cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("people_records.id"))
    
    status = Column(String) # DESCARTAR, PRODUTO_A, PRODUTO_B
    justificativa = Column(Text)
    score = Column(Float) # Changed to Float to support decimals (0.0 - 1.0)
    prompt_version = Column(String, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("PeopleRecord", back_populates="analysis")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String) # Storing plaintext for simplicity as per prototype context, but usually hashed
    name = Column(String)
    role = Column(String) # 'SUPERADMIN' or 'COLABORADOR'
    
class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String, nullable=True)
    # Allows storing:
    # key="AI_PROVIDER", value="gemini" or "gpt"
    # key="GEMINI_API_KEY", value="..."
    # key="OPENAI_API_KEY", value="..."
