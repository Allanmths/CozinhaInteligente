// 🐛 FERRAMENTA DE DEBUG PARA TESTES LOCAIS
// Cole este código no Console do navegador para debug avançado

console.log('🧪 INICIANDO FERRAMENTAS DE DEBUG');

// 1. Verificar estado do Firebase
window.debugFirebase = function() {
    console.log('=== DEBUG FIREBASE ===');
    console.log('Firebase Services:', window.firebaseServices ? '✅ Disponível' : '❌ Não disponível');
    console.log('Current User:', currentUser ? '✅ Logado' : '❌ Não logado');
    console.log('Firebase Ready:', isFirebaseReady ? '✅ Pronto' : '❌ Não pronto');
    
    if (currentUser) {
        console.log('User ID:', currentUser.uid);
        console.log('User Email:', currentUser.email);
        console.log('User Name:', currentUser.displayName);
    }
    
    return {
        services: window.firebaseServices,
        user: currentUser,
        ready: isFirebaseReady
    };
};

// 2. Verificar dados locais
window.debugData = function() {
    console.log('=== DEBUG DADOS ===');
    console.log('Insumos DB:', insumosDB.length, 'items');
    console.log('Fichas DB:', fichasTecnicasDB.length, 'items'); 
    console.log('Pratos DB:', pratosDB.length, 'items');
    console.log('Compras DB:', comprasDB.length, 'items');
    
    return {
        insumos: insumosDB,
        fichas: fichasTecnicasDB,
        pratos: pratosDB,
        compras: comprasDB
    };
};

// 3. Testar autenticação
window.debugAuth = function() {
    console.log('=== DEBUG AUTENTICAÇÃO ===');
    
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    
    console.log('Auth Container:', authContainer.classList.contains('hidden') ? '🔒 Oculto' : '👁️ Visível');
    console.log('App Container:', appContainer.classList.contains('hidden') ? '🔒 Oculto' : '👁️ Visível');
    
    return {
        authVisible: !authContainer.classList.contains('hidden'),
        appVisible: !appContainer.classList.contains('hidden')
    };
};

// 4. Limpar dados para teste
window.debugClear = function() {
    console.log('🧹 LIMPANDO DADOS PARA TESTE');
    insumosDB = [];
    fichasTecnicasDB = [];
    pratosDB = [];
    comprasDB = [];
    localStorage.clear();
    console.log('✅ Dados limpos');
};

// 5. Simular usuários para teste
window.debugCreateTestUser = function() {
    console.log('👤 CRIANDO USUÁRIO DE TESTE');
    
    // Preencher formulário automaticamente
    document.getElementById('registerName').value = 'Restaurante Teste Debug';
    document.getElementById('registerEmail').value = `teste.${Date.now()}@debug.com`;
    document.getElementById('registerPassword').value = '123456';
    document.getElementById('confirmPassword').value = '123456';
    document.getElementById('acceptTerms').checked = true;
    
    console.log('✅ Formulário preenchido - clique em "Criar Conta"');
};

// 6. Verificar erros
window.debugErrors = function() {
    console.log('=== ÚLTIMOS ERROS ===');
    
    // Interceptar erros futuros
    const originalError = console.error;
    console.error = function(...args) {
        console.log('🚨 ERRO DETECTADO:', args);
        originalError.apply(console, args);
    };
    
    console.log('✅ Monitor de erros ativado');
};

// 7. Teste completo automático
window.debugFullTest = function() {
    console.log('🚀 EXECUTANDO TESTE COMPLETO...');
    
    setTimeout(() => {
        console.log('1️⃣ Firebase:', debugFirebase());
    }, 100);
    
    setTimeout(() => {
        console.log('2️⃣ Dados:', debugData());
    }, 200);
    
    setTimeout(() => {
        console.log('3️⃣ Auth:', debugAuth());
    }, 300);
    
    setTimeout(() => {
        console.log('✅ TESTE COMPLETO FINALIZADO');
    }, 500);
};

// Atalhos rápidos
window.df = window.debugFirebase;
window.dd = window.debugData;
window.da = window.debugAuth;
window.dc = window.debugClear;
window.dt = window.debugCreateTestUser;
window.de = window.debugErrors;
window.dft = window.debugFullTest;

// Executar teste inicial
console.log('🎯 FERRAMENTAS DE DEBUG CARREGADAS');
console.log('📋 COMANDOS DISPONÍVEIS:');
console.log('• debugFirebase() ou df() - Estado do Firebase');
console.log('• debugData() ou dd() - Dados locais'); 
console.log('• debugAuth() ou da() - Estado da autenticação');
console.log('• debugClear() ou dc() - Limpar dados');
console.log('• debugCreateTestUser() ou dt() - Criar usuário teste');
console.log('• debugErrors() ou de() - Monitor de erros');
console.log('• debugFullTest() ou dft() - Teste completo');
console.log('');
console.log('🚀 Execute: dft() para teste automático completo');

// Auto-executar teste inicial
setTimeout(() => {
    console.log('🔄 Executando teste inicial...');
    debugFullTest();
}, 1000);
