# Histórico de alterações

As versões e datas abaixo descrevem a evolução do projeto. Consulte também o README, os avisos de terceiros e as licenças dos modelos antes de instalar ou usar componentes opcionais.

## [2.1.0] — Preparação para publicação

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
