@echo off
chcp 65001 >nul
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

echo Encerrando servidor em segundo plano (Do Zero ao Canada)...
"%APP_DIR%\DoZeroAoCanada.exe" --stop
echo Servidor em segundo plano encerrado com sucesso.
timeout /t 2

