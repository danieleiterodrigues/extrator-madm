import requests
import os

# Create a dummy file
with open("test_upload.csv", "w") as f:
    f.write("nome,documento,motivo\nTeste,12345678900,Teste Motivo")

url = "http://localhost:8000/upload"
files = {'file': open('test_upload.csv', 'rb')}

try:
    print(f"Attempting upload to {url}...")
    response = requests.post(url, files=files) 
    # Note: requests automatically sets Content-Type to multipart/form-data with boundary
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")

# Cleanup
# os.remove("test_upload.csv")
