import pandas as pd
import sys
import os

# Add parent dir to path to find app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.utils import process_import_file_vectorized

# Create a dummy CSV matching the user's case
data = {
    "Nome": ["EVANIA DE LIMA MOREIRA", "TEST CASE 2"],
    "Documento": ["02186710242", ""],
    "Nascimento": ["N/A", "N/A"],
    "Telefone": ["N/A", "N/A"],
    "Relato Original": ["302010400 - Rampa...", "Test"],
    # Backup columns
    "data_de_nascimento": ["1992-04-19 00:00:00", "01/05/1990"],
    "cpf": ["", "12345678900"]
}

df = pd.DataFrame(data)
csv_path = "test_verify.csv"
df.to_csv(csv_path, index=False)

try:
    print("--- Running Parsing Logic ---")
    # import_id 999 is dummy
    results = process_import_file_vectorized(csv_path, 999)
    
    for r in results:
        print(f"Row: {r['nome']}")
        print(f"  Valid: {r['valid']}")
        print(f"  Date: '{r['data_nascimento']}'")
        print(f"  Doc: '{r['documento']}'")
        print(f"  Motivo: '{r['motivo_acidente']}'")
        print("-" * 20)
        
finally:
    if os.path.exists(csv_path):
        os.remove(csv_path)
