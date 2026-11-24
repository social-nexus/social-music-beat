$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================"
Write-Host " Social Nexus - Gerenciador de armazenamento de modelos"
Write-Host "============================================================"
Write-Host ""
Write-Host "Este assistente move os caches/modelos para uma pasta central."
Write-Host "Os programas e ambientes Python permanecem onde estao."
Write-Host ""

$defaultRoot = "D:\IA_MODELS"
$answer = Read-Host "Pasta central dos modelos [$defaultRoot]"
if ([string]::IsNullOrWhiteSpace($answer)) { $answer = $defaultRoot }
$root = [IO.Path]::GetFullPath($answer.Trim().Trim('"')).TrimEnd('\')

if ($root -match '["&|<>^%!;]') {
    throw "O caminho contem caracteres que nao sao seguros para a configuracao BAT. Escolha uma pasta sem esses caracteres."
}
if ($root -match '^[A-Za-z]:$') {
    throw "Escolha uma pasta dentro do disco, por exemplo D:\IA_MODELS, e nao apenas a raiz do disco."
}

$driveRoot = [IO.Path]::GetPathRoot($root)
if (-not (Test-Path -LiteralPath $driveRoot)) {
    throw "A unidade $driveRoot nao esta disponivel."
}
New-Item -ItemType Directory -Force -Path $root | Out-Null

function Get-NormalPath([string]$Path) {
    return [IO.Path]::GetFullPath($Path).TrimEnd('\')
}
function Test-IsSameOrChild([string]$Child, [string]$Parent) {
    $c = (Get-NormalPath $Child) + '\'
    $p = (Get-NormalPath $Parent) + '\'
    return $c.StartsWith($p, [StringComparison]::OrdinalIgnoreCase) -or
           (Get-NormalPath $Child).Equals((Get-NormalPath $Parent), [StringComparison]::OrdinalIgnoreCase)
}
function Move-VerifiedDirectory([string]$Label, [string]$Source, [string]$Destination, [System.Collections.ArrayList]$Moved) {
    if ([string]::IsNullOrWhiteSpace($Source) -or -not (Test-Path -LiteralPath $Source -PathType Container)) {
        Write-Host "[$Label] Nenhum cache existente encontrado; sera usado o novo destino."
        return
    }
    $src = Get-NormalPath $Source
    $dst = Get-NormalPath $Destination
    if ($src.Equals($dst, [StringComparison]::OrdinalIgnoreCase)) {
        Write-Host "[$Label] Ja esta no destino correto."
        return
    }
    if (Test-IsSameOrChild $dst $src) {
        throw "Destino dentro da origem detectado em $Label. Escolha outra pasta."
    }
    if (Test-IsSameOrChild $src $dst) {
        throw "A origem de $Label esta dentro da pasta de destino. A operacao foi cancelada para evitar mover a pasta sobre si mesma."
    }

    $files = @(Get-ChildItem -LiteralPath $src -File -Recurse -Force -ErrorAction Stop)
    if ($files.Count -eq 0) {
        Write-Host "[$Label] Pasta sem arquivos; nada para migrar."
        return
    }
    $bytes = ($files | Measure-Object -Property Length -Sum).Sum
    Write-Host ""
    Write-Host "[$Label] Copiando $($files.Count) arquivo(s), $([math]::Round($bytes / 1GB, 2)) GB..."
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    & robocopy $src $dst /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XJ /NFL /NDL /NJH /NJS
    $code = $LASTEXITCODE
    if ($code -ge 8) {
        throw "Falha na copia de $Label (robocopy $code). Os originais foram preservados."
    }

    foreach ($file in $files) {
        $relative = $file.FullName.Substring($src.Length).TrimStart('\')
        $target = Join-Path $dst $relative
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            throw "Verificacao falhou em ${Label}: arquivo ausente no destino: $relative. Os originais foram preservados."
        }
        $targetInfo = Get-Item -LiteralPath $target
        if ($targetInfo.Length -ne $file.Length) {
            throw "Verificacao falhou em ${Label}: tamanho diferente em $relative. Os originais foram preservados."
        }
        $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
        if ($sourceHash -ne $targetHash) {
            throw "Verificacao SHA-256 falhou em ${Label}: arquivo diferente em $relative. Os originais foram preservados."
        }
    }
    [void]$Moved.Add([pscustomobject]@{ Label = $Label; Source = $src; Destination = $dst })
    Write-Host "[$Label] Copia verificada."
}

$localData = Join-Path $env:LOCALAPPDATA "SocialMusicBeat"
$llmSource = Join-Path $localData "models"
$hfSource = if ($env:HF_HOME) { $env:HF_HOME } else { Join-Path $env:USERPROFILE ".cache\huggingface" }
$torchSource = if ($env:TORCH_HOME) { $env:TORCH_HOME } else { Join-Path $env:USERPROFILE ".cache\torch" }

$aceDir = $env:ACESTEP_DIR
$aceSource = ""
$aceDestination = Join-Path $root "ACE-Step"
$aceSupported = $false

# Detecta o caminho real pelo proprio ACE-Step. Esta instalacao usa custom_dir
# e nao reconhece ACESTEP_CHECKPOINTS_DIR; por isso usaremos uma junction NTFS.
if ($aceDir) {
    $aceDownloader = Join-Path $aceDir "acestep\model_downloader.py"
    $acePython = Join-Path $aceDir "python_embeded\python.exe"
    if (-not (Test-Path -LiteralPath $acePython)) {
        $acePython = Join-Path $aceDir "python_embedded\python.exe"
    }
    if ((Test-Path -LiteralPath $aceDownloader) -and (Test-Path -LiteralPath $acePython)) {
        Push-Location $aceDir
        try {
            $probeOutput = & $acePython -c "import acestep.model_downloader as m; print(m.get_checkpoints_dir())" 2>&1
            $probeExit = $LASTEXITCODE
        } finally {
            Pop-Location
        }
        if ($probeExit -eq 0 -and $probeOutput) {
            $aceSource = [string]($probeOutput | Select-Object -Last 1)
            $aceSource = $aceSource.Trim()
            if (-not [string]::IsNullOrWhiteSpace($aceSource)) {
                $aceSupported = $true
                Write-Host "[ACE-Step] Diretorio identificado pelo proprio Python: $aceSource"
            }
        }
    }
}

function Install-AceStepJunction([string]$Source, [string]$Destination) {
    $src = Get-NormalPath $Source
    $dst = Get-NormalPath $Destination
    if (Test-IsSameOrChild $dst $src) {
        throw "A pasta de destino do ACE-Step nao pode ficar dentro da origem."
    }
    if (Test-IsSameOrChild $src $dst) {
        throw "A origem do ACE-Step nao pode ficar dentro da pasta central."
    }

    if (Test-Path -LiteralPath $src) {
        $sourceItem = Get-Item -LiteralPath $src -Force
        if (($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "A pasta $src ja e um link/junction. A operacao foi interrompida para nao alterar um redirecionamento existente."
        }
    }

    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    if (Test-Path -LiteralPath $src -PathType Container) {
        $files = @(Get-ChildItem -LiteralPath $src -File -Recurse -Force -ErrorAction Stop)
        if ($files.Count -gt 0) {
            $bytes = ($files | Measure-Object -Property Length -Sum).Sum
            Write-Host ""
            Write-Host "[ACE-Step] Copiando $($files.Count) arquivo(s), $([math]::Round($bytes / 1GB, 2)) GB para o SSD central..."
            & robocopy $src $dst /E /COPY:DAT /DCOPY:DAT /R:2 /W:2 /XJ /NFL /NDL /NJH /NJS
            $copyCode = $LASTEXITCODE
            if ($copyCode -ge 8) {
                throw "Falha na copia dos modelos ACE-Step (robocopy $copyCode). A pasta original foi preservada."
            }
            foreach ($file in $files) {
                $relative = $file.FullName.Substring($src.Length).TrimStart('\')
                $target = Join-Path $dst $relative
                if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
                    throw "Verificacao ACE-Step falhou: arquivo ausente no destino: $relative. A origem foi preservada."
                }
                $targetInfo = Get-Item -LiteralPath $target
                if ($targetInfo.Length -ne $file.Length) {
                    throw "Verificacao ACE-Step falhou: tamanho diferente em $relative. A origem foi preservada."
                }
                $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
                $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
                if ($sourceHash -ne $targetHash) {
                    throw "Verificacao SHA-256 ACE-Step falhou em $relative. A origem foi preservada."
                }
            }
        } else {
            Write-Host "[ACE-Step] A pasta original esta vazia; nao ha pesos para copiar."
        }

        $backup = "$src.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Move-Item -LiteralPath $src -Destination $backup
        try {
            New-Item -ItemType Junction -Path $src -Target $dst -ErrorAction Stop | Out-Null
            $linkItem = Get-Item -LiteralPath $src -Force
            if (($linkItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
                throw "O Windows nao confirmou a criacao da junction."
            }
        } catch {
            if (Test-Path -LiteralPath $src) {
                Remove-Item -LiteralPath $src -Force -ErrorAction SilentlyContinue
            }
            if (Test-Path -LiteralPath $backup) {
                Move-Item -LiteralPath $backup -Destination $src
            }
            throw "Nao foi possivel criar a junction do ACE-Step. A pasta original foi restaurada. Detalhe: $($_.Exception.Message)"
        }
        Write-Host "[ACE-Step] Junction criada: $src -> $dst"
        Write-Host "[ACE-Step] Backup original preservado em: $backup"
    } else {
        New-Item -ItemType Junction -Path $src -Target $dst -ErrorAction Stop | Out-Null
        Write-Host "[ACE-Step] Junction criada para novos downloads: $src -> $dst"
    }
}

$moved = New-Object System.Collections.ArrayList
Move-VerifiedDirectory "Qwen/Gemma (GGUF)" $llmSource (Join-Path $root "LLM") $moved
Move-VerifiedDirectory "Whisper/Hugging Face" $hfSource (Join-Path $root "HuggingFace") $moved
Move-VerifiedDirectory "Demucs/PyTorch" $torchSource (Join-Path $root "Torch") $moved

if ($aceSupported) {
    Install-AceStepJunction $aceSource $aceDestination
} else {
    Write-Host ""
    Write-Warning "Nao foi possivel consultar o diretorio de modelos pelo Python do ACE-Step."
    Write-Warning "Os modelos ACE-Step nao foram alterados. Confira ACESTEP_DIR e o Python portatil."
}

$configDir = Join-Path $env:LOCALAPPDATA "SocialNexus"
$configFile = Join-Path $configDir "model-storage.bat"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$configText = '@echo off' + [Environment]::NewLine + 'set "SOCIAL_NEXUS_MODELS_DIR=' + $root + '"' + [Environment]::NewLine
[IO.File]::WriteAllText($configFile, $configText, [Text.Encoding]::ASCII)

Write-Host ""
Write-Host "Configuracao compartilhada salva em:"
Write-Host $configFile
Write-Host ""
Write-Host "Os proximos downloads serao direcionados automaticamente para:"
Write-Host "  LLM:         $(Join-Path $root 'LLM')"
Write-Host "  HuggingFace: $(Join-Path $root 'HuggingFace')"
Write-Host "  PyTorch:     $(Join-Path $root 'Torch')"
if ($aceSupported) { Write-Host "  ACE-Step:    $aceDestination (via junction no caminho original)" }

if ($moved.Count -gt 0) {
    Write-Host ""
    $remove = Read-Host "As copias foram verificadas. Remover os originais para liberar espaco? [S/n]"
    if ([string]::IsNullOrWhiteSpace($remove) -or $remove -match '^(s|sim)$') {
        foreach ($item in $moved) {
            try {
                Remove-Item -LiteralPath $item.Source -Recurse -Force
                Write-Host "Origem removida: $($item.Source)"
            } catch {
                Write-Warning "Nao foi possivel remover $($item.Source). Os arquivos permanecem como copia de seguranca."
            }
        }
    } else {
        Write-Host "Os originais foram mantidos. Voce pode remove-los manualmente depois de testar as ferramentas."
    }
}

Write-Host ""
if ($aceSupported) { Write-Host "IMPORTANTE: mantenha o backup ACE-Step ate testar uma geracao. Apague-o manualmente somente depois do teste." }
Write-Host "Concluido. Feche e abra novamente as ferramentas para aplicar os novos caminhos."
Write-Host "Se o segundo SSD nao estiver conectado, as ferramentas avisarao e nao farao fallback silencioso para C:."
