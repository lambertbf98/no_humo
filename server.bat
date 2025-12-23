@echo off
echo.
echo ===============================================
echo   SMOKETRACK - Servidor Local
echo ===============================================
echo.
echo Abriendo la app en tu navegador...
echo.
echo Para verla en tu movil Android:
echo   1. Conecta el movil a la misma WiFi
echo   2. Abre Chrome en el movil
echo   3. Escribe la IP que aparece abajo
echo.
echo -----------------------------------------------

cd /d "%~dp0"

REM Intentar con Python 3
python -m http.server 8080 2>nul
if %errorlevel% neq 0 (
    REM Intentar con Python 2
    python -m SimpleHTTPServer 8080 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Python no encontrado.
        echo.
        echo Alternativas:
        echo   1. Instala Python desde python.org
        echo   2. O abre index.html directamente en Chrome
        echo      y usa F12 para simular movil
        echo.
        pause
    )
)
