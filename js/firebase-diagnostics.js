// Script para ajudar a diagnosticar e resolver problemas de conexão com Firebase
console.log('🔎 Firebase Diagnostics Tool carregado');

// Verificar status da conexão
function checkFirebaseConnection() {
    console.log('🔍 Verificando conexão com Firebase...');
    
    // Verificar se o Firebase está definido
    if (!window.firebase && !window.firebaseServices) {
        console.error('❌ Firebase não está definido. Possível problema de carregamento dos scripts.');
        return false;
    }
    
    // Verificar se a configuração está presente
    if (!window.firebaseConfig) {
        console.error('❌ Configuração do Firebase não encontrada (firebaseConfig).');
        return false;
    }
    
    // Verificar se a aplicação foi inicializada
    if (window.firebase && !firebase.apps || firebase.apps.length === 0) {
        console.error('❌ Aplicação Firebase não foi inicializada.');
        return false;
    }
    
    // Verificar se o Firestore está disponível
    if (!window.firebaseServices || !window.firebaseServices.db) {
        console.error('❌ Firestore não está disponível.');
        return false;
    }
    
    // Verificar autenticação
    const auth = window.firebaseServices?.getAuth ? window.firebaseServices.getAuth() : null;
    if (!auth) {
        console.error('❌ Serviço de autenticação não está disponível.');
        return false;
    }
    
    // Verificar usuário autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado. Login necessário para acessar o Firestore.');
        return false;
    }
    
    console.log('✅ Conexão com Firebase verificada e funcional!');
    return true;
}

// Função para restaurar a conexão com o Firebase
function repairFirebaseConnection() {
    console.log('🔧 Tentando restaurar conexão com Firebase...');
    
    try {
        // Tentar reinicializar o Firebase se necessário
        if (!window.firebaseServices || !window.isFirebaseReady) {
            console.log('🔄 Reinicializando Firebase...');
            
            // Verificar se temos a configuração
            if (!window.firebaseConfig) {
                console.error('❌ Configuração do Firebase não encontrada. Não é possível reinicializar.');
                return false;
            }
            
            // Salvar estado atual para não perder dados
            saveToLocalStorage();
            
            // Reinicializar Firebase com a configuração existente
            if (typeof initializeFirebase === 'function') {
                initializeFirebase();
                console.log('✅ Firebase reinicializado com sucesso!');
                return true;
            } else {
                console.error('❌ Função initializeFirebase não encontrada.');
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao tentar restaurar conexão:', error);
        return false;
    }
}

// Verificar e tentar corrigir o problema atual
function diagnoseAndFixFirebaseIssue() {
    console.log('🩺 Iniciando diagnóstico do Firebase...');
    
    // Verificar a conexão atual
    if (checkFirebaseConnection()) {
        console.log('✅ Firebase está funcionando corretamente!');
        return;
    }
    
    // Tentar reparar a conexão
    if (repairFirebaseConnection()) {
        console.log('🎉 Conexão com Firebase restaurada com sucesso!');
    } else {
        console.log('⚠️ Não foi possível restaurar a conexão com Firebase automáticamente.');
        console.log('📋 Sugestões:');
        console.log('  1. Verifique sua conexão com a internet');
        console.log('  2. Recarregue a página');
        console.log('  3. Limpe o cache do navegador');
        console.log('  4. Verifique se as credenciais do Firebase são válidas');
    }
}

// Adicionar botão de diagnóstico à página
function addDiagnosticButton() {
    const btnContainer = document.createElement('div');
    btnContainer.style.position = 'fixed';
    btnContainer.style.bottom = '20px';
    btnContainer.style.right = '20px';
    btnContainer.style.zIndex = '9999';
    
    const btn = document.createElement('button');
    btn.textContent = '🔧 Resolver Problema Firebase';
    btn.style.backgroundColor = '#f5f5f5';
    btn.style.border = '1px solid #ddd';
    btn.style.borderRadius = '4px';
    btn.style.padding = '8px 12px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    btn.style.transition = 'all 0.3s';
    
    btn.onmouseover = () => {
        btn.style.backgroundColor = '#e0e0e0';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#f5f5f5';
    };
    
    btn.onclick = () => {
        diagnoseAndFixFirebaseIssue();
    };
    
    btnContainer.appendChild(btn);
    document.body.appendChild(btnContainer);
}

// Executar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar botão de diagnóstico após 3 segundos (para dar tempo de tudo carregar)
    setTimeout(() => {
        addDiagnosticButton();
    }, 3000);
    
    // Verificar status após 5 segundos
    setTimeout(() => {
        if (!window.isFirebaseReady) {
            console.warn('⚠️ Firebase não inicializou corretamente após 5 segundos.');
        }
    }, 5000);
});