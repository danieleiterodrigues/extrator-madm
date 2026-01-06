import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import utils

# Data provided by user
# Note: 'nan' in the user text suggests pandas DataFrame output, likely None or NaN in Python.
# 'N/A' is a string.

data = {
    "nome": "FERNANDA DOS SANTOS MENDES FREITAS",
    "documento": "N/A",
    "nascimento": "01-01-1980",
    "telefone": "N/A",
    "relato_original": "200080901 - Contato com pessoas doentes...",
    "cpf": None, # 'nan' usually parses to None/NaN
}

print("--- Simulating Processing ---")

# 1. Normalization
nome = utils.normalize_text(data.get("nome"))
dt_val = data.get("data_nascimento") or data.get("nascimento")
data_nascimento = utils.normalize_date(dt_val)

doc_val = data.get("documento") or data.get("cpf")
documento = utils.normalize_digits(doc_val)

print(f"Original Documento: {doc_val}")
print(f"Normalized Documento: '{documento}'")

# 2. Validation
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

print(f"Is Valid: {is_valid}")
print(f"Errors: {errors}")
