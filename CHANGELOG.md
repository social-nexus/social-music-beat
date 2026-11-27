# Histórico de alterações

## [3.1.0]
- Fail closed on malformed library metadata instead of silently treating corruption as an empty library; validate batch IDs as non-empty strings.
- Serialize backend Demucs separation jobs so concurrent requests queue safely instead of using the model at the same time.
- Persist multi-version song generation as a single library batch; clean up all downloaded files if the batch fails.
- Save downloaded generated audio through a temporary file and atomic rename to avoid partially written library files.
- Register separated vocal and instrumental stems together, preventing partial library updates.
- Clean up downloaded audio when library persistence fails, without deleting audio referenced by library metadata.
- Tradução para inglês e espanhol de mensagens de estado do compositor, runtime, gestão de chaves, análise musical, importação de modelos e confirmação do resultado da composição, incluindo nome do modelo usado.
- Correção de inconsistências de catálogo: adicionadas chaves de instrumentos/faixas que faltavam nos idiomas e normalizada a paridade PT/EN/ES.
- Teste de i18n agora também detecta chaves duplicadas no código-fonte.

- Catálogos PT-BR/EN/ES extraídos para módulo próprio, com teste automatizado de paridade de chaves, idiomas obrigatórios e fallback.
- Correção de compilação durante a refatoração de i18n: removida declaração duplicada de `uiText`.
- Auditoria de diagnóstico: mensagens técnicas inesperadas preservadas para facilitar suporte, com regra explícita de traduzir apenas erros previsíveis/controlados pela interface.
- Revisão adicional de labels na biblioteca: download localizado e texto espanhol de separação refinado.
 — Em desenvolvimento

- Polling de tarefas ACE-step e legendas agora detecta estados desconhecidos e encerra com mensagem localizada, evitando loops infinitos em status inválidos.\n\n- Exclusão de faixa da Biblioteca agora é transacional: o áudio é movido temporariamente antes da atualização de metadados e restaurado quando a gravação falha; escrita JSON atômica e testes de falha incluídos.\n\n- Corrigido o salvamento de faixas geradas para usar o caminho local retornado pela API, evitando registrar URLs temporárias do ACE-step; novas faixas só aparecem na UI após persistência confirmada. Resultado de separação incompleto agora é rejeitado.\n\n- Separação Demucs agora grava os dois stems em arquivos temporários e promove os resultados em conjunto; falha no segundo arquivo remove o primeiro e limpa temporários. Teste de rollback adicionado.\n\n- Biblioteca test harness now stubs the unrelated subtitle router so backend library tests run without optional NumPy/audio dependencies.\n\n### Implementado até agora
- Branch de desenvolvimento criada diretamente da tag estável `v3.0.0`, sem alterar a versão estável.
- Preferência persistente de idioma da interface iniciada: Português do Brasil, English e Español.
- Tradução ampliada para as três línguas na criação musical, ajuda, compositor IA, configuração de provedores/modelos, modais Cantar por cima e Legendas, validações locais, análise melódica, categorias musicais e nomes dos 55 estilos predefinidos.
- Cronômetro do compositor durante geração, instalação/download/ativação de modelos, análise de referência melódica e transcrição Whisper.
- Cronômetro de geração de legendas SRT/LRC, com tempo decorrido e duração final após conclusão ou falha.
- Reforço dos prompts multilíngues para Qwen/Gemma e APIs: título, descrições e letra seguem o idioma escolhido, mantendo tags estruturais em inglês.
- Cabeçalhos do resultado (título, estilo, configurações e letra) localizados para português, inglês e espanhol.
- Testes de regressão para português do Brasil, inglês e espanhol.
- Faixas passam a guardar o idioma vocal selecionado; a criação posterior de banda e as faixas derivadas preservam o idioma original, sem depender da seleção atual do formulário.
- Cronômetro das operações de áudio visível também em dispositivos móveis e ao navegar entre abas; o tempo final permanece na tela após a conclusão.
- Versão do pacote da interface atualizada para `3.1.0`.

