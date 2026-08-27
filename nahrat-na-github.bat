@echo off
chcp 65001 > nul
title Tak tudy! - Nahrani na GitHub
echo ========================================================
echo   Tak tudy! - Nahravani na GitHub: jana-pr/taktudy
echo ========================================================
echo.

set REPO_URL=https://github.com/jana-pr/taktudy.git

echo 1. Nastavuji adresu repozitare: %REPO_URL%
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" remote remove origin 2>nul
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" remote add origin %REPO_URL%
"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" branch -M main

echo.
echo 2. Odesilam kod na GitHub...
echo    (Pokud se otevre male prihlasovaci okno nebo prohlizec,
echo     staci kliknout na 'Sign in with your browser' a potvrdit).
echo.

"C:\Users\prosk\AppData\Local\MinGit\cmd\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   HOTOVO! Kod byl uspesne nahran na GitHub!
    echo   Nyni muzete toto okno zavrit.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   Nahravani se nezdarilo nebo bylo preruseno.
    echo ========================================================
)
echo.
pause
