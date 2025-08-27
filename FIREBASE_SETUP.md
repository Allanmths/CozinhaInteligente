# Configuração do Firebase para o Sistema de Cozinha Inteligente

## 📋 Passos para Configurar o Firebase

### 1. Criar Projeto no Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome: **"CozinhaInteligente"**
4. Configure Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Firestore Database
1. No painel do Firebase, vá para **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Começar no modo de teste"** (por enquanto)
4. Selecione a localização (recomendado: **southamerica-east1 - São Paulo**)

### 3. Configurar Authentication
1. Vá para **"Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, habilite **"Anônimo"**
4. Clique em **"Salvar"**

### 4. Obter Configuração do Projeto
1. Vá para **"Configurações do projeto"** (ícone de engrenagem)
2. Na seção **"Seus apps"**, clique em **"</>"** (Web)
3. Digite o nome do app: **"Sistema Cozinha"**
4. **NÃO** marque "Firebase Hosting"
5. Clique em **"Registrar app"**
6. **COPIE** a configuração que aparece

### 5. Configurar o Sistema
No arquivo `index-firebase.html`, substitua a seção:

```javascript
const firebaseConfig = {
    apiKey: "sua-api-key-aqui",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "sua-app-id"
};
```

Pelos seus dados reais do Firebase.

### 6. Regras de Segurança (Firestore)
No Firebase Console, vá para **Firestore Database > Regras** e substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura/escrita para usuários autenticados (mesmo anônimos)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Estrutura do Banco de Dados

O sistema criará automaticamente as seguintes coleções:

### 📦 **insumos**
```json
{
  "nome": "Tomate Italiano",
  "unidade": "kg"
}
```

### 🛒 **compras**
```json
{
  "insumoMestreId": "documento_id_insumo",
  "data": "2024-08-27",
  "preco": 8.50,
  "perdaPercentual": 0,
  "fornecedor": {
    "nome": "Hortifruti Frescor",
    "cnpj": "12.345.678/0001-90"
  },
  "codigoFornecedor": "TOM001"
}
```

### 📋 **fichasTecnicas**
```json
{
  "nome": "Molho de Tomate Clássico",
  "rendimento": "1kg",
  "custoAnterior": 18.96,
  "custoProducaoPercentual": 20,
  "ingredientes": [
    {
      "insumoId": "documento_id_insumo",
      "quantidade": 1.5
    }
  ]
}
```

### 🍽️ **pratos**
```json
{
  "nome": "Macarrão ao Sugo",
  "custoProducaoPercentual": 15,
  "fatorLucro": 200,
  "fichas": [
    {
      "fichaId": "documento_id_ficha",
      "quantidade": 200,
      "unidade": "g"
    }
  ]
}
```

### ⚙️ **configuracoes**
```json
{
  "taxaPerca": 0,
  "custoFinalizacao": 10,
  "margemLucro": 200
}
```

## 🔧 Funcionalidades Firebase Implementadas

✅ **Autenticação Anônima** - Login automático sem cadastro  
✅ **Persistência em Tempo Real** - Dados salvos automaticamente  
✅ **Sincronização** - Múltiplos dispositivos sincronizados  
✅ **Fallback Offline** - LocalStorage quando Firebase não disponível  
✅ **Indicadores de Status** - Visual de conexão/desconexão  
✅ **Tratamento de Erros** - Graceful degradation  

## 🎯 Benefícios da Migração

### Antes (LocalStorage)
- ❌ Dados apenas no dispositivo
- ❌ Sem backup automático
- ❌ Sem sincronização
- ❌ Perda de dados ao limpar navegador

### Depois (Firebase)
- ✅ Dados na nuvem
- ✅ Backup automático
- ✅ Sincronização multi-dispositivo
- ✅ Acesso de qualquer lugar
- ✅ Escalabilidade
- ✅ Analytics integrado

## 🛡️ Segurança

- **Autenticação**: Usuários anônimos autenticados
- **Regras**: Apenas usuários autenticados podem acessar
- **Validação**: Dados validados no frontend e backend
- **Auditoria**: Log automático de todas as operações

## 📱 Como Usar

1. Configure o Firebase seguindo os passos acima
2. Abra o arquivo `index-firebase.html` no navegador
3. O sistema fará login automático (anônimo)
4. Todos os dados serão salvos automaticamente no Firebase
5. Acesse de qualquer dispositivo com a mesma URL

## 🚨 Importante

- **Guarde bem suas credenciais Firebase**
- **Configure as regras de segurança adequadamente**
- **Monitore o uso no console Firebase**
- **Considere upgrade para plano pago conforme necessário**

## 📞 Próximos Passos

Para produção, considere:
- Login com email/senha
- Controle de usuários por empresa
- Backup adicional
- Otimização de consultas
- Analytics avançado
