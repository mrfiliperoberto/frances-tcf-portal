@echo off
chcp 65001 >nul
title Instalador Desktop e Background - Do Zero ao Canada
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

echo ========================================================
echo   DO ZERO AO CANADA - INSTALADOR DESKTOP E BACKGROUND
echo ========================================================
echo.

echo [1/3] Criando atalho na Area de Trabalho e no Startup do Windows...
cscript //nologo "%APP_DIR%\desktop\install-shortcuts.vbs"

echo [2/3] Iniciando servidor invisivel em segundo plano e abrindo o aplicativo...
start "" "%APP_DIR%\DoZeroAoCanada.exe"

echo.
echo ========================================================
echo   CONCLUIDO COM SUCESSO!
echo   - Atalho criado na sua Area de Trabalho: "Do Zero ao Canada"
echo   - Servidor invisivel ativado no Startup do Windows
echo   - Voce nunca mais precisa abrir o terminal ou rodar npm run dev!
echo ========================================================
timeout /t 4
