# Histórico de alterações

## [3.1.0] — Em desenvolvimento

### Implementado até agora
- Branch de desenvolvimento criada diretamente da tag estável `v3.0.0`, sem alterar a versão estável.
- Preferência persistente de idioma da interface iniciada: Português do Brasil, English e Español.
- Primeiras traduções aplicadas à navegação, avisos do motor, títulos principais, estado vazio da biblioteca e seletor de idioma da música.
- Cronômetro do compositor durante geração, instalação/download/ativação de modelos, análise de referência melódica e transcrição Whisper.
- Reforço dos prompts multilíngues para Qwen/Gemma e APIs: título, descrições e letra seguem o idioma escolhido, mantendo tags estruturais em inglês.
- Testes de regressão para português do Brasil, inglês e espanhol.
- Faixas passam a guardar o idioma vocal selecionado; a criação posterior de banda reutiliza o idioma da faixa original, sem depender da seleção atual do formulário.
- Cronômetro das operações de áudio visível também em dispositivos móveis e ao navegar entre abas; o tempo final permanece na tela após a conclusão.
- Versão do pacote da interface atualizada para `3.1.0`.

### Em andamento
- Tradução integral de todas as telas, modais, mensagens, erros e instruções.
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
