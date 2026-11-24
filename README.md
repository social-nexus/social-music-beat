# Social Music Beat

Ferramenta **local** para Windows, Linux e macOS que:

1. **Cria uma música cantada** a partir da sua letra e de um estilo (motor: [ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5));
2. **Separa voz e instrumental** (separador: [Demucs](https://github.com/facebookresearch/demucs));
3. **Cria uma banda nova** que acompanha a sua voz, a partir da sua gravação cantando;
4. **Gera legendas da música**: `.srt` (para vídeo) e `.lrc` (letra sincronizada).

Tudo roda no seu computador. A internet só é usada na instalação, para baixar os modelos.

> Projeto criado com ajuda de inteligência artificial (Claude, da Anthropic) e testado só em parte.
> Oferecido "como está", sem garantia. Veja [AVISOS.md](AVISOS.md).
> O passo a passo completo, com mais detalhes, está no [MANUAL DE USO.pdf](MANUAL%20DE%20USO.pdf).

## Requisitos

- **Windows, Linux ou macOS**
- Placa NVIDIA com drivers atualizados (Windows e Linux). No Mac com chip Apple, o ACE-Step usa o backend MLX; consulte o [ACE-Step](https://github.com/ACE-Step/ACE-Step-1.5) para os requisitos atuais.
- Python 3.11 (no Windows, marque **Add python.exe to PATH** na instalação)
- Cerca de **30 GB livres** no disco (os downloads somam cerca de 20 GB)
- **Windows:** o pacote portátil do ACE-Step 1.5 (`.7z`) e um programa para abri-lo, como o [7-Zip](https://7-zip.org). **Linux/macOS:** `git` e o [uv](https://docs.astral.sh/uv/) (o instalador baixa o ACE-Step e oferece instalar o uv).
- O ACE-Step **não** faz parte deste repositório.

> Os scripts de Linux e macOS são novos e foram verificados só quanto à lógica de ligar e desligar os servidores. A instalação completa neles ainda não foi testada em máquinas reais.

## Instalação no Windows (só uma vez)

1. **Baixe este repositório:** botão verde **Code → Download ZIP** (ou `git clone`) e extraia numa pasta de fácil acesso, por exemplo `C:\SocialMusicBeat`.
2. **Baixe o ACE-Step:** no [GitHub do ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5), use o link do pacote para Windows (`ACE-Step-1.5.7z`) e extraia em `C:\ACE-Step-1.5`. Confira que dentro dessa pasta existe o arquivo `start_api_server.bat`.
3. Se extraiu o ACE-Step em outro lugar, abra o `config.bat` com o Bloco de Notas e troque o caminho da linha `set ACESTEP_DIR=`.
4. Dê duplo clique em `instalar.bat`. Ele cria o ambiente do separador de voz, instala o Whisper (legendas modo Preciso) e baixa os modelos. **Demora e baixa vários GB.**

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

### Como usar o compositor local (em desenvolvimento)

1. Instale e inicie o Social Music Beat normalmente.
2. Abra a aba **Compositor IA**.
3. Escolha o runtime compatível. Para começar, use **CPU**; os pacotes CUDA/Vulkan/Metal são opcionais.
4. Clique em **Baixar e instalar motor**. O pacote é obtido do release oficial do llama.cpp e validado por SHA-256.
5. Selecione **Qwen3 4B Q4_K_M** ou **Gemma 3 4B Instruct Q4_K_M**. O Gemma exige que você leia e aceite os termos antes do download. Cada modelo ocupa aproximadamente 2,5 GB.
6. Clique em **Ativar modelo**. Depois preencha tema, gênero e clima e gere a letra.
7. Revise o texto e clique em **Usar esta letra na criação musical** para transferi-lo ao formulário do ACE-Step.

Também é possível importar um arquivo GGUF já existente. A licença de modelos importados precisa ser conferida pelo próprio usuário.

O runtime e os modelos são opcionais e ficam na pasta de dados do usuário, fora do repositório. A IA local usa a porta 8010 em `127.0.0.1`; o ACE-Step continua na porta 8001 e o servidor da interface na 8002.

**Atenção:** esta primeira versão ainda precisa de teste de execução real em Windows, Linux e macOS. O pacote CUDA depende de drivers NVIDIA compatíveis e pode consumir muita VRAM; comece com poucas camadas na GPU ou use CPU. O compositor não é necessário para usar as funções musicais já existentes.

## Estrutura do projeto

```
social-music-beat/
├── instalar / iniciar / parar    .bat (Windows) · .sh e .command (Linux/macOS)
├── config.bat / config.sh        configuração (caminho do ACE-Step)
├── _comum.sh                     funções de apoio dos scripts Linux/macOS
├── helper/              servidor Python (FastAPI), separador de voz e legendas
│   ├── server.py, legenda.py, ia_local.py, requirements.txt
│   ├── tests/           testes do gerenciador de IA local
│   ├── web/             interface já compilada
│   └── musicas/         criada sozinha: suas músicas e biblioteca (não vai para o GitHub)
├── interface-fonte/     código-fonte da interface (React + Vite + Tailwind)
├── docs/               planos técnicos
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

A branch de desenvolvimento inclui um compositor opcional com modelos de linguagem executados localmente. O runtime llama.cpp é baixado de releases oficiais fixados por versão e SHA-256; o catálogo inicial oferece Qwen3-4B GGUF Q4_K_M (Apache 2.0) e Gemma 3 4B Instruct Q4_K_M (Gemma Terms of Use, com aceite explícito no aplicativo). Também é possível importar arquivos GGUF que o usuário já possua.

A ferramenta continua funcionando sem baixar o runtime ou modelos de texto, e a geração musical continua usando o ACE-Step. O motor local escuta somente em 127.0.0.1.

- Arquitetura e etapas: [docs/PLANO-IA-LOCAL.md](docs/PLANO-IA-LOCAL.md)
- Avisos de terceiros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- Licenças dos modelos: [MODEL_LICENSES.md](MODEL_LICENSES.md)

**Estado:** implementação inicial em desenvolvimento. Os pacotes e o fluxo precisam ser validados em instalações reais antes de uma publicação estável.

## Projeto relacionado

- [Social Sound](https://github.com/pedroibd/social-sound): narração com clonagem de voz, roteiro, diálogo, legendas e edição de vídeo.

## Créditos e licença

Código deste repositório sob licença [MIT](LICENSE). ACE-Step, Demucs, PyTorch, Whisper e demais programas e modelos são baixados direto das fontes oficiais e seguem as licenças próprias; a lista completa está em [AVISOS.md](AVISOS.md).

**Use com responsabilidade:** use apenas letras, vozes e músicas suas ou autorizadas, não imite artistas reais e informe o uso de IA ao publicar. Leia as regras atuais da plataforma e da distribuidora antes de publicar.

Autor: **Pedoibd** · Comunidade: [IA Voz e Vídeo no Discord](https://discord.gg/nEjHQzgz3d)
