#!/bin/bash

# 🚀 Script de Deploy para GitHub Pages
# Execute este script para fazer deploy do sistema

echo "🚀 Iniciando deploy do Sistema de Cozinha Inteligente..."

# Verificar se está no diretório correto
if [ ! -f "index.html" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar se o Git está inicializado
if [ ! -d ".git" ]; then
    echo "📁 Inicializando repositório Git..."
    git init
    git branch -M main
fi

# Adicionar todos os arquivos
echo "📦 Adicionando arquivos..."
git add .

# Verificar se há mudanças para commit
if git diff --staged --quiet; then
    echo "ℹ️  Nenhuma mudança para commit"
else
    # Solicitar mensagem de commit
    echo "💬 Digite a mensagem do commit (ou pressione Enter para usar a padrão):"
    read commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="feat: Deploy sistema para GitHub Pages"
    fi
    
    # Fazer commit
    echo "💾 Fazendo commit..."
    git commit -m "$commit_message"
fi

# Verificar se o remote origin está configurado
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Configure o remote origin primeiro:"
    echo "git remote add origin https://github.com/SEU-USUARIO/CozinhaInteligente.git"
    exit 1
fi

# Fazer push
echo "🚀 Fazendo push para GitHub..."
git push -u origin main

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🌐 Seu site estará disponível em:"
echo "https://SEU-USUARIO.github.io/CozinhaInteligente/"
echo ""
echo "📊 Acompanhe o status do deploy em:"
echo "https://github.com/SEU-USUARIO/CozinhaInteligente/actions"
echo ""
echo "⏰ O deploy pode levar 2-5 minutos para ficar online"
