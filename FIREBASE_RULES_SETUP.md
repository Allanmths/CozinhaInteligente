# 🔐 Configuração das Regras de Segurança do Firebase Firestore

## 📋 Como aplicar as regras no Firebase Console

### 1. **Acesse o Firebase Console**
```
https://console.firebase.google.com/
```

### 2. **Selecione seu projeto**
- Clique no projeto: `cozinha-inteligente-2b040`

### 3. **Navegue para Firestore Database**
- No menu lateral, clique em **"Firestore Database"**
- Clique na aba **"Rules"** (Regras)

### 4. **Substitua as regras atuais**
- Apague todo o conteúdo atual do editor de regras
- Cole o conteúdo do arquivo `firestore.rules` deste repositório:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso completo para o sistema de cozinha
    // ATENÇÃO: Estas regras são permissivas para desenvolvimento/demonstração
    
    // Regras para as coleções do sistema
    match /insumos/{document} {
      allow read, write: if true;
    }
    
    match /compras/{document} {
      allow read, write: if true;
    }
    
    match /fichasTecnicas/{document} {
      allow read, write: if true;
    }
    
    match /pratos/{document} {
      allow read, write: if true;
    }
    
    match /configuracoes/{document} {
      allow read, write: if true;
    }
    
    // Regra padrão para outras coleções
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 5. **Publicar as regras**
- Clique no botão **"Publish"** (Publicar)
- Confirme a publicação

### 6. **Verificar funcionamento**
- Recarregue sua aplicação: https://allanmths.github.io/CozinhaInteligente/
- O erro de permissões deve desaparecer
- O status deve mostrar "Conectado ao Firebase"

## ⚠️ **Importante - Segurança**

### 🚨 **Regras Atuais (Desenvolvimento)**
As regras fornecidas permitem acesso completo a qualquer pessoa. Isso é adequado para:
- Desenvolvimento e testes
- Demonstrações
- Protótipos

### 🔒 **Para Produção - Implementar Autenticação**
Para um ambiente de produção, você deve:

1. **Habilitar Authentication no Firebase**
2. **Implementar login de usuários**
3. **Usar as regras seguras** (arquivo `firestore-rules-secure.example`)

### 📝 **Exemplo de Regras Seguras**
```javascript
// Apenas usuários autenticados podem acessar
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

## 🔧 **Solução de Problemas**

### ❌ Se ainda houver erro de permissões:
1. Aguarde 1-2 minutos após publicar as regras
2. Limpe o cache do navegador (Ctrl+F5)
3. Verifique se as regras foram salvas corretamente
4. Confirme que está no projeto correto: `cozinha-inteligente-2b040`

### ✅ **Sucesso:**
- Console sem erros de permissão
- Status "Conectado ao Firebase" visível
- Dados carregando normalmente
