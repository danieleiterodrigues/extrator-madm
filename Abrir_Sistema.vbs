Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' --------------------------
' 1. Iniciar Backend (Python)
' --------------------------
WshShell.CurrentDirectory = strPath & "\backend"
' Usa o python do ambiente virtual diretamente para evitar janelas extras
cmdBackend = "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
WshShell.Run cmdBackend, 0, False

' --------------------------
' 2. Iniciar Frontend (Vite)
' --------------------------
WshShell.CurrentDirectory = strPath & "\Extrator"
' Executa npm run dev via cmd silencioso
cmdFrontend = "cmd /c npm run dev"
WshShell.Run cmdFrontend, 0, False

' --------------------------
' 3. Aguardar e Abrir Navegador
' --------------------------
' Aguarda 5 segundos para garantir que os servidores subam
WScript.Sleep 5000 
WshShell.Run "http://localhost:3000"

' Aviso opcional (comentado para ser totalmente silencioso)
' MsgBox "Sistema inicializado em segundo plano!", 64, "Extrator"
