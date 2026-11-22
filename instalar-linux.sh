#!/usr/bin/env bash
# Social Music Beat - instalacao completa para Linux e macOS (equivalente ao instalar.bat)
set -u
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$AQUI/_comum.sh"
. "$AQUI/config.sh"
export HF_HUB_DISABLE_SYMLINKS_WARNING=1

perguntar() {  # perguntar "texto" -> 0 se sim (padrao sim; sem terminal, assume sim)
  local r
  [ -t 0 ] || return 0
  read -r -p "$1 [S/n] " r
  case "$r" in [nN]*) return 1 ;; *) return 0 ;; esac
}

echo "=================================================="
echo " Social Music Beat - instalacao completa"
echo "=================================================="

echo
echo "[1/6] Conferindo o uv e o ACE-Step..."
if ! command -v uv >/dev/null 2>&1; then
  echo "O ACE-Step usa o gerenciador uv (https://docs.astral.sh/uv/), que ainda nao esta instalado."
  if perguntar "Instalar o uv agora (script oficial da Astral)?"; then
    curl -LsSf https://astral.sh/uv/install.sh | sh || { echo "Nao consegui instalar o uv."; exit 1; }
  else
    echo "Sem o uv nao da para continuar. Instale e rode este instalar.sh de novo."; exit 1
  fi
fi
command -v uv >/dev/null 2>&1 || { echo "uv instalado, mas nao esta no PATH. Abra um novo terminal e rode este instalar.sh de novo."; exit 1; }

if [ ! -f "$ACESTEP_DIR/pyproject.toml" ]; then
  echo "NAO ENCONTREI o ACE-Step em: $ACESTEP_DIR"
  if command -v git >/dev/null 2>&1 && perguntar "Baixar o ACE-Step 1.5 do GitHub para essa pasta agora?"; then
    git clone https://github.com/ACE-Step/ACE-Step-1.5.git "$ACESTEP_DIR" || { echo "O download falhou."; exit 1; }
  else
    echo "Clone https://github.com/ACE-Step/ACE-Step-1.5 nessa pasta (ou edite o config.sh com o caminho certo) e rode este instalar.sh de novo."
    exit 1
  fi
fi
echo "Instalando as dependencias do ACE-Step (uv sync)..."
( cd "$ACESTEP_DIR" && uv sync ) || { echo "A instalacao do ACE-Step falhou. Leia a mensagem acima."; exit 1; }

echo
echo "[2/6] Criando o ambiente do separador de voz (Python 3.11)..."
cd "$AQUI/helper" || exit 1
PY="$(find_python)" || { dica_python; exit 1; }
"$PY" -m venv .venv || {
  echo "Nao consegui criar o ambiente. No Debian/Ubuntu instale tambem o pacote python3.11-venv."
  exit 1
}
# shellcheck disable=SC1091
. .venv/bin/activate
python -m pip install --upgrade pip

echo
echo "[3/6] Instalando os programas do separador de voz (cerca de 0,5 GB)..."
if [ "$SISTEMA" = mac ] && [ "$ARCH" = x86_64 ]; then
  echo "AVISO: Mac com Intel. O PyTorch 2.5.1 nao existe para este Mac; usando a ultima versao compativel (2.2.2)."
  grep -v -E '^(torch|torchaudio)==' requirements.txt > .requirements-intel.txt
  pip install "torch==2.2.2" "torchaudio==2.2.2" && pip install -r .requirements-intel.txt
  rc=$?; rm -f .requirements-intel.txt
  [ "$rc" -eq 0 ] || { echo "A instalacao falhou. Leia a mensagem acima."; exit 1; }
else
  pip install -r requirements.txt || { echo "A instalacao falhou. Leia a mensagem acima."; exit 1; }
fi

echo
echo "[4/6] Instalando o Whisper da aba de legendas (modo Preciso)..."
pip install faster-whisper "numpy==1.26.4" ||
  echo "AVISO: nao consegui instalar o Whisper. O modo Rapido das legendas funciona sem ele. Rode este instalar.sh de novo mais tarde."

echo
echo "[5/6] Baixando os modelos de voz: separador de voz e Whisper base (cerca de 150 MB)..."
python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Whisper base ok')" ||
  echo "AVISO: o modelo Whisper sera baixado no primeiro uso do modo Preciso."

echo
echo "[6/6] Baixando os modelos de musica do ACE-Step (varios GB, pode demorar)..."
cd "$ACESTEP_DIR" || exit 1
export ACESTEP_PROJECT_ROOT="$ACESTEP_DIR"
uv run python -m acestep.model_downloader ||
  echo "AVISO: o download dos modelos principais nao terminou. O ACE-Step tenta baixar o que falta na primeira vez que for usado."
uv run python -m acestep.model_downloader --model acestep-v15-base ||
  echo "AVISO: o download do modelo base nao terminou. Rode este instalar.sh de novo."

echo
echo "Pronto! Agora use o iniciar.sh (ou iniciar.command no Mac)."
