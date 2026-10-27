@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (echo Python is not installed or not in PATH. Install Python 3.11+ and enable Add Python to PATH. & pause & exit /b 1)
if not exist ".venv\Scripts\python.exe" py -3 -m venv .venv
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (echo Dependency installation failed. Read the error above. & pause & exit /b 1)
start "Data Structures Learning World" http://127.0.0.1:5000
".venv\Scripts\python.exe" app.py
pause
