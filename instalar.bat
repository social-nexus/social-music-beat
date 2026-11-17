@echo off
chcp 65001 >nul
set HF_HUB_DISABLE_SYMLINKS_WARNING=1
call "%~dp0config.bat"
echo ==================================================
echo  Social Sound Beat - instalacao completa
echo ==================================================
if not exist "%ACESTEP_DIR%\start_api_server.bat" goto sem_acestep

echo.
echo [1/5] Criando o ambiente do separador de voz (Python 3.11)...
cd /d "%~dp0helper"
py -3.11 -m venv .venv
if errorlevel 1 goto sem_python
call .venv\Scripts\activate
python -m pip install --upgrade pip

echo.
echo [2/5] Instalando os programas do separador de voz (cerca de 0,5 GB)...
pip install -r requirements.txt
if errorlevel 1 goto falha

echo.
echo [3/5] Instalando o Whisper da aba de legendas (modo Preciso)...
pip install faster-whisper "numpy==1.26.4"
if errorlevel 1 echo AVISO: nao consegui instalar o Whisper. O modo Rapido das legendas funciona sem ele. Rode este instalar.bat de novo mais tarde.

echo.
echo [4/5] Baixando os modelos de voz: separador de voz e Whisper base (cerca de 150 MB)...
python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Whisper base ok')"
if errorlevel 1 echo AVISO: o modelo Whisper sera baixado no primeiro uso do modo Preciso.

echo.
echo [5/5] Baixando os modelos de musica do ACE-Step (varios GB, pode demorar)...
cd /d "%ACESTEP_DIR%"
set ACESTEP_PROJECT_ROOT=%ACESTEP_DIR%
"%ACESTEP_DIR%\python_embedded\python.exe" -c "import sys,runpy; sys.path.insert(0, r'%ACESTEP_DIR%'); sys.argv=['d']; runpy.run_module('acestep.model_downloader', run_name='__main__')"
"%ACESTEP_DIR%\python_embedded\python.exe" -c "import sys,runpy; sys.path.insert(0, r'%ACESTEP_DIR%'); sys.argv=['d','--model','acestep-v15-base']; runpy.run_module('acestep.model_downloader', run_name='__main__')"

echo.
echo Pronto! Agora use o iniciar.bat
pause
exit /b 0

:sem_acestep
echo.
echo NAO ENCONTREI o ACE-Step em: %ACESTEP_DIR%
echo Extraia o pacote do ACE-Step nessa pasta ou edite o arquivo config.bat com o caminho certo. Depois rode este instalar.bat de novo.
pause
exit /b 1

:sem_python
echo.
echo Python 3.11 nao encontrado. Instale em python.org e marque "Add python.exe to PATH". Depois rode este instalar.bat de novo.
pause
exit /b 1

:falha
echo.
echo A instalacao falhou. Leia a mensagem acima e tente de novo.
pause
exit /b 1
