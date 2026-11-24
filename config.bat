@echo off
REM Caminho da instalacao do ACE-Step (os programas continuam nesta pasta).
set "ACESTEP_DIR=C:\ACE-Step-1.5"

REM Configuracao compartilhada opcional do Social Nexus.
REM Se nao existir, cada ferramenta usa seus caminhos locais padrao.
set "SOCIAL_NEXUS_MODELS_DIR="
if exist "%LOCALAPPDATA%\SocialNexus\model-storage.bat" call "%LOCALAPPDATA%\SocialNexus\model-storage.bat"

if defined SOCIAL_NEXUS_MODELS_DIR (
  set "SOCIAL_MUSIC_BEAT_MODELS_DIR=%SOCIAL_NEXUS_MODELS_DIR%\LLM"
  set "HF_HOME=%SOCIAL_NEXUS_MODELS_DIR%\HuggingFace"
  set "HF_HUB_CACHE=%SOCIAL_NEXUS_MODELS_DIR%\HuggingFace\hub"
  set "HUGGINGFACE_HUB_CACHE=%SOCIAL_NEXUS_MODELS_DIR%\HuggingFace\hub"
  set "TORCH_HOME=%SOCIAL_NEXUS_MODELS_DIR%\Torch"
  REM So ativa o caminho externo do ACE-Step se a instalacao realmente suportar a variavel.
  if exist "%ACESTEP_DIR%\acestep\model_downloader.py" (
    findstr /C:"ACESTEP_CHECKPOINTS_DIR" "%ACESTEP_DIR%\acestep\model_downloader.py" >nul
    if not errorlevel 1 set "ACESTEP_CHECKPOINTS_DIR=%SOCIAL_NEXUS_MODELS_DIR%\ACE-Step"
  )
)
