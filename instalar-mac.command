#!/usr/bin/env bash
# Duplo clique no Mac: roda o instalar.sh
cd "$(dirname "$0")" || exit 1
bash ./instalar.sh
echo
read -r -p "Pressione Enter para fechar esta janela..." _
