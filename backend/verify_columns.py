import requests
import pandas as pd
import io

# 1. Create a dummy CSV with duplicate columns and the new fields
data = {
    "Tipo": ["Colisão"],
    "Iniciativa da CAT": ["Empregador"],
    "Fonte do Cadastramento": ["Online"],
    "Tipo": ["Típico"], # Duplicate! Pandas will make this "Tipo.1", utils will make "tipo_1"
    "Observações": ["Obs 1"],
    "Observações": ["Obs 2"], # Duplicate! -> "observacoes_1"
    "Nome": ["Teste User"],
    "CPF": ["12345678900"],
    "Data do Acidente": ["01/01/2023"]
}

# Create CSV in memory
# Note: creating dict with duplicate keys in Python literals isn't possible, the second overwrites.
# We need to construct DataFrame carefully to simulate reading a file that had duplicates.
# Actually, let's write a raw string CSV to be sure.

csv_content = """Tipo,Iniciativa da CAT,Fonte do Cadastramento,Tipo,Observações,Observações,Nome,CPF,Data do Acidente
Colisão,Empregador,Online,Típico,Obs 1,Obs 2,Teste User,12345678900,01/01/2023"""

print("--- CSV CONTENT ---")
print(csv_content)
print("-------------------")

files = {'file': ('test_columns.csv', csv_content, 'text/csv')}

try:
    # 2. Upload
    print("\nSending upload request...")
    response = requests.post("http://localhost:8000/upload", files=files)
    
    if response.status_code == 200:
        print("Upload successful!")
        import_data = response.json()
        print(f"Import ID: {import_data['id']}")
        
        # 3. Verify Data via API (or assume success if no 500)
        # We can hit /records to see if the columns come back in the raw dictionary or model
        
        # Wait a moment for async DB stuff if any (though upload is sync in this code)
        
        # Fetch records
        print("\nFetching records to verify fields...")
        msg = requests.get("http://localhost:8000/records?limit=1")
        items = msg.json()['items']
        if items:
            rec = items[0]
            print("\n--- RECORD KEYS ---")
            print(rec.keys())
            
            print("\n--- CHECKING SPECIFIC FIELDS ---")
            print(f"tipo: {rec.get('tipo')}")
            print(f"tipo_1: {rec.get('tipo_1')}")
            print(f"observacoes: {rec.get('observacoes')}")
            print(f"observacoes_1: {rec.get('observacoes_1')}")
            
            if rec.get('tipo_1') == 'Típico' and rec.get('observacoes_1') == 'Obs 2':
                print("\nSUCCESS: Duplicate columns handled and persisted correctly!")
            else:
                print("\nFAILURE: Fields missing or incorrect.")
        else:
            print("No records found.")
            
    else:
        print(f"Error: {response.status_code} - {response.text}")

except Exception as e:
    print(f"Exception: {e}")
