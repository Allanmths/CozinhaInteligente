# 🍽️ Sistema de Cozinha Inteligente

[![Deploy to GitHub Pages](https://github.com/seu-usuario/CozinhaInteligente/actions/workflows/deploy.yml/badge.svg)](https://github.com/seu-usuario/CozinhaInteligente/actions/workflows/deploy.yml)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-181717?style=flat&logo=github&logoColor=white)](https://pages.github.com/)

**Sistema completo para gestão de custos e fichas técnicas em estabelecimentos gastronômicos**

🌐 **[Acesse o Sistema Online](https://seu-usuario.github.io/CozinhaInteligente/)**

## 🚀 Funcionalidades

### 📊 **Dashboard Inteligente**
- Análise de variações de custos em tempo real
- Gráficos interativos com Chart.js
- Estatísticas de insumos, fichas e pratos
- Indicadores visuais de performance

### 🥬 **Gestão de Insumos**
- Cadastro completo com unidades de medida
- Histórico de preços por fornecedor
- Sistema de filtros avançado
- Exportação CSV dos dados

### 📋 **Fichas Técnicas**
- Criação de receitas detalhadas
- Cálculo automático de custos
- Controle de rendimento
- Comparação com custos anteriores

### 🍽️ **Gestão de Pratos**
- Composição baseada em fichas técnicas
- Simulador de preços em tempo real
- Cálculo de margem de lucro
- Precificação automática

### 📄 **Importação XML**
- Processamento de notas fiscais (DANFE)
- Vinculação inteligente de produtos
- Sistema de revisão antes da importação
- Configuração de perdas e fatores

### 📈 **Relatórios Avançados**
- Análise de lucratividade
- Distribuição por fornecedor
- Custo total de estoque
- Funcionalidade de impressão

## 🛠️ Tecnologias

### **Frontend**
- **HTML5** - Estrutura semântica
- **Tailwind CSS** - Framework CSS utilitário
- **JavaScript ES6+** - Lógica de negócio
- **Chart.js** - Visualização de dados
- **Lucide Icons** - Ícones modernos

### **Backend & Cloud**
- **Firebase Firestore** - Banco de dados NoSQL
- **Firebase Auth** - Autenticação
- **GitHub Pages** - Hospedagem estática
- **GitHub Actions** - CI/CD automático

### **Infraestrutura**
- **PWA Ready** - Funciona offline
- **Mobile First** - Design responsivo
- **Dark Mode** - Suporte a tema escuro
- **Real-time Sync** - Sincronização em tempo real

## 🚀 Como Usar

### **1. Acesso Online**
```
https://seu-usuario.github.io/CozinhaInteligente/
```

### **2. Setup Local**
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/CozinhaInteligente.git

# Entre no diretório
cd CozinhaInteligente

# Abra o arquivo principal
open index.html
```

### **3. Configuração Firebase**
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Configure Firestore Database
3. **Configure as Regras de Segurança** (veja `FIREBASE_RULES_SETUP.md`)
4. Habilite Authentication (anônimo) - opcional
5. Copie as credenciais para `index.html`

> ⚠️ **Importante**: Para resolver erros de permissão, siga o guia em [`FIREBASE_RULES_SETUP.md`](./FIREBASE_RULES_SETUP.md)

## 📱 Características

### **💾 Persistência Híbrida**
- **Primário**: Firebase Firestore (nuvem)
- **Fallback**: LocalStorage (offline)
- **Sincronização**: Automática quando online

### **🔒 Segurança**
- Autenticação anônima automática
- Regras de segurança Firestore
- Validação de dados no frontend

### **📊 Analytics**
- Controle de variações de preços
- Alertas de custos em tempo real
- Histórico completo de transações

### **🎨 Interface**
- Design moderno e intuitivo
- Indicadores visuais de status
- Feedback em tempo real
- Navegação fluida

## 🏗️ Estrutura do Projeto

```
CozinhaInteligente/
├── index.html              # Página principal
├── js/
│   └── main.js             # Lógica principal
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD GitHub Actions
├── docs/
│   ├── FIREBASE_SETUP.md   # Guia de configuração
│   └── FEATURES.md         # Documentação completa
├── README.md               # Este arquivo
└── LICENSE                 # Licença MIT
```

## 📈 Roadmap

### **v2.1 - Em Desenvolvimento**
- [ ] Gestão completa de pratos
- [ ] Fichas técnicas avançadas
- [ ] Importação XML completa
- [ ] Relatórios PDF

### **v2.2 - Planejado**
- [ ] Multi-tenant (múltiplas empresas)
- [ ] Login com email/senha
- [ ] Integração com ERPs
- [ ] App mobile nativo

### **v3.0 - Futuro**
- [ ] Inteligência artificial para precificação
- [ ] Previsão de custos
- [ ] Análise de tendências de mercado
- [ ] Dashboard executivo

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

- **Documentação**: [Wiki do projeto](https://github.com/seu-usuario/CozinhaInteligente/wiki)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/CozinhaInteligente/issues)
- **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/CozinhaInteligente/discussions)

## 🎯 Casos de Uso

### **Restaurantes**
- Controle de custos de pratos
- Análise de lucratividade
- Gestão de fornecedores

### **Panificadoras**
- Fichas técnicas de receitas
- Controle de ingredientes
- Precificação automática

### **Catering & Eventos**
- Orçamentos precisos
- Análise de margem
- Controle de grandes volumes

### **Food Trucks**
- Gestão otimizada
- Controle móvel
- Análise de performance

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade gastronômica**

[🌐 Demo Online](https://seu-usuario.github.io/CozinhaInteligente/) • [📚 Documentação](docs/) • [🐛 Reportar Bug](https://github.com/seu-usuario/CozinhaInteligente/issues)

</div>
