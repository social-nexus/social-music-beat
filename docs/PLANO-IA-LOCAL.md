# Plano técnico — IA local para composição de letras

## Objetivo

Adicionar ao Social Music Beat um compositor de letras com modelos de linguagem executados localmente. A funcionalidade será opcional: a ferramenta continua funcionando sem baixar ou selecionar um modelo de texto.

## Decisões de arquitetura

1. **Motor de inferência:** llama.cpp, distribuído como componente da aplicação por plataforma. O usuário não precisará instalar Ollama, Python adicional ou outro gerenciador de modelos.
2. **Formato inicial de modelos:** GGUF, com catálogo curado e metadados por modelo.
3. **Integração:** módulo independente em `helper/ia_local/`, controlado pelo servidor FastAPI já existente.
4. **Interface:** nova área “Compositor de letras”, separada da criação musical. A letra aprovada poderá ser enviada ao formulário atual sem alterar o fluxo ACE-Step.
5. **Armazenamento:** binários e modelos fora da pasta de código, em diretório de dados do usuário; nunca dentro de `helper/musicas/`.
6. **Distribuição:** não incluir pesos de modelos no ZIP inicial. Downloads opcionais a partir das fontes oficiais, com licença, origem, tamanho e hash publicados no catálogo.
7. **Compatibilidade:** CPU como caminho de fallback; aceleração por GPU será selecionada conforme binário/backend disponível. A aplicação deve explicar requisitos e não presumir que toda GPU NVIDIA terá VRAM suficiente.

## Componentes planejados

- **Runtime manager:** detectar plataforma/arquitetura, localizar o executável empacotado, iniciar/parar o servidor local, monitorar saúde e evitar processos duplicados.
- **Model registry:** catálogo versionado com nome, família, quantização, tamanho, URL oficial, hash SHA-256, licença, atribuições, contexto recomendado e requisitos aproximados.
- **Model manager:** baixar com progresso, suportar cancelamento e retomada, validar SHA-256, importar GGUF existente e remover modelos selecionados pelo usuário.
- **Inference service:** enviar prompt ao endpoint local compatível com API de chat, controlar parâmetros e devolver somente a resposta validada.
- **Composer UI:** formulário em português, prompt mestre versionado, geração, edição/revisão e ação “Usar esta letra no ACE-Step”.

## Rotas API propostas

- `GET /api/ai/status` — disponibilidade do runtime, modelo ativo e estado.
- `GET /api/ai/models` — catálogo e modelos locais detectados.
- `POST /api/ai/models/download` — iniciar download de um modelo do catálogo.
- `POST /api/ai/models/import` — validar/importar caminho GGUF escolhido.
- `POST /api/ai/models/activate` — ativar um modelo instalado.
- `DELETE /api/ai/models/{model_id}` — remover modelo local selecionado.
- `POST /api/ai/generate-lyrics` — gerar letra com parâmetros e prompt controlados.
- `POST /api/ai/runtime/stop` — encerrar o motor local.

As rotas de escrita devem validar caminhos e IDs contra o catálogo; nunca aceitar comandos de shell enviados pela interface.

## Regras de segurança e confiabilidade

- Vincular o serviço local somente a `127.0.0.1`, não à rede pública.
- Não executar arquivos ou comandos vindos de prompts, nomes de modelos ou respostas do LLM.
- Restringir importação a arquivos GGUF e validar tamanho/caminho.
- Downloads somente de URLs HTTPS previamente cadastradas no catálogo.
- Validar SHA-256 antes de considerar um download concluído.
- Manter logs sem registrar letras completas ou dados pessoais por padrão.
- Tratar saída do modelo como conteúdo não confiável; validar o formato antes de preencher os campos da interface.
- Limpar processos e arquivos temporários ao encerrar ou após falhas.

## Licenciamento

- O código do llama.cpp e cada binário redistribuído devem manter seus avisos e textos de licença.
- Cada modelo terá licença própria, link para os termos oficiais e obrigações de atribuição. Não assumir que todos os modelos de uma mesma família usam a mesma licença.
- Não redistribuir pesos por padrão. O catálogo aponta para a fonte original e informa ao usuário os termos antes do download.
- Criar/atualizar `THIRD_PARTY_NOTICES.md` e `MODEL_LICENSES.md` quando forem definidos os binários e modelos concretos.
- A inclusão de qualquer modelo no catálogo depende de revisão da licença daquela versão e do arquivo específico.

## Estado da implementação (branch de desenvolvimento)

- [x] Branch isolada `feature/ia-local-compositor`.
- [x] Módulo FastAPI independente em `helper/ia_local.py`.
- [x] Runtime llama.cpp fixado no release `b12359`, com SHA-256 por pacote.
- [x] Download e extração com validação de hash, limites de tamanho e proteção contra path traversal.
- [x] Catálogo inicial Qwen3-4B GGUF Q4_K_M, com verificação de hash LFS consultado no Hugging Face.
- [x] Importação manual de arquivos GGUF.
- [x] Inicialização local em `127.0.0.1:8010`, desligamento e encerramento no fim do processo.
- [x] Endpoint de composição e primeira interface React.
- [x] Testes unitários básicos e workflow CI para compilação Python e build da interface.
- [ ] Teste real de download, ativação e geração no Windows.
- [ ] Testes em Linux/macOS e com aceleração de GPU.
- [ ] Catálogo de Gemma e outros modelos após revisão das licenças e requisitos de acesso.
- [ ] Progresso/cancelamento/retomada de downloads e gestão avançada de modelos.

### Fase 1 — Base segura
- Criar branch de desenvolvimento.
- Corrigir referências inconsistentes dos scripts Linux/macOS.
- Documentar arquitetura, requisitos e licenças.

### Fase 2 — Runtime
- Escolher versões e artefatos oficiais do llama.cpp por sistema operacional e arquitetura.
- Empacotar o runtime sem exigir instalação externa.
- Implementar ciclo de vida, health check e fallback CPU.
- Testar inicialização, encerramento e recuperação de falhas.

### Fase 3 — Modelos
- Publicar catálogo inicial pequeno e legalmente verificado.
- Implementar download, progresso, cancelamento, hash, importação e remoção.
- Exibir estimativas de RAM/VRAM e alertas de incompatibilidade.

### Fase 4 — Compositor
- Criar rotas FastAPI e interface.
- Implementar prompt mestre de composição em PT-BR.
- Gerar título, estilo, configurações e letra estruturada.
- Permitir revisar e enviar a letra ao formulário atual.

### Fase 5 — Validação e distribuição
- Testar em instalação limpa Windows, Linux e macOS.
- Testar CPU e aceleração disponível; não exigir GPU.
- Testar ausência de modelo, download interrompido, hash inválido, modelo incompatível e encerramento inesperado.
- Atualizar manual, README, avisos de terceiros e instruções de empacotamento.

## Escopo inicial recomendado

Começar com Windows x64 e backend CPU funcional, mantendo a arquitetura preparada para CUDA, Vulkan e macOS. Depois validar os pacotes de cada plataforma. O catálogo inicial deve priorizar modelos pequenos/instrucionais que gerem letras bem em português, após confirmação da licença e da qualidade em testes reais.