### Em andamento
- Tradução de status da separação Demucs (fila, carregamento e execução) para PT-BR, EN e ES.
- Revisão dos fluxos de áudio: fases de separação/salvamento e nomes de faixas derivadas localizados para PT-BR, inglês e espanhol.
- Revisão final de textos dinâmicos vindos do backend/provedores, acessibilidade e extração dos catálogos de idioma para arquivos próprios.
- Revisão e testes multilíngues dos prompts Qwen/Gemma e dos parâmetros de idioma vocal do ACE-Step.
- Testes automatizados e validação de geração real antes da publicação.

> Esta versão ainda não está pronta para distribuição. Acompanhe o plano em [docs/PLANO-VERSAO-3.1.0.md](docs/PLANO-VERSAO-3.1.0.md).


As versões e datas abaixo descrevem a evolução do projeto. Consulte também o README, os avisos de terceiros e as licenças dos modelos antes de instalar ou usar componentes opcionais.

## [3.0.0] — Grande atualização: compositor com IA e novos fluxos de instalação

### Novidades
- Compositor opcional de letras com IA local usando llama.cpp e modelos GGUF Qwen3 e Gemma 3.
- Integração opcional com provedores de IA por API, com credenciais armazenadas pelo cofre do sistema operacional.
- Fluxos para música completa, continuação de composição e criação de refrão.
- Melhorias no instalador do Windows para localizar ou baixar automaticamente o ACE-Step 1.5 portátil.
- Gerenciamento de armazenamento compartilhado de modelos, com cópia verificada por SHA-256 e junction NTFS no Windows.
- Scripts de instalação, inicialização e encerramento para Linux e macOS.
- Documentação de licenças, avisos de terceiros e validações automatizadas em diferentes plataformas.

### Melhorias e correções
- Verificação de integridade dos downloads de runtime e modelos GGUF por SHA-256.
- Proteção para não gravar chaves de API em texto simples quando o cofre seguro do sistema não estiver disponível.
- Tratamento de falhas de instalação para preservar arquivos temporários necessários à recuperação.
- Atualização da documentação para distinguir testes reais no Windows de verificações automatizadas e validação comunitária pendente em Linux/macOS.

### Observações
- O compositor local e os provedores por API são opcionais; a criação musical principal continua usando o ACE-Step.
- A instalação completa e a geração de áudio em Linux/macOS ainda precisam de validação prática em hardware dessas plataformas.
- A disponibilidade de uso comercial e a proteção autoral das músicas geradas dependem dos termos do modelo/ferramenta, da contribuição humana, dos materiais utilizados e das regras de cada plataforma. Consulte o guia **CUIDADO, LEIA ANTES DE CRIAR**.

## [2.0.0]
- Versão anterior publicada no repositório principal. Consulte a tag/release correspondente para o histórico e os arquivos daquela versão.

- Localizadas mensagens de confirmação de remoção de API Key e validações de gravação/transcrição Whisper nos três idiomas.


### Auditoria de interface — legendas e Biblioteca
- Tradução centralizada dos metadados de legendas, confirmação de exclusão e etiqueta de separação da banda em PT-BR, inglês e espanhol.
- Testes de i18n ampliados para garantir os valores exatos em cada idioma.


### Erros genéricos de geração localizados
- Mensagens de falha de criação, ausência de áudio e validações de letra/estilo centralizadas para PT-BR, inglês e espanhol.
- Diagnósticos técnicos do backend continuam sendo exibidos sem tradução destrutiva.


### Ajustes adicionais de localização
- Textos de configuração do Whisper, validação de letra vazia e timer do compositor centralizados nos catálogos PT-BR/EN/ES.
- Mensagens de ausência de áudio e faixa somente banda também reutilizam as traduções centralizadas.


### Fases de geração centralizadas
- Status da geração musical e separação de áudio agora usam catálogo único de traduções, com testes explícitos em três idiomas.


### Estados inesperados de tarefas
- Prevenção de tarefas globais simultâneas e encerramento explícito de polling com status desconhecido.


### Exclusão com restauração em falha
- Falhas ao excluir recarregam a Biblioteca para sincronizar estado real do servidor; se essa recarga falhar, restaura-se a faixa/player localmente.
