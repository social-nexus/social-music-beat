# Social Sound Beat

Ferramenta **local** para Windows que:

1. **Cria uma música cantada** a partir da sua letra e de um estilo (motor: [ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5));
2. **Separa voz e instrumental** (separador: [Demucs](https://github.com/facebookresearch/demucs));
3. **Cria uma banda nova** que acompanha a sua voz, a partir da sua gravação cantando;
4. **Gera legendas da música**: `.srt` (para vídeo) e `.lrc` (letra sincronizada).

Tudo roda no seu computador. A internet só é usada na instalação, para baixar os modelos.

> Projeto criado com ajuda de inteligência artificial (Claude, da Anthropic) e testado só em parte.
> Oferecido "como está", sem garantia. Veja [AVISOS.md](AVISOS.md).
> O passo a passo completo, com mais detalhes, está no [MANUAL DE USO.pdf](MANUAL%20DE%20USO.pdf).

## Requisitos

- Windows, com placa NVIDIA e drivers atualizados
- Python 3.11 (marque **Add python.exe to PATH** na instalação)
- Cerca de **30 GB livres** no disco (os downloads somam cerca de 20 GB)
- Um programa para abrir arquivos `.7z`, como o [7-Zip](https://7-zip.org)
- O pacote portátil do **ACE-Step 1.5** para Windows (veja o passo 2 abaixo). Ele **não** faz parte deste repositório.

## Instalação (só uma vez)

1. **Baixe este repositório:** botão verde **Code → Download ZIP** (ou `git clone`) e extraia numa pasta de fácil acesso, por exemplo `C:\SocialSoundBeat`.
2. **Baixe o ACE-Step:** no [GitHub do ACE-Step 1.5](https://github.com/ACE-Step/ACE-Step-1.5), use o link do pacote para Windows (`ACE-Step-1.5.7z`) e extraia em `C:\ACE-Step-1.5`. Confira que dentro dessa pasta existe o arquivo `start_api_server.bat`.
3. Se extraiu o ACE-Step em outro lugar, abra o `config.bat` com o Bloco de Notas e troque o caminho da linha `set ACESTEP_DIR=`.
4. Dê duplo clique em `instalar.bat`. Ele cria o ambiente do separador de voz, instala o Whisper (legendas modo Preciso) e baixa os modelos. **Demora e baixa vários GB.**

Se algum download falhar, rode o `instalar.bat` de novo: o que já foi baixado não é baixado outra vez.

## Uso diário

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

## Estrutura do projeto

```
social-sound-beat/
├── instalar.bat / iniciar.bat / parar.bat / config.bat
├── helper/              servidor Python (FastAPI), separador de voz e legendas
│   ├── server.py, legenda.py, requirements.txt
│   ├── web/             interface já compilada
│   └── musicas/         criada sozinha: suas músicas e biblioteca (não vai para o GitHub)
├── interface-fonte/     código-fonte da interface (React + Vite + Tailwind)
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

## Projeto relacionado

- [Social Sound](https://github.com/pedroibd/social-sound): narração com clonagem de voz, roteiro, diálogo, legendas e edição de vídeo.

## Créditos e licença

Código deste repositório sob licença [MIT](LICENSE). ACE-Step, Demucs, PyTorch, Whisper e demais programas e modelos são baixados direto das fontes oficiais e seguem as licenças próprias; a lista completa está em [AVISOS.md](AVISOS.md).

**Use com responsabilidade:** use apenas letras, vozes e músicas suas ou autorizadas, não imite artistas reais e informe o uso de IA ao publicar. Leia as regras atuais da plataforma e da distribuidora antes de publicar.

Autor: **Pedroibd** · Comunidade: [IA Voz e Vídeo no Discord](https://discord.gg/nEjHQzgz3d)
