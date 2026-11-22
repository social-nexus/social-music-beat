#!/usr/bin/env bash
# Encerra o motor de musica e o servidor da interface, liberando a memoria da placa de video.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$AQUI/_comum.sh"
encerrar_pidfile "$AQUI/logs/acestep.pid"
encerrar_pidfile "$AQUI/logs/servidor.pid"
for p in 8001 8002; do encerrar_porta "$p"; done
echo "Social Music Beat encerrado."
