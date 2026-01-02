@echo off
echo ==========================================
echo      PARANDO SISTEMA EXTRATOR - MADM
echo ==========================================
echo.
echo Matando processos Python (Backend)...
taskkill /F /IM python.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo - Python encerrado com sucesso.
) else (
    echo - Nenhum processo Python encontrado ou erro ao encerrar.
)

echo.
echo Matando processos Node/Vite (Frontend)...
taskkill /F /IM node.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo - Node encerrado com sucesso.
) else (
    echo - Nenhum processo Node encontrado ou erro ao encerrar.
)

echo.
echo ==========================================
echo Sistema parado.
echo ==========================================
ping 127.0.0.1 -n 3 > nul
