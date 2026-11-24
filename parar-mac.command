#!/usr/bin/env bash
# Duplo clique no Mac: encerra os servidores usando o script compartilhado.
cd "$(dirname "$0")" || exit 1
bash ./parar-linux.sh
echo
read -r -p "Pressione Enter para fechar esta janela..." _
