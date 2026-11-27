# Plano de desenvolvimento — Social Music Beat 3.1.0

## Base e estratégia

- Versão-base: tag imutável `v3.0.0`.
- Branch de trabalho: `release/3.1.0`.
- A tag e a branch principal não são alteradas nesta etapa.
- A versão 3.1.0 só deve ser publicada depois de testes de interface, API, geração ACE-Step, separação Demucs e compositor local/API.

## Escopo aprovado

1. Cronômetros de operações demoradas, com tempo real desde o início até o término.
2. Idioma da interface: Português do Brasil, English e Español.
3. Idioma do conteúdo musical independente do idioma da interface.
4. Compositor Qwen/Gemma e provedores por API orientados explicitamente ao idioma solicitado.
5. ACE-step recebe o idioma vocal correto para a geração cantada.

## Situação técnica encontrada na v3.0.0

- A interface já tinha um cronômetro geral para tarefas executadas por `runJob`, incluindo geração musical, separação e criação de banda/instrumentação.
- O compositor já permitia escolher português do Brasil, inglês e espanhol para as letras, e o backend já instruía o modelo a responder no idioma solicitado.
- O formulário de música já enviava `vocal_language` com os códigos `pt`, `en` e `es` ao ACE-Step.
- A interface ainda não possuía uma preferência independente e persistente de idioma.

## Implementado nesta etapa

- Criada a branch `release/3.1.0` diretamente do commit apontado pela tag `v3.0.0`.
- Adicionada preferência de idioma da interface com persistência local, com opções Português do Brasil, English e Español.
- Camada central de textos ampliada para português do Brasil, inglês e espanhol, cobrindo navegação, criação musical, ajuda, compositor IA, seleção/instalação de modelos, configuração de provedores, janelas de voz e legendas, mensagens de validação e análise melódica.
- Categorias musicais e nomes dos 55 estilos predefinidos também localizados para inglês e espanhol, sem alterar os prompts técnicos enviados ao ACE-Step.
- Timer do compositor de letras: relógio cobre geração de letras, instalação/download/ativação do modelo, análise da referência melódica e transcrição Whisper, e permanece visível no painel de status durante a operação.
- Timer próprio para geração de legendas SRT/LRC, com tempo durante o processamento e duração final após concluir ou falhar.
- Prompt multilíngue Qwen/Gemma/API reforçado com instruções explícitas para escrever título, valores descritivos e letra no idioma escolhido (português brasileiro, inglês ou espanhol), mantendo tags estruturais em inglês.
- Cabeçalhos do resultado da composição (título, estilo, configurações e letra) agora acompanham o idioma escolhido.
- Testes de regressão adicionados para as três diretivas de idioma e rejeição de idiomas não suportados.
- Timer de operações de áudio: indicador da tarefa fica visível no layout principal, inclusive em telas móveis e ao navegar entre abas.
- Ao terminar uma tarefa de áudio, o tempo total permanece visível até a próxima operação.
- Versão do pacote da interface atualizada para `3.1.0`.

## Revisão/validação desta continuação

- Adicionado `docs/TESTES-VALIDACAO-3.1.0.md`, roteiro para teste manual organizado por idioma e operação, incluindo Gemma, Qwen, ACE-Step, separação, criação de banda e cronômetros.
- A extração do catálogo inline para arquivos de idioma foi identificada como manutenção desejável, mas será feita numa etapa dedicada com teste de build e revisão de chaves. Evitar refatorar o catálogo monolítico de forma mecânica, pois há risco de regressão em strings duplicadas e chaves reutilizadas.
- Não há confirmação de geração de áudio real em pt/en/es neste ambiente; esses testes dependem do ACE-Step e dos pesos instalados no computador do usuário.

## Próximas etapas

1. **Concluído:** catálogo da interface extraído para `src/i18n.js`; PT-BR, EN e ES usam o mesmo conjunto de chaves, com teste de consistência e fallback.
2. **Em andamento:** mensagens de estado da interface para cofre de API, conexão, runtime local, download/carregamento de modelos, análise de referência musical, gravação e importação GGUF foram localizadas e traduzidas; teste agora detecta chaves duplicadas no código fonte.
3. Revisar e testar idiomas musicais em todos os fluxos ACE-step, inclusive criação de banda com voz do usuário.
4. Validar em execução real Qwen, Gemma e provedores API nos três idiomas; conferir preservação de letras originais ao continuar composição.
5. Adicionar testes automatizados para preferência de idioma, persistência, cronômetros e payloads de idioma.
6. Executar build da interface e testes Python; validar geração real em Windows antes de publicar.

## Regras de compatibilidade

- Não remover nem renomear endpoints existentes sem necessidade.
- Não alterar os pesos, runtimes ou instaladores de modelos nesta atualização.
- O idioma da interface nunca deve sobrescrever automaticamente o idioma da música.
- O idioma da música deve ser uma escolha independente do idioma visual.
- Cronômetros devem medir tempo real decorrido, sem simular porcentagens de progresso.
- Preservar a biblioteca de músicas, configurações, modelos e caminhos de armazenamento existentes.


- **Auditoria multilíngue (em andamento):** confirmação de remoção de API Key, aviso de gravação incompatível com navegador e mensagens de início/falha de transcrição Whisper agora usam catálogo PT-BR/EN/ES.

- **Auditoria dos fluxos de áudio:** mensagens de fase de separação e salvamento agora são localizadas; títulos padrão de música, banda, voz e instrumental respeitam PT-BR/EN/ES na criação e separação automática.

- Status do backend Demucs agora é traduzido na interface: fila, carregamento inicial e separação em andamento, preservando mensagens de erro técnicas para diagnóstico.


## Auditoria de mensagens de erro e diagnóstico (27/11/2026)

- CI da última revisão de localização Demucs concluído com sucesso no commit `8b375f34bd19a022e4efb6b3109a0e6a1dc30a1e`.
- Revisado o helper HTTP da interface: respostas do backend são exibidas sem apagar o detalhe técnico. Isso é importante para suporte e diagnóstico, especialmente mensagens originadas por ACE-Step, Whisper, modelos locais e bibliotecas Python.
- Regra adotada para próximos ajustes: traduzir mensagens de erro previsíveis e controladas pela interface; manter o detalhe técnico original em erros inesperados e logs. Evitar substituir mensagens do backend por genéricas, pois isso esconderia a causa real.
- A auditoria confirma cobertura de timers de geração principal, compositor, transcrição, análise de referência e legendas; validar duração real e visibilidade em execução Windows continua pendente.
- Próxima revisão: inspeção de mensagens e labels restantes que possam escapar da localização, seguida de build e testes de catálogo antes de publicar a versão.
