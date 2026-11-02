@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" goto install
py -3.13 --version >nul 2>&1
if not errorlevel 1 (
  py -3.13 -m venv .venv
  goto created
)
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
  py -3.12 -m venv .venv
  goto created
)
echo Please install Python 3.13 or 3.12 from python.org, then run this file again.
pause
exit /b 1
:created
if not exist ".venv\Scripts\python.exe" (
  echo Could not create the Python environment.
  pause
  exit /b 1
)
:install
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Installation failed. Check your internet connection and Python version.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m streamlit run app.py
pause
