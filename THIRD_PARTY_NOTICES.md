# Avisos de terceiros — IA local

## llama.cpp

- Projeto: https://github.com/ggml-org/llama.cpp
- Versão do runtime fixada nesta implementação: release `b12359`.
- Licença do código: MIT.
- Licença: https://github.com/ggml-org/llama.cpp/blob/b12359/LICENSE
- Os pacotes binários são baixados diretamente dos releases oficiais do projeto. Cada pacote está fixado por URL, tamanho esperado e SHA-256 no arquivo `helper/ia_local.py`.
- Os pacotes CUDA podem incluir DLLs de runtime NVIDIA em um arquivo auxiliar oficial separado. Esses componentes não estão cobertos pela licença MIT do llama.cpp; consulte os avisos/licenças aplicáveis da NVIDIA distribuídos com os componentes e a [CUDA EULA](https://docs.nvidia.com/cuda/eula/index.html).
- Cópia do texto MIT do llama.cpp: [licenses/LLAMA-CPP-MIT.txt](licenses/LLAMA-CPP-MIT.txt).
- O runtime não é redistribuído dentro do ZIP fonte nesta fase; o aplicativo baixa o pacote escolhido pelo usuário e valida o hash antes de instalar.

## Qwen3-4B-GGUF

- Repositório: https://huggingface.co/Qwen/Qwen3-4B-GGUF
- Arquivo inicial: `Qwen3-4B-Q4_K_M.gguf`.
- Licença informada pelo repositório oficial: Apache License 2.0.
- Licença: https://www.apache.org/licenses/LICENSE-2.0
- O modelo é baixado diretamente do Hugging Face. A aplicação consulta o hash LFS e o tamanho do arquivo no repositório antes do download e valida SHA-256 depois de baixar.
- O usuário deve observar os termos e avisos do repositório original.

## Gemma 3 4B Instruct — GGUF

- Origem do modelo base: Google Gemma 3.
- Conversão GGUF: https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF
- Termos aplicáveis: Gemma Terms of Use, https://ai.google.dev/gemma/terms
- O aplicativo não redistribui os pesos; o arquivo é obtido diretamente do repositório indicado.
- O usuário precisa confirmar que leu e aceita os termos antes de iniciar o download. Os termos não são substituídos pela licença MIT do llama.cpp.

## Modelos importados pelo usuário

A aplicação permite importar arquivos GGUF externos. Ela não verifica automaticamente a licença, procedência, segurança, arquitetura ou qualidade do modelo importado. A responsabilidade de confirmar autorização e termos de uso é do usuário.
