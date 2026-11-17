# Avisos e créditos

## 1. O que é este projeto

Social Sound Beat: ferramenta local para criar música a partir de uma letra, separar voz e instrumental, criar uma banda para a sua voz e gerar legendas (SRT e LRC).

Foi criado com ajuda de inteligência artificial (Claude, da Anthropic) e testado só em parte. É oferecido "como está", sem garantia de funcionamento, e o uso é por conta e risco de quem usa.

Não tem ligação com os projetos e empresas citados abaixo, nem com Suno, Spotify, Deezer, YouTube ou qualquer outra plataforma. A licença dos arquivos deste repositório está em [LICENSE](LICENSE) (MIT).

## 2. Programas e modelos de terceiros

Nada abaixo está dentro deste repositório. O instalador baixa direto das fontes oficiais, e cada item segue a licença própria. Não redistribua os modelos; aponte para os links oficiais.

| Item | Licença | Fonte |
|---|---|---|
| ACE-Step 1.5 (motor de música) | MIT | github.com/ACE-Step/ACE-Step-1.5 |
| Demucs (separação de voz) | MIT | github.com/facebookresearch/demucs (confira também a licença dos modelos) |
| PyTorch e torchaudio | BSD | pytorch.org |
| NumPy | BSD-3 | numpy.org |
| SoundFile | BSD-3 | pypi.org/project/soundfile |
| FastAPI | MIT | fastapi.tiangolo.com |
| Uvicorn, HTTPX | BSD-3 | uvicorn.org, python-httpx.org |
| python-multipart | Apache-2.0 | pypi.org/project/python-multipart |
| uv (Linux/macOS, gerenciador do ACE-Step) | MIT / Apache-2.0 | github.com/astral-sh/uv |
| faster-whisper e CTranslate2 (opcional, legendas no modo Preciso) | MIT | github.com/SYSTRAN/faster-whisper |
| PyAV (usado pelo faster-whisper) | BSD-3 | pypi.org/project/av |
| Modelos Whisper (opcional) | MIT | github.com/openai/whisper |

**Interface** (já compilada em `helper/web`): React (MIT), Vite (MIT), Tailwind CSS (MIT), lucide-react (ISC).

## 3. Uso responsável

- Use apenas letras, vozes e músicas que sejam suas ou que você tenha autorização para usar.
- Não imite a voz nem o estilo identificável de artistas reais, e não cite nomes de artistas ao pedir uma música.
- O ACE-Step pede que quem usa verifique a originalidade do que gera e informe que houve uso de IA.
- Antes de publicar em Spotify, Deezer, YouTube ou outra plataforma, leia as regras atuais da plataforma e da distribuidora. Elas mudam com frequência, e várias exigem aviso de uso de IA. Isto não é aconselhamento jurídico.
- Direitos autorais de música gerada por IA variam por país e ainda estão em discussão.

## 4. Contribuindo e compartilhando

- Compartilhe o link deste repositório. Não compartilhe a sua pasta já instalada: ela tem as suas músicas e arquivos pessoais (o `.gitignore` já evita enviá-los ao GitHub).
- Aponte o ACE-Step para o link oficial acima, sem hospedar o pacote ou os modelos dele.
- Se alterar o `config.bat` com o caminho do seu computador, não envie essa alteração ao repositório.
