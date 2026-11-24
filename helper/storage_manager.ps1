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
$aceDownloader = if ($aceDir) { Join-Path $aceDir "acestep\model_downloader.py" } else { "" }
$aceSupported = $aceDownloader -and (Test-Path -LiteralPath $aceDownloader) -and
    (Select-String -LiteralPath $aceDownloader -SimpleMatch "ACESTEP_CHECKPOINTS_DIR" -Quiet)
$aceSource = if ($env:ACESTEP_CHECKPOINTS_DIR) { $env:ACESTEP_CHECKPOINTS_DIR } elseif ($aceDir) { Join-Path $aceDir "checkpoints" } else { "" }

$moved = New-Object System.Collections.ArrayList
Move-VerifiedDirectory "Qwen/Gemma (GGUF)" $llmSource (Join-Path $root "LLM") $moved
Move-VerifiedDirectory "Whisper/Hugging Face" $hfSource (Join-Path $root "HuggingFace") $moved
Move-VerifiedDirectory "Demucs/PyTorch" $torchSource (Join-Path $root "Torch") $moved

if ($aceSupported) {
    Move-VerifiedDirectory "ACE-Step" $aceSource (Join-Path $root "ACE-Step") $moved
} else {
    Write-Host ""
    Write-Warning "A instalacao ACE-Step informada nao confirmou suporte a ACESTEP_CHECKPOINTS_DIR."
    Write-Warning "Os pesos do ACE-Step nao serao movidos. Atualize o ACE-Step 1.5 e execute este assistente novamente."
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
if ($aceSupported) { Write-Host "  ACE-Step:    $(Join-Path $root 'ACE-Step')" }

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
Write-Host "Concluido. Feche e abra novamente as ferramentas para aplicar os novos caminhos."
Write-Host "Se o segundo SSD nao estiver conectado, as ferramentas avisarao e nao farao fallback silencioso para C:."
