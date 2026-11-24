$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

$defaultInstall = "C:\ACE-Step-1.5"
$installPath = $env:ACESTEP_DIR
if ([string]::IsNullOrWhiteSpace($installPath)) { $installPath = $defaultInstall }

function Test-AceStep([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    $portablePython = (Test-Path -LiteralPath (Join-Path $Path "python_embeded\python.exe")) -or
                      (Test-Path -LiteralPath (Join-Path $Path "python_embedded\python.exe"))
    return $portablePython -and
           (Test-Path -LiteralPath (Join-Path $Path "acestep\model_downloader.py")) -and
           (Test-Path -LiteralPath (Join-Path $Path "start_api_server.bat"))
}

Write-Host ""
Write-Host "============================================================"
Write-Host " Social Music Beat - instalacao/verificacao do ACE-Step 1.5"
Write-Host "============================================================"
Write-Host ""

if (Test-AceStep $installPath) {
    Write-Host "ACE-Step encontrado em: $installPath"
} else {
    Write-Host "Nao encontrei uma instalacao portatil valida em: $installPath"
    $typedPath = Read-Host "Se o ACE-Step ja estiver instalado em outra pasta, informe o caminho. Ou pressione ENTER para baixar"
    if (-not [string]::IsNullOrWhiteSpace($typedPath)) {
        $candidate = [IO.Path]::GetFullPath($typedPath.Trim().Trim('"'))
        if (Test-AceStep $candidate) {
            $installPath = $candidate
            Write-Host "Instalacao existente reconhecida."
        } else {
            throw "A pasta informada nao parece conter o ACE-Step portatil completo: $candidate"
        }
    } else {
        $answer = Read-Host "Baixar automaticamente o pacote oficial do ACE-Step 1.5 para $installPath? [S/n]"
        if ($answer -match '^(n|nao|não)$') {
            Write-Host "Download cancelado. Baixe o pacote oficial e extraia-o, ou rode instalar.bat novamente."
            Write-Host "Pagina oficial: https://github.com/ace-step/ACE-Step-1.5"
            exit 2
        }

        $installPath = [IO.Path]::GetFullPath($installPath)
        if (Test-Path -LiteralPath $installPath) {
            $existing = Get-ChildItem -LiteralPath $installPath -Force -ErrorAction SilentlyContinue
            if (@($existing).Count -gt 0) {
                throw "A pasta de destino ja existe e nao esta vazia, mas nao foi reconhecida como ACE-Step. Para preservar seus arquivos, escolha outra pasta no config.bat ou renomeie a pasta atual: $installPath"
            }
        }

        $drive = [IO.Path]::GetPathRoot($installPath)
        $driveInfo = Get-PSDrive -Name $drive.Substring(0,1) -PSProvider FileSystem -ErrorAction Stop
        $freeGB = [math]::Round($driveInfo.Free / 1GB, 1)
        Write-Host "Espaco livre em $drive : $freeGB GB"
        if ($driveInfo.Free -lt 20GB) {
            throw "Sao recomendados pelo menos 20 GB livres para baixar e extrair o ACE-Step portatil. Libere espaco ou escolha outra pasta."
        }

        $downloadUrl = "https://files.acemusic.ai/acemusic/win/ACE-Step-1.5.7z"
        $tempRoot = Join-Path $env:TEMP ("SocialMusicBeat-ACE-" + [guid]::NewGuid().ToString("N"))
        $archive = Join-Path $tempRoot "ACE-Step-1.5.7z"
        $extractDir = Join-Path $tempRoot "extraido"
        $sevenZip = Join-Path $tempRoot "7zr.exe"
        New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

        try {
            Write-Host ""
            Write-Host "Baixando o pacote portatil oficial do ACE-Step 1.5..."
            Write-Host "O arquivo e grande; mantenha a internet conectada ate o fim."
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $downloadUrl -OutFile $archive -UseBasicParsing

            if (-not (Test-Path -LiteralPath $archive) -or (Get-Item -LiteralPath $archive).Length -lt 100MB) {
                throw "O download do pacote ACE-Step parece incompleto ou invalido."
            }

            Write-Host ""
            Write-Host "Preparando extrator 7-Zip portatil..."
            Invoke-WebRequest -Uri "https://www.7-zip.org/a/7zr.exe" -OutFile $sevenZip -UseBasicParsing
            if (-not (Test-Path -LiteralPath $sevenZip) -or (Get-Item -LiteralPath $sevenZip).Length -lt 100KB) {
                throw "Nao foi possivel obter o extrator 7-Zip oficial."
            }

            Write-Host ""
            Write-Host "Extraindo ACE-Step. Isso pode levar alguns minutos..."
            & $sevenZip x $archive "-o$extractDir" -y
            if ($LASTEXITCODE -ne 0) { throw "O 7-Zip retornou o codigo $LASTEXITCODE durante a extracao." }

            $pythonMatches = @(Get-ChildItem -LiteralPath $extractDir -Filter "python.exe" -File -Recurse -ErrorAction SilentlyContinue |
                Where-Object { $_.Directory.Name -in @("python_embeded","python_embedded") })
            $validRoots = @()
            foreach ($pythonFile in $pythonMatches) {
                $candidateRoot = Split-Path $pythonFile.Directory.FullName -Parent
                if ((Test-Path -LiteralPath (Join-Path $candidateRoot "acestep\model_downloader.py")) -and
                    (Test-Path -LiteralPath (Join-Path $candidateRoot "start_api_server.bat"))) {
                    $validRoots += $candidateRoot
                }
            }
            $validRoots = @($validRoots | Select-Object -Unique)
            if ($validRoots.Count -ne 1) {
                throw "Nao consegui identificar uma unica pasta ACE-Step valida dentro do pacote extraido."
            }

            $sourceRoot = $validRoots[0]
            New-Item -ItemType Directory -Path $installPath -Force | Out-Null
            Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
                Move-Item -LiteralPath $_.FullName -Destination $installPath -Force
            }

            if (-not (Test-AceStep $installPath)) {
                throw "A verificacao final do ACE-Step falhou. Confira a pasta: $installPath"
            }
            Write-Host ""
            Write-Host "ACE-Step instalado e verificado em: $installPath"
        } finally {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

if (-not (Test-AceStep $installPath)) {
    throw "O ACE-Step nao passou na verificacao final."
}

if ($installPath -match '["&|<>^%!;]') {
    throw "O caminho do ACE-Step contem caracteres que nao sao seguros para os arquivos BAT. Escolha uma pasta sem esses caracteres."
}

$configDir = Join-Path $env:LOCALAPPDATA "SocialNexus"
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$configPathFile = Join-Path $configDir "acestep-path.bat"
$configText = '@echo off' + [Environment]::NewLine + 'set "ACESTEP_DIR=' + $installPath + '"' + [Environment]::NewLine
[IO.File]::WriteAllText($configPathFile, $configText, [Text.Encoding]::ASCII)

Write-Host ""
Write-Host "Caminho do ACE-Step salvo em: $configPathFile"
Write-Host "Concluido."
exit 0
