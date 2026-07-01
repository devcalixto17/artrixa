# Script para sincronizar alteracoes com o GitHub
# Uso: .\sync-github.ps1 "mensagem do commit"

param(
    [string]$mensagem = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "Sincronizando com GitHub..." -ForegroundColor Cyan

# Adiciona todas as alteracoes (exceto arquivos no .gitignore)
git add .

# Verifica se ha alteracoes para commitar
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Nenhuma alteracao para sincronizar" -ForegroundColor Green
    exit 0
}

# Faz o commit
Write-Host "Fazendo commit: $mensagem" -ForegroundColor Yellow
git commit -m "$mensagem"

# Envia para o GitHub
Write-Host "Enviando para GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Sincronizacao concluida com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro ao sincronizar com GitHub" -ForegroundColor Red
    exit 1
}
