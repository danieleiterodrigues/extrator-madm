import time
import pandas as pd
import os
import sys
from datetime import datetime

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import utils

def generate_large_csv(filename="perf_test.csv", rows=10000):
    print(f"Generating {rows} rows CSV...")
    data = []
    for i in range(rows):
        data.append({
            "nome": f"Person {i}",
            "data_nascimento": "01/01/1980",
            "documento": f"123456789{i}",
            "motivo": "Acidente Teste",
            "extra_col": "Extra Data"
        })
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)
    print("CSV Generated.")
    return filename

def benchmark_parsing(file_path):
    print(f"Benchmarking parse_file with {file_path}...")
    start = time.time()
    records = utils.parse_file(file_path)
    end = time.time()
    duration = end - start
    print(f"Parsing took: {duration:.4f} seconds for {len(records)} records.")
    return records

def benchmark_validation_loop(records):
    print("Benchmarking validation loop (CPU only)...")
    start = time.time()
    
    # Validation Logic from main.py
    norm_text = utils.normalize_text
    norm_date = utils.normalize_date
    norm_digits = utils.normalize_digits
    
    known_keys = {"nome", "data_nascimento", "nascimento", "data_de_nascimento", "documento", "cpf", "rg", "telefone", "celular", "contato", "motivo", "motivo_acidente", "descricao", "agente_causador", "descrição_da_situação_geradora_do_acidente_ou_doença"}
    
    processed_count = 0
    current_batch = []
    BATCH_SIZE = 2000
    
    for data in records:
        nome = norm_text(data.get("nome"))
        dt_val = data.get("data_nascimento")
        data_nascimento = norm_date(dt_val)
        doc_val = data.get("documento")
        documento = norm_digits(doc_val)
        mot_val = data.get("motivo")
        motivo = norm_text(mot_val)
        
        is_valid = True
        errors = []
        
        if not nome: is_valid = False
        if not data_nascimento: is_valid = False
        if not documento: is_valid = False
        
        if not motivo:
            extra_content = False
            for k, v in data.items():
                if v and k.lower() not in known_keys:
                    extra_content = True
                    break
            if extra_content:
                motivo = "Conteúdo em Colunas Extras"
            else:
                is_valid = False
            
        record_entry = data.copy()
        record_entry['nome'] = nome
        # ... skip other assignments for brevity, just simulating CPU work ...
        
        current_batch.append(record_entry)
        if len(current_batch) >= BATCH_SIZE:
            current_batch = []
            
    end = time.time()
    duration = end - start
    print(f"Validation loop took: {duration:.4f} seconds.")

if __name__ == "__main__":
    start_total = time.time()
    csv_file = generate_large_csv(rows=20000)
    try:
        records = benchmark_parsing(csv_file)
        benchmark_validation_loop(records)
    finally:
        if os.path.exists(csv_file):
            os.remove(csv_file)
    print(f"Total Benchmark Time: {time.time() - start_total:.4f}s")
