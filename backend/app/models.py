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
    
    # Progress Tracking
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    
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
    
    # --- New Extraction Columns ---
    tipo_de_cat = Column(String, nullable=True)
    iniciativa_da_cat = Column(String, nullable=True)
    fonte_do_cadastramento = Column(String, nullable=True)
    numero_da_cat = Column(String, nullable=True)
    numero_do_recibo_do_evento_no_esocial_da_cat_de_origem = Column(String, nullable=True)
    razao_social_nome = Column(String, nullable=True)
    tipo = Column(String, nullable=True)
    tipo_1 = Column(String, nullable=True) # Duplicate handler
    numero_de_inscricao = Column(String, nullable=True)
    cnae = Column(String, nullable=True)
    # nome is already defined above
    cpf = Column(String, nullable=True)
    data_de_nascimento = Column(String, nullable=True)
    sexo = Column(String, nullable=True)
    estado_civil = Column(String, nullable=True)
    cbo = Column(String, nullable=True)
    filiacao_a_previdencia_social = Column(String, nullable=True)
    areas = Column(String, nullable=True)
    data_do_acidente = Column(String, nullable=True)
    hora_do_acidente = Column(String, nullable=True)
    apos_quantas_horas_de_trabalho = Column(String, nullable=True)
    # tipo repeated -> already handled by tipo and tipo_1
    houve_afastamento = Column(String, nullable=True)
    ultimo_dia_trabalhado = Column(String, nullable=True)
    local_do_acidente = Column(String, nullable=True)
    especificacao_do_local_do_acidente = Column(String, nullable=True)
    cnpj_caepf_cno_do_local_do_acidente = Column(String, nullable=True)
    uf_do_acidente = Column(String, nullable=True)
    municipio_do_local_do_acidente = Column(String, nullable=True)
    pais = Column(String, nullable=True)
    parte_do_corpo_atingida = Column(String, nullable=True)
    agente_causador = Column(String, nullable=True)
    lateralidade = Column(String, nullable=True)
    descricao_da_situacao_geradora_do_acidente_ou_doenca = Column(Text, nullable=True)
    houve_registro_policial = Column(String, nullable=True)
    houve_morte = Column(String, nullable=True)
    data_do_obito = Column(String, nullable=True)
    observacoes = Column(Text, nullable=True)
    observacoes_1 = Column(Text, nullable=True) # Duplicate handler if needed, though user list showed one 'Observações' block at end? 
    # List had: ..., Houve morte?, Data do óbito, Observações, Data do Recebimento...
    # AND later: ..., Nome do médico..., Observações, RG...
    # So yes, two Observações.
    
    data_do_recebimento = Column(String, nullable=True)
    data = Column(String, nullable=True)
    hora_atendimento = Column(String, nullable=True)
    houve_internacao = Column(String, nullable=True)
    provavel_duracao_do_tratamento_dias = Column(String, nullable=True)
    devera_o_acidentado_afastar_se_do_trabalho_durante_o_tratamento = Column(String, nullable=True)
    descricao_e_natureza_da_lesao = Column(Text, nullable=True)
    diagnostico_provavel = Column(Text, nullable=True)
    cid_10 = Column(String, nullable=True)
    local_e_data = Column(String, nullable=True)
    nome_do_medico_crm_e_uf = Column(String, nullable=True)
    
    rg = Column(String, nullable=True)
    titulo_eleitor = Column(String, nullable=True)
    nome_mae = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    logr_numero = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cep = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    uf = Column(String, nullable=True)
    telefones = Column(String, nullable=True)
    emails = Column(String, nullable=True)
    
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
