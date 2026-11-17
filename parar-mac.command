#!/usr/bin/env bash
# Duplo clique no Mac: roda o parar.sh
cd "$(dirname "$0")" || exit 1
bash ./parar.sh
echo
read -r -p "Pressione Enter para fechar esta janela..." _
