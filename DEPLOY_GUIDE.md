# 🚀 Script de Deploy Completo - Firebase + GitHub Pages

## ⚠️ **IMPORTANTE - Configurar Firebase Rules PRIMEIRO**

Antes de fazer deploy, você DEVE configurar as regras do Firebase:

### 1. 🔐 **Configurar Regras Firebase**
```bash
# 1. Acesse Firebase Console
open https://console.firebase.google.com/project/cozinha-inteligente-2b040/firestore/rules

# 2. Cole o conteúdo do arquivo firestore.rules
# 3. Clique em "Publish"
```

### 2. 📝 **Verificar Configuração**
- ✅ Firestore Database criado
- ✅ Regras de segurança aplicadas
- ✅ Credenciais no index.html corretas

### 3. 🚀 **Deploy Automático**
```bash
# O deploy acontece automaticamente via GitHub Actions
# Sempre que você fizer push para main
git add .
git commit -m "Deploy com Firebase configurado"
git push origin main
```

### 4. 🔍 **Verificar Deploy**
- Site: https://allanmths.github.io/CozinhaInteligente/
- Status Firebase: Deve mostrar "Conectado"
- Console: Sem erros de permissão

## 🛠️ **Solução de Problemas**

### ❌ Erro: "Missing or insufficient permissions"
**Solução**: Aplicar regras do Firebase
1. Vá para Firebase Console > Firestore > Rules
2. Cole o conteúdo de `firestore.rules`
3. Clique em "Publish"
4. Aguarde 1-2 minutos

### ❌ Erro: "Failed to load resource: 404"
**Solução**: Verificar GitHub Pages
1. GitHub > Settings > Pages
2. Source: Deploy from branch
3. Branch: main / (root)

### ❌ Erro: "Firebase project not found"
**Solução**: Verificar credenciais
1. Confirme projectId: `cozinha-inteligente-2b040`
2. Verifique apiKey no index.html
3. Regenere chaves se necessário

## ✅ **Checklist de Deploy**

- [ ] Firebase project criado
- [ ] Firestore Database habilitado
- [ ] Regras de segurança aplicadas
- [ ] Credenciais no código corretas
- [ ] GitHub Pages ativado
- [ ] Domain configurado (opcional)
- [ ] HTTPS forçado ativo
- [ ] Deploy workflow funcionando

## 🎯 **Próximos Passos**

1. **Testar Sistema**: Acessar URL e verificar funcionalidades
2. **Configurar Domínio**: (Opcional) Configurar domínio personalizado
3. **Monitorar**: Verificar logs do Firebase Console
4. **Otimizar**: Implementar índices Firestore conforme necessário
