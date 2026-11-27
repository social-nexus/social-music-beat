# Matriz de validação — Social Music Beat 3.1.0

Este roteiro é obrigatório antes de publicar a 3.1.0. A CI verifica código e testes automatizados, mas não substitui a execução local do ACE-Step, Qwen/Gemma e Demucs.

## 1. Idioma da interface
- [ ] Português (Brasil): verificar menu, tela de criação, biblioteca, compositor, instalação de modelos, configurações, ajuda, diálogos de voz e legendas.
- [ ] English: repetir os mesmos pontos; procurar strings visivelmente em português.
- [ ] Español: repetir os mesmos pontos; procurar strings visivelmente em português/inglês.
- [ ] Trocar idioma com a aplicação aberta; confirmar atualização sem recarregar.
- [ ] Fechar e reabrir: confirmar preferência salva.
- [ ] Confirmar que idioma da interface não altera idioma da letra selecionada.

## 2. Compositor local — letras
Para cada idioma musical: Português (Brasil), English e Español.
- [ ] Gemma: gerar letra completa; verificar idioma, naturalidade, título e tags de seção.
- [ ] Gemma: continuar uma composição existente; conferir que trechos originais foram preservados.
- [ ] Gemma: gerar somente refrão; verificar que o resultado não reescreve os versos.
- [ ] Qwen: repetir os três testes acima.
- [ ] Gravar/importar referência melódica e transcrever; confirmar que a letra reconhecida não é traduzida nem alterada indevidamente.
- [ ] API externa (se configurada): verificar idioma e revisar aviso de envio de conteúdo ao provedor.

## 3. ACE-Step — áudio cantado
Executar uma geração curta em cada idioma vocal (pt, en, es), usando letra própria simples e claramente identificada:
- [ ] Português: confirmar que a voz canta em português, pronúncia compreensível e que não troca para inglês.
- [ ] Inglês: confirmar letra cantada em inglês.
- [ ] Espanhol: confirmar letra cantada em espanhol, sem alternância indesejada.
- [ ] Comparar payload enviado com o código de idioma esperado: pt / en / es.
- [ ] Criar versões com voz e instrumental; confirmar que a opção instrumental não produz vocal.
- [ ] Testar 2 versões, quando o hardware comportar.

## 4. Separação e criação de banda
- [ ] Separar voz e instrumental de uma faixa criada em cada idioma.
- [ ] Confirmar que os arquivos resultantes são salvos e aparecem na biblioteca.
- [ ] Usar “Cantar por cima” em uma gravação de voz; conferir que o idioma da faixa derivada preserva o idioma da original.
- [ ] Criar banda e, se habilitado, separar a banda sem voz.
- [ ] Confirmar timer em andamento, ao navegar entre abas e após conclusão/falha.

## 5. Timers
- [ ] Geração musical: timer aparece ao iniciar, atualiza em tempo real e mantém resultado final.
- [ ] Separação: timer cobre o processo inteiro.
- [ ] Criação de banda/instrumentação: timer cobre a tarefa inteira.
- [ ] Compositor: timer durante geração, análise e transcrição.
- [ ] Legendas SRT/LRC: timer próprio durante operação e resultado final.
- [ ] Erros/interrupções: status e duração final são coerentes.

## Registro de teste
Anotar sistema operacional, GPU/VRAM, modelo, idioma selecionado, operação, duração, resultado e eventual erro. Não publicar a versão final até completar testes locais essenciais em Windows.


## Auditoria de strings localizadas (27/11/2026)

- Localizados os termos de resultado de legendas (linhas, modo, palavras correspondidas e qualidade de sincronização).
- Localizada a confirmação de exclusão de arquivo na Biblioteca.
- Localizada a etiqueta usada para a separação automática da banda.
- Os novos textos foram adicionados às verificações de paridade e valores explícitos de PT-BR, EN e ES.


## Auditoria de erros genéricos de geração (27/11/2026)

- Localizados os avisos de início de tarefa, falha do ACE-Step e ausência de áudio retornado.
- Localizadas validações de letra obrigatória e estilo musical.
- Erros técnicos retornados pelo backend continuam preservados quando disponíveis, para diagnóstico.
- Testes de i18n validam os cinco textos nos três idiomas.


## Auditoria de textos de legendas e timer do compositor (27/11/2026)

- Centralizadas as mensagens de letra vazia e Whisper ausente/instalado/dica de instalação.
- Timer do compositor usa a chave `elapsed` do catálogo em vez de texto condicional local.
- A criação musical usa a tradução catalogada para ausência de áudio e etiqueta de faixa somente banda.
- Testes explícitos adicionados para as quatro mensagens de configuração de legendas em todos os idiomas.


## Auditoria de fases da geração e separação (27/11/2026)

- Centralizadas as fases de início, envio, geração, salvamento e separação de áudio.
- Validações de letra e estilo obrigatórios reutilizam as traduções já catalogadas.
- Testes explícitos cobrem as fases e validações em PT-BR, EN e ES.


## Auditoria de estados de tarefa (27/11/2026)

- `runJob` agora impede iniciar operações globais duplicadas com uma trava de referência imediata.
- A trava é liberada no `finally`, inclusive em erro.
- Polling da separação reconhece explicitamente estados `running`, `done` e `error`; estado inesperado encerra com aviso localizado, em vez de loop infinito.
- Teste de i18n verifica o aviso de estado inesperado em PT-BR, EN e ES.
