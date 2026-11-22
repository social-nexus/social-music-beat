#!/usr/bin/env bash
# Social Music Beat - liga o motor de musica e o servidor da interface (equivalente ao iniciar.bat)
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$AQUI/_comum.sh"
. "$AQUI/config.sh"
mkdir -p "$AQUI/logs"

if [ ! -x "$AQUI/helper/.venv/bin/python" ]; then
  echo "O Social Music Beat ainda nao foi instalado. Rode o instalar.sh primeiro."
  exit 1
fi
if [ ! -f "$ACESTEP_DIR/pyproject.toml" ]; then
  echo "Nao encontrei o ACE-Step em $ACESTEP_DIR. Veja o config.sh."
  exit 1
fi

# Motor de musica (ACE-Step) na porta 8001
if porta_aberta 8001; then
  echo "O motor de musica ja esta ligado."
else
  (
    cd "$ACESTEP_DIR" || exit 1
    export ACESTEP_PROJECT_ROOT="$ACESTEP_DIR" ACESTEP_ON_DEMAND_MODEL_LOAD=true CHECK_UPDATE=false
    if [ "$SISTEMA" = linux ] && [ -f start_api_server.sh ]; then
      CMD=(bash ./start_api_server.sh)
    elif [ "$SISTEMA" = mac ] && [ "$ARCH" = arm64 ] && [ -f start_api_server_macos.sh ]; then
      CMD=(bash ./start_api_server_macos.sh)
    else
      CMD=(uv run acestep-api)
    fi
    nohup "${CMD[@]}" >"$AQUI/logs/acestep.log" 2>&1 &
    echo $! >"$AQUI/logs/acestep.pid"
  )
fi

# Servidor da interface e do separador de voz (porta 8002)
if porta_aberta 8002; then
  echo "O servidor da interface ja esta ligado."
else
  ( cd "$AQUI/helper" && nohup .venv/bin/python server.py >"$AQUI/logs/servidor.log" 2>&1 & echo $! >"$AQUI/logs/servidor.pid" )
fi

if esperar_porta 8002 60; then
  abrir_janela "http://localhost:8002"
  echo "Pronto. Na primeira vez o motor de musica demora alguns minutos para ligar."
  echo "Logs: $AQUI/logs   |   Para encerrar tudo: parar.sh"
else
  echo "O servidor nao respondeu a tempo. Veja o erro em: $AQUI/logs/servidor.log"
  exit 1
fi
