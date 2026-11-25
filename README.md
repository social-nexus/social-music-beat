# Social Music Beat

> ⚠️ **ATENÇÃO: LEIA ANTES DE CRIAR E PUBLICAR MÚSICAS COM IA**
>
> Usar IA para gerar uma música **não garante, por si só, direitos autorais, exclusividade ou permissão para uso comercial**. Antes de publicar, confira a licença do modelo/serviço, os direitos sobre letras, melodias, vozes, samples e gravações utilizados e as regras atuais do YouTube, distribuidoras e demais plataformas. Evite imitar artistas ou usar material de terceiros sem autorização.
>
> 📘 **Leia o guia completo:** [versão PDF](CUIDADO_LEIA_ANTES_DE_CRIAR.pdf) | [versão Markdown](CUIDADO-LEIA-ANTES-DE-CRIAR.md). O material é informativo e não substitui orientação jurídica.

Ferramenta **local** para Windows, Linux e macOS que:

1. **Cria uma música cantada** a partir da sua letra e de um estilo (motor: [ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5));
2. **Separa voz e instrumental** (separador: [Demucs](https://github.com/facebookresearch/demucs));
3. **Cria uma banda nova** que acompanha a sua voz, a partir da sua gravação cantando;
4. **Gera legendas da música**: `.srt` (para vídeo) e `.lrc` (letra sincronizada).

Tudo roda no seu computador. A internet só é usada na instalação, para baixar os modelos.

> Projeto desenvolvido com apoio de inteligência artificial e testado pelo mantenedor em instalações reais no Windows. Linux e macOS contam com verificações automatizadas de código, mas ainda precisam de validação prática em computadores dessas plataformas.
> Oferecido "como está", sem garantia. Veja [AVISOS.md](AVISOS.md).
> O passo a passo completo, com mais detalhes, está no [MANUAL DE USO.pdf](MANUAL%20DE%20USO.pdf).

## Requisitos

- **Windows, Linux ou macOS**
- Placa NVIDIA com drivers atualizados (Windows e Linux). No Mac com chip Apple, o ACE-Step usa o backend MLX; consulte o [ACE-Step](https://github.com/ACE-Step/ACE-Step-1.5) para os requisitos atuais.
- Python 3.11 (no Windows, marque **Add python.exe to PATH** na instalação)
- Cerca de **30 GB livres** no disco (os downloads somam cerca de 20 GB)
- **Windows:** o instalador baixa e extrai automaticamente o pacote portátil oficial do ACE-Step 1.5 quando ele ainda não está instalado. **Linux/macOS:** `git` e o [uv](https://docs.astral.sh/uv/) (o instalador baixa o ACE-Step e oferece instalar o uv).
- O ACE-Step **não** faz parte deste repositório.

> Os scripts e testes automatizados de Linux e macOS ajudam a verificar a compatibilidade do código, mas a instalação completa e a geração real de áudio ainda não foram validadas pelo mantenedor em computadores dessas plataformas.

## Instalação no Windows (só uma vez)

1. **Baixe este repositório:** botão verde **Code → Download ZIP** (ou `git clone`) e extraia numa pasta de fácil acesso, por exemplo `C:\SocialMusicBeat`.
2. Dê duplo clique em `instalar.bat`. Se o ACE-Step ainda não estiver instalado, o assistente oferece baixar automaticamente o pacote portátil oficial e extraí-lo em `C:\ACE-Step-1.5`. Se você já tiver o ACE-Step em outra pasta, informe o caminho quando solicitado.
3. Na primeira execução, o instalador também configura a biblioteca de modelos: prefere um segundo SSD disponível (por exemplo, `D:\IA_MODELS`) e usa o SSD do Windows quando há apenas um. Você pode aceitar o caminho sugerido ou digitar outro.
4. O instalador cria o ambiente do separador de voz, instala as dependências (incluindo o Keyring para armazenar chaves de API no cofre do sistema), verifica o Keyring, instala o Whisper (legendas modo Preciso) e baixa os modelos. **Demora e baixa vários GB; mantenha a internet conectada e tenha espaço livre suficiente.**

Se algum download falhar, rode o `instalar.bat` de novo: o que já foi baixado não é baixado outra vez.

## Instalação no Linux e macOS (só uma vez)

1. Baixe este repositório (Code → Download ZIP ou `git clone`) e extraia numa pasta, por exemplo `~/SocialMusicBeat`.
2. Abra um terminal nessa pasta e libere a execução dos scripts:
   ```
   chmod +x *.sh *.command
   ```
   No Mac, se o sistema bloquear os `.command` ("desenvolvedor não identificado"), rode também `xattr -dr com.apple.quarantine .`.
3. O ACE-Step fica por padrão em `~/ACE-Step-1.5` (veja o `config.sh`). Se a pasta não existir, o instalador oferece baixá-lo do GitHub.
4. Rode `./instalar-linux.sh` (Mac: dê duplo clique em `instalar-mac.command`). Ele instala o ACE-Step com o `uv`, cria o ambiente do separador de voz e baixa os modelos. **Demora e baixa vários GB.**

**Python 3.11:** `brew install python@3.11` no Mac, ou `sudo apt install python3.11 python3.11-venv` no Debian/Ubuntu. Sem o 3.11, o `instalar-linux.sh` usa o `uv` para baixá-lo.

**Mac com Intel:** o instalador usa PyTorch 2.2.2 no separador de voz, porque o 2.5.1 não existe para esse Mac. O ACE-Step nesse Mac pode não funcionar bem; consulte a página dele.

## Uso diário (Linux e macOS)

- **Ligar:** `./iniciar-linux.sh` (Mac: duplo clique em `iniciar-mac.command`). O motor de música e o servidor rodam em segundo plano, e a janela abre no Chrome, Edge, Brave ou Chromium, se houver; senão, no navegador padrão, em `http://localhost:8002`. Os logs ficam na pasta `logs` (`logs/acestep.log` mostra o andamento do motor).
- **Desligar:** `./parar-linux.sh` (Mac: duplo clique em `parar-mac.command`). Fechar só a janela não desliga os motores.

## Uso diário (Windows)

- **Antes de ligar:** feche o ComfyUI e o servidor do [Social Sound](https://github.com/pedroibd/social-sound). A memória da placa de vídeo não dá para dois programas pesados ao mesmo tempo.
- **Ligar:** duplo clique em `iniciar.bat`. Abrem duas janelas pretas (**não feche**) e uma janela própria do Edge em `http://localhost:8002`. Na primeira vez, o motor demora alguns minutos para ligar; um aviso amarelo aparece no topo até ficar pronto.
- **Desligar:** duplo clique em `parar.bat`. Fechar só a janela do programa **não** desliga os motores nem libera a placa de vídeo.

## Armazenamento compartilhado de modelos (opcional, Windows)

O Social Music Beat pode usar uma biblioteca central de modelos compartilhada com outros aplicativos Social Nexus, como o Social Sound. Por padrao, nada muda: os modelos continuam nos diretorios locais de cada usuario.

Para configurar outro SSD, feche as ferramentas e execute `configurar_armazenamento.bat`. O assistente sugere `D:\\IA_MODELS`, mas aceita outro caminho. Os caches de LLM, Hugging Face e PyTorch são copiados e verificados por tamanho e SHA-256; a remoção dessas origens é opcional. Para o ACE-Step, o assistente identifica a pasta real usando o Python da própria instalação, copia e verifica os pesos e cria uma junction NTFS no caminho original `checkpoints`. O backup original do ACE-Step é mantido para que você possa testar uma geração antes de apagá-lo manualmente. Programas, ambientes Python e runtime llama.cpp permanecem nas pastas de instalação/dados atuais.

Com a biblioteca configurada, novos downloads do Qwen/Gemma, Whisper e Demucs usam a pasta central pelas variáveis de ambiente. O ACE-Step continua usando o caminho `<instalação>\\checkpoints`, mas essa pasta é redirecionada para `ACE-Step` na biblioteca central por uma junction do Windows; assim, não depende de suporte a `ACESTEP_CHECKPOINTS_DIR`. Se o disco configurado estiver desconectado, a inicialização é interrompida com aviso; não há fallback silencioso para o disco do Windows.

Estrutura criada:
```
D:\\IA_MODELS\\
├── LLM\\
├── HuggingFace\\
├── Torch\\
└── ACE-Step\\
```

## Como usar (resumo)

1. **Criar a música:** cole a letra, descreva o estilo (em inglês, tags separadas por vírgula funcionam bem), escolha a voz e clique em **Criar**. Marque as partes da letra com `[Verse 1]`, `[Chorus]`, `[Bridge]`.
2. **Separar voz e instrumental:** no cartão da música, clique em **Separar voz e instrumental** (roda na CPU e leva alguns minutos).
3. **Cantar por cima:** grave a sua voz sobre o instrumental, seguindo a voz guia.
4. **Criar a banda para a sua voz:** envie a sua gravação e o programa cria uma banda nova que acompanha o seu jeito de cantar.
5. **Legendas:** no cartão da música (ou da voz separada), clique em **Legenda** para gerar `.srt` e `.lrc`.
   - Usa a **voz separada** e a letra salva; se ainda não separou, faça o passo 2 antes. Também dá para usar a sua gravação cantando, com a mesma letra.
   - **Modo Rápido** (nada para baixar): usa as respirações entre as linhas cantadas. **Modo Preciso:** o Whisper ouve a voz. Cantar é mais difícil de alinhar do que falar, então confira o resultado.

### Prompt para criar letras

O arquivo [Musica-Prompt-Mestre.txt](Musica-Prompt-Mestre.txt) tem um prompt pronto para pedir a um assistente de IA uma letra em português já no formato que o programa espera (título, estilo, configurações e letra com as marcações). Preencha os campos entre colchetes e cole no assistente de sua preferência.

### Como usar o compositor local

1. Instale e inicie o Social Music Beat normalmente.
2. Abra a aba **Compositor IA**.
3. Escolha o runtime compatível. Para começar, use **CPU**; os pacotes CUDA/Vulkan/Metal são opcionais.
4. Clique em **Baixar e instalar motor**. O pacote é obtido do release oficial do llama.cpp e validado por SHA-256.
5. Selecione **Qwen3 4B Q4_K_M** ou **Gemma 3 4B Instruct Q4_K_M**. O Gemma exige que você leia e aceite os termos antes do download. Cada modelo ocupa aproximadamente 2,5 GB.
6. Clique em **Ativar modelo**. Depois preencha tema, gênero e clima e gere a letra.
7. Revise o texto e clique em **Usar esta letra na criação musical** para transferi-lo ao formulário do ACE-Step.

Também é possível importar um arquivo GGUF já existente. A licença de modelos importados precisa ser conferida pelo próprio usuário.

O runtime e os modelos são opcionais e ficam na pasta de dados do usuário, fora do repositório. A IA local usa a porta 8010 em `127.0.0.1`; o ACE-Step continua na porta 8001 e o servidor da interface em 8002.

**Atenção:** o fluxo do compositor foi instalado e testado em Windows. Linux e macOS ainda precisam de validação prática completa. O pacote CUDA depende de drivers NVIDIA compatíveis e pode consumir muita VRAM; comece com poucas camadas na GPU ou use CPU. O compositor é opcional e não é necessário para usar as funções musicais principais.

## Estrutura do projeto

```
social-music-beat/
├── instalar / iniciar / parar    .bat (Windows) · .sh e .command (Linux/macOS)
├── config.bat / config.sh        configuração (caminho do ACE-Step)
├── _comum.sh                     funções de apoio dos scripts Linux/macOS
├── helper/                       servidor Python (FastAPI), separador de voz e legendas
│   ├── server.py, legenda.py, ia_local.py, requirements.txt
│   ├── tests/                     testes do gerenciador de IA local e provedores
│   ├── web/                       interface já compilada
│   └── musicas/                   criada sozinha: suas músicas e biblioteca (não vai para o GitHub)
├── interface-fonte/               código-fonte da interface (React + Vite + Tailwind)
├── docs/                           planos técnicos
├── MODEL_LICENSES.md, THIRD_PARTY_NOTICES.md
├── Musica-Prompt-Mestre.txt
└── MANUAL DE USO.pdf
```

## Personalização

Para mudar cores e fontes da tela, use o código em `interface-fonte\` (precisa do [Node.js](https://nodejs.org)):

```
cd interface-fonte
npm install
npm run build
```

O build já grava o resultado em `helper\web`.

## Compositor de letras com IA local

A branch de desenvolvimento inclui um compositor opcional com modelos de linguagem executados localmente. O runtime llama.cpp é baixado de releases oficiais fixados por versão e SHA-256; não é necessário instalar Ollama ou outro gerenciador externo; o catálogo inicial oferece Qwen3-4B GGUF Q4_K_M (Apache 2.0) e Gemma 3 4B Instruct Q4_K_M (Gemma Terms of Use, com aceite explícito no aplicativo). Também é possível importar arquivos GGUF que o usuário já possua.

A ferramenta continua funcionando sem baixar o runtime ou modelos de texto, e a geração musical continua usando o ACE-Step. O motor local escuta somente em 127.0.0.1.

- Arquitetura e etapas: [docs/PLANO-IA-LOCAL.md](docs/PLANO-IA-LOCAL.md)
- Avisos de terceiros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- Licenças dos modelos: [MODEL_LICENSES.md](MODEL_LICENSES.md)

**Estado:** recurso opcional disponível nesta versão de desenvolvimento. O runtime e os modelos são baixados sob demanda; confira as licenças e os termos antes de usar.

## Projeto relacionado

- [Social Sound](https://github.com/pedroibd/social-sound): narração com clonagem de voz, roteiro, diálogo, legendas e edição de vídeo.

## Créditos e licença

Código deste repositório sob licença [MIT](LICENSE). ACE-Step, Demucs, PyTorch, Whisper e demais programas e modelos são baixados direto das fontes oficiais e seguem as licenças próprias; a lista completa está em [AVISOS.md](AVISOS.md).

**Use com responsabilidade:** use apenas letras, vozes e músicas suas ou autorizadas, não imite artistas reais e informe o uso de IA ao publicar. Leia as regras atuais da plataforma e da distribuidora antes de publicar.

Autor: **Pedoibd** · Comunidade: [IA Voz e Vídeo no Discord](https://discord.gg/nEjHQzgz3d)


## Provedores de IA por API (opcional)

Além dos modelos locais Gemma e Qwen, o compositor pode usar a chave de API do próprio usuário. A primeira integração oferece OpenAI, Anthropic Claude, Google Gemini, OpenRouter, DeepSeek, Groq e Mistral AI. O OpenRouter permite acessar modelos de diferentes famílias por uma API unificada. Novos adaptadores podem ser adicionados sem alterar os modos locais.

1. Abra **Compositor IA** e escolha o provedor desejado.
2. Informe o identificador do modelo (a lista apresenta sugestões; os modelos disponíveis e os nomes podem mudar).
3. Cadastre a chave de API. Ela é armazenada pelo cofre de credenciais do sistema operacional via Python Keyring, não no repositório nem no arquivo de preferências.
4. Use **Testar conexão** e depois **Usar este provedor**.
5. Na composição, selecione Música completa, Continuar composição ou Criar somente refrão normalmente.

O modo **Local — Gemma / Qwen** continua disponível sem chave e sem cobrança por requisição. No modo de API, o texto e os dados enviados para a composição são encaminhados ao provedor selecionado; verifique os termos de privacidade, preços, limites e créditos da sua conta. A assinatura de um chatbot não inclui necessariamente créditos de API.

Se o cofre seguro de credenciais não estiver disponível no sistema, o aplicativo não grava a chave em texto simples e mantém o modo local funcional. No Windows, use o Gerenciador de Credenciais do sistema; em macOS/Linux, o backend seguro do Keyring deve estar instalado e desbloqueado.

As chaves são específicas deste usuário e desta instalação. Não as inclua em capturas de tela, logs, issues ou commits.

## Validação por plataforma e testes da comunidade

O CI do projeto executa os testes Python em quatro ambientes: Windows, Linux, macOS Intel e macOS Apple Silicon. Isso ajuda a encontrar incompatibilidades de código e de dependências sem exigir que o desenvolvedor tenha fisicamente todos esses computadores.

**Importante:** passar no CI não significa que a instalação completa, os drivers, o ACE-Step, os modelos ou todos os recursos de áudio/vídeo foram testados em um computador real daquela plataforma. O desenvolvimento principal é feito e testado diretamente em Windows. Linux e macOS precisam também de validação prática com a comunidade.

Se você usar Linux ou macOS (Intel ou Apple Silicon), e encontrar erro, compartilhe no [Discord da comunidade](https://discord.gg/nEjHQzgz3d), informando:
- Sistema e versão (ex.: Ubuntu 24.04, macOS 15);
- Arquitetura do computador (Intel ou Apple Silicon/M1 ou posterior);
- Etapa em que ocorreu o erro;
- Mensagem completa do erro e, se possível, o trecho correspondente do log.

**Nunca envie chaves de API, senhas ou tokens** nos prints ou logs.