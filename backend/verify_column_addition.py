import sys
import os
import io

# Add backend to path
sys.path.append(r"C:\ProjetosDaniel\extrator-madm\backend")

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, SessionLocal
from sqlalchemy import text, inspect

def verify_dynamic_columns():
    client = TestClient(app)
    
    new_col_name = "coluna_surpresa_123"
    csv_content = f"nome,documento,motivo,{new_col_name}\nTeste Silva,12345678900,Teste Motivo,ValorSurpresa"
    
    files = {
        "file": ("teste_dinamico.csv", io.BytesIO(csv_content.encode('utf-8')), "text/csv")
    }
    
    print("--- INICIANDO TESTE DE UPLOAD COM NOVA COLUNA ---")
    response = client.post("/upload", files=files)
    
    if response.status_code != 200:
        print(f"ERRO NO UPLOAD: {response.status_code}")
        print(response.json())
        sys.exit(1)
        
    print("Upload realizado com sucesso.")
    print("Verificando banco de dados...")
    
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('people_records')]
    
    if new_col_name in columns:
        print(f"SUCESSO: Coluna '{new_col_name}' foi criada na tabela!")
    else:
        print(f"FALHA: Coluna '{new_col_name}' NÃO encontrada. Colunas atuais: {columns}")
        sys.exit(1)
        
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT nome, {new_col_name} FROM people_records WHERE nome = 'Teste Silva' ORDER BY id DESC LIMIT 1")).first()
        if result:
            print(f"Dados encontrados no DB: Nome={result[0]}, {new_col_name}={result[1]}")
            if result[1] == "ValorSurpresa":
                print("SUCESSO DB: Valor da nova coluna persistido corretamente!")
            else:
                print(f"FALHA DB: Valor incorreto. Esperado 'ValorSurpresa', obtido '{result[1]}'")
        else:
            print("FALHA DB: Registro não encontrado.")

    print("\n--- VERIFICANDO API (GET /records) ---")
    response = client.get(f"/records?search=Teste Silva")
    if response.status_code == 200:
        data = response.json()
        items = data.get("items", [])
        if items:
            record = items[0]
            if new_col_name in record:
                print(f"SUCESSO API: Coluna Dinâmica '{new_col_name}' encontrada na resposta da API!")
                print(f"Valor: {record[new_col_name]}")
            else:
                print(f"FALHA API: Coluna '{new_col_name}' NÃO está presente na resposta JSON.")
                print("Chaves encontradas:", record.keys())
        else:
            print("FALHA API: Nenhum registro retornado na busca.")
    else:
        print(f"FALHA API: Erro {response.status_code}")

if __name__ == "__main__":
    verify_dynamic_columns()
