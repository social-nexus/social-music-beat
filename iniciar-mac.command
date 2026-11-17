#!/usr/bin/env bash
# Duplo clique no Mac: roda o iniciar.sh
cd "$(dirname "$0")" || exit 1
bash ./iniciar.sh
echo
read -r -p "Pressione Enter para fechar esta janela..." _
