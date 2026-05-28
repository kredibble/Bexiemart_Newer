@echo off
set MAESTRO_BIN=%USERPROFILE%\.maestro\maestro\bin\maestro.bat
if exist "%MAESTRO_BIN%" (
    "%MAESTRO_BIN%" test tests\e2e
) else (
    echo Maestro is not installed at %MAESTRO_BIN%.
    exit /b 1
)
