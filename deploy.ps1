# 🚀 Script de Deploy para GitHub Pages (PowerShell)
# Execute este script para fazer deploy do sistema

Write-Host "🚀 Iniciando deploy do Sistema de Cozinha Inteligente..." -ForegroundColor Green

# Verificar se está no diretório correto
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Erro: Execute este script no diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se o Git está inicializado
if (-not (Test-Path ".git")) {
    Write-Host "📁 Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Adicionar todos os arquivos
Write-Host "📦 Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Verificar se há mudanças para commit
$changes = git diff --staged --name-only
if ($changes.Count -eq 0) {
    Write-Host "ℹ️  Nenhuma mudança para commit" -ForegroundColor Gray
} else {
    # Solicitar mensagem de commit
    $commit_message = Read-Host "💬 Digite a mensagem do commit (ou pressione Enter para usar a padrão)"
    
    if ([string]::IsNullOrWhiteSpace($commit_message)) {
        $commit_message = "feat: Deploy sistema para GitHub Pages"
    }
    
    # Fazer commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
    git commit -m $commit_message
}

# Verificar se o remote origin está configurado
try {
    git remote get-url origin | Out-Null
} catch {
    Write-Host "🔗 Configure o remote origin primeiro:" -ForegroundColor Red
    Write-Host "git remote add origin https://github.com/SEU-USUARIO/CozinhaInteligente.git" -ForegroundColor Yellow
    exit 1
}

# Fazer push
Write-Host "🚀 Fazendo push para GitHub..." -ForegroundColor Green
git push -u origin main

Write-Host ""
Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Seu site estará disponível em:" -ForegroundColor Cyan
Write-Host "https://SEU-USUARIO.github.io/CozinhaInteligente/" -ForegroundColor Blue
Write-Host ""
Write-Host "📊 Acompanhe o status do deploy em:" -ForegroundColor Cyan
Write-Host "https://github.com/SEU-USUARIO/CozinhaInteligente/actions" -ForegroundColor Blue
Write-Host ""
Write-Host "⏰ O deploy pode levar 2-5 minutos para ficar online" -ForegroundColor Yellow
