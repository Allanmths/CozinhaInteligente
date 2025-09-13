# 🔧 Debug dos Totais - Guia de Teste

## 🎯 **Problemas Identificados:**
1. **Total dos insumos zerado** mesmo com preços calculados
2. **Custo do prato incorreto** - não soma fichas técnicas + insumos individuais

## 🧪 **Como Debugar:**

### 1. **Acesse o Sistema:**
https://allanmths.github.io/CozinhaInteligente/

### 2. **Abra o Console do Navegador:**
- Pressione `F12`
- Vá para a aba "Console"

### 3. **Teste os Totais:**
```javascript
// Cole no console para testar:
debugTotais()
```

### 4. **O que Você Deve Ver no Console:**
```
🧪 === TESTE MANUAL DE TOTAIS ===
Container existe: true
Total element existe: true
Ingredientes encontrados: 2
Ingrediente 1: {insumo: "camarao123", quantidade: "50", preco: "R$ 2.94"}
Ingrediente 2: {insumo: "alho456", quantidade: "15", preco: "R$ 0.50"}
```

### 5. **Debug Automático:**
Quando você adicionar/alterar ingredientes, deve aparecer:
```
🔍 === INÍCIO DEBUG TOTAL INSUMOS ===
📊 Atualizando total - 2 ingredientes encontrados
  Texto original: "R$ 2.94"
  Processado: "2.94" -> 2.94
  Texto original: "R$ 0.50"  
  Processado: "0.50" -> 0.5
💰 Total final calculado: 3.44
✅ Elemento atualizado via textContent
```

### 6. **Debug do Custo do Prato:**
Ao visualizar um prato, deve aparecer:
```
💰 === CALCULANDO CUSTO DO PRATO ===
📝 Processando 2 ingredientes individuais...
  Camarão: 50g = R$ 2.94
  Alho: 15g = R$ 0.50
💵 Custo ingredientes individuais: R$ 3.44
📋 Processando 1 fichas técnicas...
  Molho Base: 1x = R$ 5.20
🍽️ Custo fichas técnicas: R$ 5.20
💎 CUSTO TOTAL FINAL: R$ 8.64
```

## 🔍 **Se Não Funcionar:**

### **Problema 1: Container não encontrado**
```javascript
// Verifique se o elemento existe:
document.getElementById('ingredientesList')
document.getElementById('totalInsumos')
```

### **Problema 2: Ingredientes não detectados**
```javascript
// Verifique a estrutura HTML:
document.querySelectorAll('.ingrediente-item')
```

### **Problema 3: Preços não encontrados**
```javascript
// Verifique divs de preço:
document.querySelectorAll('.ingrediente-preco')
```

## 📋 **Relatório:**
Após testar, me informe:
1. O que apareceu no console
2. Se o total foi atualizado visualmente
3. Se há algum erro específico

---

**🎯 Objetivo:** Total deve mostrar **R$ 3,44** para Camarão + Alho!