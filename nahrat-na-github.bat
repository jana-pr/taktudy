@echo off
chcp 65001 > nul
echo ========================================================
echo   Tak tudy! - Nahrání na GitHub
echo ========================================================
echo.
set /p REPO_URL="Vložte URL vašeho GitHub repozitáře (např. https://github.com/vase-jmeno/taktudy.git): "

if "%REPO_URL%"=="" (
    echo [CHYBA] Nebyla zadána žádná URL adresa.
    pause
    exit /b
)

echo.
echo Připojuji vzdálený repozitář...
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" remote remove origin 2>nul
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" remote add origin %REPO_URL%
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" branch -M main

echo.
echo Odesílám kód na GitHub...
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   ÚSPĚCH! Kód byl úspěšně nahrán na GitHub.
    echo   Nyní můžete přejít na https://render.com a spustit web.
    echo ========================================================
) else (
    echo.
    echo [UPOZORNĚNÍ] Pokud se zobrazila výzva k přihlášení do GitHubu, dokončete přihlášení v okně prohlížeče.
)
echo.
pause
