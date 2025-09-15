// main.js - Sistema de Cozinha Inteligente v2.0
// Firebase Edition - GitHub Pages Ready

// --- FIREBASE E AUTENTICAÇÃO ---
let firebaseServices = null;

// Aguardar Firebase estar pronto
window.addEventListener('firebaseReady', () => {
    firebaseServices = window.firebaseServices;
    if (firebaseServices) {
        initializeApp();
    }
});

// Fallback caso o evento já tenha disparado
if (window.firebaseServices) {
    firebaseServices = window.firebaseServices;
    initializeApp();
}

// Estado de autenticação
let currentUser = null;
let isFirebaseReady = false;
let auth = null; // Instância do Firebase Auth
let currentRestaurant = null; // Dados do restaurante atual
let userRole = 'user'; // Papel do usuário: 'admin', 'manager', 'chef', 'user'

// --- BANCO DE DADOS ---
let insumosDB = [], comprasDB = [], fichasTecnicasDB = [], pratosDB = [], configuracoesDB = {}, fornecedoresDB = [];
let categoriasDB = []; // Array para categorias de insumos
let insumosParaRevisao = [];
const conversionFactors = { 'kg': 1000, 'g': 1, 'l': 1000, 'ml': 1 };
let charts = {};

// =====================================================
// 🔐 SISTEMA DE AUTENTICAÇÃO SEGURA
// =====================================================

// Verificar estado de autenticação
function setupAuthListener() {
    if (!auth) return;
    
    // Timestamp do início do loading
    const loadingStartTime = Date.now();
    const minimumLoadingTime = 500; // 500ms mínimo
    
    onAuthStateChanged(auth, async (user) => {
        // Calcular tempo decorrido
        const elapsedTime = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, minimumLoadingTime - elapsedTime);
        
        // Aguardar o tempo mínimo se necessário
        if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        if (user) {
            // 👤 USUÁRIO LOGADO
            currentUser = user;
            console.log(`🔐 === INÍCIO AUTENTICAÇÃO ===`);
            console.log(`👤 Email: ${user.email}`);
            console.log(`🆔 UID: ${user.uid}`);
            console.log(`📅 Criado em: ${user.metadata.creationTime}`);
            console.log(`🕒 Último login: ${user.metadata.lastSignInTime}`);
            
            showApp();
            
            // 🔄 CARREGAR DADOS DO USUÁRIO E RESTAURANTE
            try {
                console.log('🔄 Iniciando carregamento de dados...');
                await loadUserData();
                console.log('✅ === AUTENTICAÇÃO CONCLUÍDA COM SUCESSO ===');
            } catch (error) {
                console.error('❌ === ERRO NA AUTENTICAÇÃO ===');
                console.error('📋 Detalhes do erro:', error);
                console.error('📋 Stack trace:', error.stack);
                showAuthMessage('Erro ao carregar dados. Tente fazer login novamente.', 'error');
            }
        } else {
            // 🚪 USUÁRIO NÃO LOGADO
            currentUser = null;
            currentRestaurant = null;
            userRole = 'user';
            
            // Limpar dados
            insumosDB = [];
            fichasTecnicasDB = [];
            pratosDB = [];
            comprasDB = [];
            
            showAuth();
            console.log('🚪 Usuário deslogado - dados limpos');
        }
    });
}

// Exibir tela de carregamento
function showLoading() {
    document.getElementById('loadingContainer').classList.remove('hidden');
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

// Exibir tela de autenticação
function showAuth() {
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

// Exibir aplicação principal
function showApp() {
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    // Inicializar dados da aplicação
    carregarCategorias(); // Sempre carregar categorias
    if (!insumosDB.length) {
        renderDashboard();
    }
}

// Alternar entre abas de login/registro
function showAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tab === 'login') {
        loginTab.className = 'flex-1 py-2 px-4 bg-orange-600 text-white rounded-md font-medium transition-all';
        registerTab.className = 'flex-1 py-2 px-4 text-gray-700 rounded-md font-medium transition-all';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginTab.className = 'flex-1 py-2 px-4 text-gray-700 rounded-md font-medium transition-all';
        registerTab.className = 'flex-1 py-2 px-4 bg-orange-600 text-white rounded-md font-medium transition-all';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
    
    // Limpar mensagens
    hideAuthMessage();
}

// Login do usuário
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showAuthMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    setLoginLoading(true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showAuthMessage('Login realizado com sucesso!', 'success');
        
        // O onAuthStateChanged irá tratar o redirecionamento
        
    } catch (error) {
        logError('Erro no login', error);
        
        let message = 'Erro no login. Tente novamente.';
        if (error.code === 'auth/user-not-found') {
            message = 'Usuário não encontrado.';
        } else if (error.code === 'auth/wrong-password') {
            message = 'Senha incorreta.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'E-mail inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Muitas tentativas. Tente novamente em alguns minutos.';
        }
        
        showAuthMessage(message, 'error');
    } finally {
        setLoginLoading(false);
    }
}

// Registro do usuário
async function registerUser() {
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    // Verificar qual tipo de registro foi selecionado
    const registrationType = document.querySelector('input[name="registrationType"]:checked').value;
    
    if (!email || !password || !confirmPassword) {
        showAuthMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage('As senhas não coincidem.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    
    if (!acceptTerms) {
        if (!validateTermsAcceptance()) {
            showAuthMessage('Você deve aceitar os Termos de Uso e Política de Privacidade para prosseguir.', 'error');
        }
        return;
    }
    
    setRegisterLoading(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        showAuthMessage('Conta criada com sucesso!', 'success');
        
        if (registrationType === 'new') {
            // 🏢 CRIAR NOVO RESTAURANTE E USUÁRIO ADMIN
            const restaurantName = document.getElementById('registerName').value.trim();
            if (!restaurantName) {
                showAuthMessage('Por favor, informe o nome do restaurante.', 'error');
                return;
            }
            
            // Atualizar perfil do usuário
            await updateProfile(userCredential.user, {
                displayName: restaurantName
            });
            
            await createRestaurantAndUser(userCredential.user.uid, restaurantName, email);
            
        } else if (registrationType === 'join') {
            // 👥 JUNTAR-SE A RESTAURANTE EXISTENTE
            const restaurantCode = document.getElementById('joinRestaurantCode').value.trim();
            const staffName = document.getElementById('staffName').value.trim();
            
            if (!restaurantCode || !staffName) {
                showAuthMessage('Por favor, preencha o código do restaurante e seu nome.', 'error');
                return;
            }
            
            // Atualizar perfil do usuário
            await updateProfile(userCredential.user, {
                displayName: staffName
            });
            
            await joinExistingRestaurant(userCredential.user.uid, restaurantCode, staffName, email);
        }
        
        // O onAuthStateChanged irá tratar o redirecionamento
        
    } catch (error) {
        logError('Erro no registro', error);
        
        let message = 'Erro ao criar conta. Tente novamente.';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Este e-mail já está em uso.';
        } else if (error.code === 'auth/weak-password') {
            message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'E-mail inválido.';
        }
        
        showAuthMessage(message, 'error');
    } finally {
        setRegisterLoading(false);
    }
}

// Logout do usuário
async function logoutUser() {
    try {
        await signOut(auth);
        
        // Limpar dados locais
        insumosDB = [];
        fichasTecnicasDB = [];
        pratosDB = [];
        comprasDB = [];
        configuracoesDB = {};
        
        showAuthMessage('Logout realizado com sucesso!', 'success');
        
    } catch (error) {
        logError('Erro no logout', error);
        showAuthMessage('Erro ao fazer logout.', 'error');
    }
}

// Recuperar senha
async function resetPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        showAuthMessage('Digite seu e-mail no campo acima e clique em "Recuperar senha".', 'error');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthMessage('E-mail de recuperação enviado!', 'success');
    } catch (error) {
        logError('Erro na recuperação de senha', error);
        
        let message = 'Erro ao enviar e-mail de recuperação.';
        if (error.code === 'auth/user-not-found') {
            message = 'Usuário não encontrado.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'E-mail inválido.';
        }
        
        showAuthMessage(message, 'error');
    }
}

// 🏢 Criar restaurante e usuário admin
async function createRestaurantAndUser(userId, restaurantName, email) {
    try {
        if (!firebaseServices?.db) return;
        
        const { db, doc: fbDoc, setDoc } = firebaseServices;
        const restaurantId = generateId();
        
        // 1. Criar restaurante
        const accessCode = generateRestaurantCode();
        console.log(`🔑 Gerando código de acesso: ${accessCode}`);
        
        const restaurantRef = fbDoc(db, 'restaurants', restaurantId);
        const restaurantData = {
            name: restaurantName,
            accessCode: accessCode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerId: userId,
            status: 'active',
            settings: {
                currency: 'BRL',
                timezone: 'America/Sao_Paulo',
                features: {
                    multiUser: true,
                    reports: true,
                    inventory: true
                }
            }
        };
        
        console.log('🏢 Dados do restaurante a serem salvos:', restaurantData);
        await setDoc(restaurantRef, restaurantData);
        
        // 2. Criar usuário como admin do restaurante
        const userRef = fbDoc(db, 'users', userId);
        await setDoc(userRef, {
            name: restaurantName,
            email: email,
            restaurantId: restaurantId,
            role: 'admin',
            permissions: ['all'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        });
        
        console.log(`✅ Restaurante criado: ${restaurantId} para usuário: ${userId}`);
        
    } catch (error) {
        logError('Erro ao criar restaurante e usuário', error);
        throw error;
    }
}

// 👥 Juntar-se a restaurante existente
async function joinExistingRestaurant(userId, restaurantCode, staffName, email) {
    try {
        if (!firebaseServices?.db) {
            throw new Error('Firebase não disponível');
        }
        
        const { db, collection, query, where, getDocs, doc: fbDoc, setDoc } = firebaseServices;
        
        console.log(`🔍 Procurando restaurante com código: ${restaurantCode}`);
        
        // 1. Procurar restaurante pelo código
        const restaurantsRef = collection(db, 'restaurants');
        const q = query(restaurantsRef, where('accessCode', '==', restaurantCode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Código do restaurante inválido ou não encontrado.');
        }
        
        // 2. Pegar dados do restaurante encontrado
        const restaurantDoc = querySnapshot.docs[0];
        const restaurantData = restaurantDoc.data();
        const restaurantId = restaurantDoc.id;
        
        console.log(`✅ Restaurante encontrado: ${restaurantData.name} (${restaurantId})`);
        
        // 3. Criar usuário como funcionário do restaurante
        const userRef = fbDoc(db, 'users', userId);
        await setDoc(userRef, {
            name: staffName,
            email: email,
            restaurantId: restaurantId,
            restaurantName: restaurantData.name, // Para facilitar consultas
            role: 'user', // Papel padrão para funcionários
            permissions: ['read', 'write'], // Permissões básicas
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            joinedViaCode: restaurantCode // Auditoria
        });
        
        console.log(`✅ Usuário ${staffName} adicionado ao restaurante ${restaurantData.name}`);
        
    } catch (error) {
        console.error('❌ Erro ao juntar-se ao restaurante:', error);
        throw error;
    }
}

// Carregar dados do usuário e restaurante
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // 1. Carregar dados do usuário
        await loadUserProfile();
        
        // 2. Carregar dados do restaurante
        if (currentRestaurant) {
            await loadFromFirebase();
            renderDashboard();
        }
        
    } catch (error) {
        logError('Erro ao carregar dados do usuário', error);
        
        // Fallback para localStorage
        loadLocalData();
        renderDashboard();
    }
}

// Carregar perfil do usuário e dados do restaurante
async function loadUserProfile() {
    if (!firebaseServices || !currentUser) {
        console.error('❌ Firebase services ou currentUser não disponível');
        console.log('📋 firebaseServices:', firebaseServices);
        console.log('📋 currentUser:', currentUser);
        return;
    }
    
    try {
        const { db, doc: fbDoc, getDoc } = firebaseServices;
        
        console.log('🔍 === VERIFICANDO USUÁRIO NA BASE DE DADOS ===');
        console.log(`📂 Coleção: users`);
        console.log(`🆔 Documento: ${currentUser.uid}`);
        
        // 🔍 BUSCAR DADOS DO USUÁRIO NO FIREBASE
        const userRef = fbDoc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        console.log(`📋 Documento existe: ${userSnap.exists()}`);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // 🏢 DEFINIR RESTAURANTE E PAPEL DO USUÁRIO
            currentRestaurant = { 
                id: userData.restaurantId,
                name: userData.restaurantName || 'Carregando...'
            };
            userRole = userData.role || 'user';
            
            console.log(`✅ === USUÁRIO ENCONTRADO ===`);
            console.log(`📋 Dados do documento:`, userData);
            console.log(`👤 Nome: ${userData.name}`);
            console.log(`🏢 Restaurante ID: ${userData.restaurantId}`);
            console.log(`👔 Papel: ${userRole}`);
            
            // 🎨 ATUALIZAR INTERFACE COM INFORMAÇÕES DO USUÁRIO
            const userName = userData.name || currentUser.displayName || currentUser.email;
            const roleDisplay = getRoleDisplayName(userRole);
            
            // Texto mais compacto para evitar overflow
            const displayName = userName.length > 25 ? userName.substring(0, 22) + '...' : userName;
            document.getElementById('currentUserName').innerHTML = 
                `${displayName}<br><span class="text-xs text-orange-600">${roleDisplay} • ${currentRestaurant.name || 'Carregando...'}</span>`;
            
            // 🔐 MOSTRAR/OCULTAR MENUS BASEADO NO PAPEL
            updateUIBasedOnRole(userRole);
            
            // 🏢 CARREGAR INFORMAÇÕES DO RESTAURANTE
            await loadRestaurantInfo(userData.restaurantId);
            
            // � CARREGAR CÓDIGO DO RESTAURANTE PREEMPTIVAMENTE 
            if (userRole === 'admin' || userRole === 'manager') {
                setTimeout(() => {
                    carregarCodigoRestaurante();
                }, 500);
            }
            
            // �👥 DADOS DAS CONFIGURAÇÕES SERÃO CARREGADOS QUANDO A ABA FOR ACESSADA
            
        } else {
            console.warn('⚠️ === USUÁRIO NÃO ENCONTRADO - INICIANDO MIGRAÇÃO ===');
            console.log(`📧 Email do usuário: ${currentUser.email}`);
            console.log(`🆔 UID do usuário: ${currentUser.uid}`);
            console.log(`📅 Conta criada em: ${currentUser.metadata.creationTime}`);
            console.log(`🔄 Iniciando processo de migração...`);
            
            // 🆘 FALLBACK: Criar perfil para usuário existente
            await createProfileForExistingUser();
        }
        
    } catch (error) {
        logError('Erro ao carregar perfil do usuário', error);
        throw error;
    }
}

// Carregar informações do restaurante
async function loadRestaurantInfo(restaurantId) {
    try {
        const { db, doc: fbDoc, getDoc } = firebaseServices;
        
        const restaurantRef = fbDoc(db, 'restaurants', restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);
        
        if (restaurantSnap.exists()) {
            const restaurantData = restaurantSnap.data();
            currentRestaurant.name = restaurantData.name;
            
            console.log(`🏢 Restaurante carregado: ${restaurantData.name}`);
            
            // Atualizar título da página se necessário
            document.title = `${restaurantData.name} - Cozinha Inteligente`;
            
            // 🎨 ATUALIZAR INTERFACE COM NOME DO RESTAURANTE
            updateUserDisplayInfo();
            
        } else {
            console.warn('⚠️ Dados do restaurante não encontrados');
        }
        
    } catch (error) {
        logError('Erro ao carregar informações do restaurante', error);
    }
}

// Criar perfil para usuário existente (migração)
async function createProfileForExistingUser() {
    try {
        console.log('� === MIGRAÇÃO AUTOMÁTICA DE USUÁRIO ===');
        console.log(`👤 Usuário: ${currentUser.email}`);
        console.log(`🆔 UID: ${currentUser.uid}`);
        
        // Mostrar mensagem na interface
        showAuthMessage('Preparando sua conta... Isso pode levar alguns segundos.', 'info');
        
        // Determinar nome do restaurante baseado no usuário
        let restaurantName = 'Meu Restaurante';
        
        if (currentUser.displayName) {
            restaurantName = currentUser.displayName;
        } else if (currentUser.email) {
            const emailPart = currentUser.email.split('@')[0];
            restaurantName = `Restaurante ${emailPart.charAt(0).toUpperCase() + emailPart.slice(1)}`;
        }
        
        console.log(`🏢 Criando restaurante: ${restaurantName}`);
        
        // Criar restaurante e usuário admin
        await createRestaurantAndUser(currentUser.uid, restaurantName, currentUser.email);
        
        console.log('✅ Migração concluída - recarregando dados...');
        
        // Aguardar um momento para garantir que os dados foram salvos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recarregar perfil
        await loadUserProfile();
        
        console.log('🎉 Usuário migrado com sucesso!');
        
        // Remover mensagem de loading
        setTimeout(() => {
            hideAuthMessage();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro na migração do usuário:', error);
        showAuthMessage('Erro ao configurar sua conta. Tente fazer login novamente.', 'error');
        throw error;
    }
}

// Atualizar interface baseada no papel do usuário
function updateUIBasedOnRole(role) {
    const menuUsuarios = document.getElementById('menuUsuarios');
    
    // 👥 MOSTRAR MENU USUÁRIOS APENAS PARA ADMIN/MANAGER
    if (role === 'admin' || role === 'manager') {
        menuUsuarios?.classList.remove('hidden');
    } else {
        menuUsuarios?.classList.add('hidden');
    }
    
    console.log(`🎨 Interface atualizada para papel: ${role}`);
}

// Converter role para nome amigável
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Administrador',
        'manager': 'Gerente', 
        'chef': 'Chef',
        'user': 'Usuário'
    };
    return roleNames[role] || 'Usuário';
}

// Função que carrega dados específicos do usuário do Firebase
async function loadFromFirebase() {
    if (!firebaseServices || !currentUser) return;
    
    try {
        console.log('Carregando dados do usuário:', currentUser.uid);
        await loadFirebaseData();
        console.log('Dados carregados com sucesso');
    } catch (error) {
        console.error('Erro ao carregar dados do Firebase:', error);
        throw error;
    }
}

// Utilitários de UI para autenticação
function setLoginLoading(loading) {
    const btn = document.querySelector('#loginForm button');
    const text = document.getElementById('loginBtnText');
    const loader = document.getElementById('loginBtnLoader');
    
    if (loading) {
        btn.disabled = true;
        text.textContent = 'Entrando...';
        loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text.textContent = 'Entrar';
        loader.classList.add('hidden');
    }
}

function setRegisterLoading(loading) {
    const btn = document.querySelector('#registerForm button');
    const text = document.getElementById('registerBtnText');
    const loader = document.getElementById('registerBtnLoader');
    
    if (loading) {
        btn.disabled = true;
        text.textContent = 'Criando conta...';
        loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text.textContent = 'Criar Conta';
        loader.classList.add('hidden');
    }
}

function showAuthMessage(message, type) {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = message;
    messageDiv.className = `mt-4 p-3 rounded-lg text-sm ${
        type === 'error' 
            ? 'bg-red-100 text-red-700 border border-red-300' 
            : 'bg-green-100 text-green-700 border border-green-300'
    }`;
    messageDiv.classList.remove('hidden');
    
    // Auto hide após 5 segundos
    setTimeout(() => {
        hideAuthMessage();
    }, 5000);
}

function hideAuthMessage() {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.classList.add('hidden');
}

// Alternar entre campos de registro
function toggleRegistrationFields() {
    const registrationType = document.querySelector('input[name="registrationType"]:checked').value;
    const newFields = document.getElementById('newRestaurantFields');
    const joinFields = document.getElementById('joinRestaurantFields');
    
    if (registrationType === 'new') {
        newFields.classList.remove('hidden');
        joinFields.classList.add('hidden');
        
        // Tornar campos obrigatórios
        document.getElementById('registerName').required = true;
        document.getElementById('joinRestaurantCode').required = false;
        document.getElementById('staffName').required = false;
    } else {
        newFields.classList.add('hidden');
        joinFields.classList.remove('hidden');
        
        // Tornar campos obrigatórios
        document.getElementById('registerName').required = false;
        document.getElementById('joinRestaurantCode').required = true;
        document.getElementById('staffName').required = true;
    }
}

// =====================================================
// 🔐 FIM DO SISTEMA DE AUTENTICAÇÃO
// ===================================================== 

// === TRATAMENTO DE ERROS E LOGS ===
function logError(message, error = null) {
    console.warn(`[CozinhaInteligente] ${message}`, error || '');
}

function suppressExtensionErrors() {
    // Suprimir erros de extensões do navegador
    const originalError = window.console.error;
    window.console.error = function(...args) {
        const errorStr = args.join(' ').toLowerCase();
        if (errorStr.includes('extension') || 
            errorStr.includes('ethereum') || 
            errorStr.includes('runtime.lasterror') ||
            errorStr.includes('sender: failed') ||
            errorStr.includes('evmask') ||
            errorStr.includes('chrome-extension') ||
            errorStr.includes('moz-extension') ||
            errorStr.includes('evmask.js') ||
            errorStr.includes('script.bundle.js') ||
            errorStr.includes('content.js') ||
            errorStr.includes('cannot redefine property') ||
            errorStr.includes('failed to get initial state') ||
            errorStr.includes('please report this bug') ||
            errorStr.includes('uncaught typeerror') && errorStr.includes('ethereum')) {
            return; // Ignorar erros de extensões
        }
        originalError.apply(console, args);
    };

    // Suprimir logs de extensões também
    const originalLog = window.console.log;
    window.console.log = function(...args) {
        const logStr = args.join(' ').toLowerCase();
        if (logStr.includes('check phishing by url') ||
            logStr.includes('content.js') ||
            logStr.includes('passed.')) {
            return; // Ignorar logs de extensões
        }
        originalLog.apply(console, args);
    };

    // Suprimir warnings relacionados ao Tailwind CSS e extensões
    const originalWarn = window.console.warn;
    window.console.warn = function(...args) {
        const warnStr = args.join(' ').toLowerCase();
        if (warnStr.includes('plugins=forms,typography') ||
            warnStr.includes('aspect-ratio,line-clamp') ||
            warnStr.includes('tailwind') ||
            warnStr.includes('?plugins=') ||
            warnStr.includes('script.bundle') ||
            warnStr.includes('extension')) {
            return; // Ignorar warnings de Tailwind e extensões
        }
        originalWarn.apply(console, args);
    };
}

// Função auxiliar para verificar se elemento existe antes de usar
function safeGetElement(id, defaultValue = null) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            // Log silencioso - apenas para debug interno
            // console.warn(`Elemento ${id} não encontrado`);
            return defaultValue;
        }
        return element;
    } catch (error) {
        // Log silencioso para erros críticos apenas
        // console.warn(`Erro ao buscar elemento ${id}:`, error);
        return defaultValue;
    }
}

// Função auxiliar para pegar valor de input com verificação
function safeGetInputValue(id, defaultValue = '') {
    const element = safeGetElement(id);
    return element ? element.value : defaultValue;
}

// Função auxiliar para pegar valor numérico de input
function safeGetNumericValue(id, defaultValue = 0) {
    const element = safeGetElement(id);
    if (!element) return defaultValue;
    const value = parseFloat(element.value);
    return isNaN(value) ? defaultValue : value;
}

// Verificar integridade da página
function verificarIntegridadePagina() {
    const elementosEssenciais = [
        'dashboard', 'insumos', 'compras', 'fichas', 'pratos', 'importacao'
    ];
    
    const elementosFaltantes = [];
    elementosEssenciais.forEach(id => {
        if (!safeGetElement(id)) {
            elementosFaltantes.push(id);
        }
    });
    
    if (elementosFaltantes.length > 0) {
        // Apenas log silencioso - não mostrar warning no console
        // console.warn('Elementos não encontrados na página:', elementosFaltantes);
        return false;
    }
    
    // Log de sucesso apenas em modo debug
    // console.log('Integridade da página verificada com sucesso');
    return true;
}

// --- FUNÇÕES DE FIREBASE COM AUTENTICAÇÃO ---
async function initializeFirebase() {
    if (!firebaseServices) {
        console.log('Firebase services não estão disponíveis ainda');
        return;
    }
    
    try {
        showLoading(true);
        
        // Importar serviços do Firebase
        const { 
            getAuth, 
            createUserWithEmailAndPassword, 
            signInWithEmailAndPassword, 
            signOut, 
            onAuthStateChanged,
            sendPasswordResetEmail,
            updateProfile
        } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js');
        
        // Inicializar Auth
        auth = getAuth();
        
        // Disponibilizar funções globalmente para as funções de autenticação
        window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
        window.signInWithEmailAndPassword = signInWithEmailAndPassword;
        window.signOut = signOut;
        window.onAuthStateChanged = onAuthStateChanged;
        window.sendPasswordResetEmail = sendPasswordResetEmail;
        window.updateProfile = updateProfile;
        
        isFirebaseReady = true;
        
        console.log('Firebase conectado COM autenticação');
        showFirebaseStatus(true);
        
        // Configurar listener de autenticação
        setupAuthListener();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Erro na conexão Firebase:', error);
        showFirebaseStatus(false);
        
        // Fallback: mostrar tela de autenticação mesmo sem Firebase
        showAuth();
        showLoading(false);
    }
}

async function loadFirebaseData() {
    if (!firebaseServices || !currentUser || !currentRestaurant) {
        console.log('Firebase services, usuário ou restaurante não disponível');
        return;
    }
    
    // 🏢 MUDANÇA CRÍTICA: Dados compartilhados por RESTAURANTE
    const { db, collection, addDoc, getDocs, query, orderBy, where } = firebaseServices;
    
    try {
        // Verificar se o restaurante está definido
        if (!currentRestaurant || !currentRestaurant.id) {
            console.error('Erro: Restaurante não definido ou sem ID');
            loadLocalData(); // Carrega apenas dados locais como fallback
            return;
        }
        
        const restaurantId = currentRestaurant.id;
        
        // 🔐 CARREGAR DADOS COMPARTILHADOS DO RESTAURANTE
        const [insumosSnap, comprasSnap, fichasSnap, pratosSnap, configSnap, categoriasSnap, fornecedoresSnap] = await Promise.all([
            getDocs(query(collection(db, 'insumos'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'compras'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'fichasTecnicas'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'pratos'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'configuracoes'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'categorias'), where('restaurantId', '==', restaurantId))),
            getDocs(query(collection(db, 'fornecedores'), where('restaurantId', '==', restaurantId)))
        ]);
        
        // Processar dados
        insumosDB = insumosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        comprasDB = comprasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                       .sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordenar por data desc
        fichasTecnicasDB = fichasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        pratosDB = pratosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Processar categorias
        if (categoriasSnap.docs.length > 0) {
            const categoriasDoc = categoriasSnap.docs[0].data();
            categoriasDB = categoriasDoc.categorias || [];
        } else {
            categoriasDB = [];
        }
        
        // Processar fornecedores
        fornecedoresDB = fornecedoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Configurações (documento único)
        if (configSnap.docs.length > 0) {
            configuracoesDB = { id: configSnap.docs[0].id, ...configSnap.docs[0].data() };
        } else {
            // Criar configurações padrão
            configuracoesDB = { defaultTaxaPerca: 5, custoFinalizacao: 10, margemLucro: 200 };
            const docRef = await addDoc(collection(db, 'configuracoes'), configuracoesDB);
            configuracoesDB.id = docRef.id;
        }
        
        // Se não há dados, criar dados de exemplo
        if (insumosDB.length === 0) {
            await createSampleData({ db, collection, addDoc });
        }
        
        console.log('Dados carregados do Firebase');
        updateConnectionStatus('online');
        renderAll();
        
    } catch (error) {
        console.error('Erro ao carregar dados do Firebase:', error);
        showFirebaseStatus(false);
        updateConnectionStatus('offline');
        loadLocalData(); // Fallback
    } finally {
        showLoading(false);
    }
}

async function saveToFirebase(collection_name, data, docId = null) {
    // Verificações mais detalhadas
    if (!isFirebaseReady) {
        console.warn('Firebase não está inicializado, salvando localmente');
        return saveToLocalStorage();
    }
    
    if (!firebaseServices) {
        console.warn('Serviços do Firebase não estão disponíveis, salvando localmente');
        return saveToLocalStorage();
    }
    
    if (!currentUser) {
        console.warn('Usuário não está logado, salvando localmente');
        return saveToLocalStorage();
    }
    
    if (!currentRestaurant || !currentRestaurant.id) {
        console.warn('Restaurante não definido ou sem ID, salvando localmente');
        return saveToLocalStorage();
    }
    
    const { db, collection, addDoc, doc, updateDoc, setDoc } = firebaseServices;
    
    try {
        // 🏢 ADICIONAR restaurantId e metadados em TODOS os documentos
        const secureData = {
            ...data,
            restaurantId: currentRestaurant.id,
            userId: currentUser.uid, // Para auditoria - quem criou/editou
            updatedAt: new Date().toISOString(),
            updatedBy: {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                role: userRole
            }
        };
        
        // Adicionar createdAt apenas para novos documentos
        if (!docId) {
            secureData.createdAt = new Date().toISOString();
            secureData.createdBy = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                role: userRole
            };
        }
        
        if (docId) {
            // Validar se docId é uma string válida
            if (typeof docId !== 'string' || docId.trim() === '') {
                console.warn(`ID inválido para ${collection_name}:`, docId);
                return null;
            }
            
            // Usar setDoc ao invés de updateDoc para criar o documento se não existir
            await setDoc(doc(db, collection_name, docId), secureData, { merge: true });
            return docId;
        } else {
            // Criar novo documento
            const docRef = await addDoc(collection(db, collection_name), secureData);
            return docRef.id;
        }
    } catch (error) {
        // Se o erro for "not-found", é porque o documento foi excluído - isso é normal
        if (error.code === 'not-found') {
            console.log(`Documento ${docId} não encontrado em ${collection_name} - provavelmente foi excluído`);
            return docId;
        }
        console.error(`Erro ao salvar em ${collection_name}:`, error);
        // Não fazer throw do erro para não quebrar o processo de salvamento
        return null;
    }
}

async function deleteFromFirebase(collection_name, docId) {
    if (!isFirebaseReady || !firebaseServices) return;
    
    const { db, doc, deleteDoc } = firebaseServices;
    
    try {
        await deleteDoc(doc(db, collection_name, docId));
        console.log(`Documento ${docId} deletado de ${collection_name}`);
    } catch (error) {
        // Se o documento não existe, não é um erro crítico
        if (error.code === 'not-found') {
            console.log(`Documento ${docId} não encontrado em ${collection_name} - pode ser um item local`);
        } else {
            console.error(`Erro ao deletar de ${collection_name}:`, error);
        }
    }
}

// Função para criar dados de exemplo (simplificada)
async function createSampleData({ db, collection, addDoc }) {
    console.log('Sistema iniciado sem dados de exemplo');
}

function showLoading(show) {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.style.display = show ? 'flex' : 'none';
    }
}

function showFirebaseStatus(connected) {
    const statusEl = document.getElementById('firebaseStatus');
    if (statusEl) {
        if (connected) {
            statusEl.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
                    <i data-lucide="wifi" class="h-4 w-4 mr-2"></i>
                    <span>Conectado ao Firebase</span>
                </div>
            `;
            statusEl.classList.remove('hidden');
            setTimeout(() => statusEl.classList.add('hidden'), 3000);
        } else {
            statusEl.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
                    <i data-lucide="wifi-off" class="h-4 w-4 mr-2"></i>
                    <span>Modo Offline</span>
                </div>
            `;
            statusEl.classList.remove('hidden');
        }
        lucide.createIcons();
    }
}

function updateConnectionStatus(status) {
    const connectionEl = document.getElementById('connectionStatus');
    if (connectionEl) {
        if (status === 'online') {
            connectionEl.textContent = 'Conectado';
            connectionEl.className = 'text-xs mt-1 text-green-600';
        } else {
            connectionEl.textContent = 'Offline';
            connectionEl.className = 'text-xs mt-1 text-red-600';
        }
    }
}

// Fallback para localStorage
function loadLocalData() {
    insumosDB = JSON.parse(localStorage.getItem('insumosDB')) || [];
    
    const storedCategorias = localStorage.getItem('categoriasDB');
    console.log('🔍 localStorage categoriasDB raw:', storedCategorias);
    
    categoriasDB = JSON.parse(storedCategorias) || [];
    console.log('📂 categoriasDB carregadas:', [...categoriasDB]);
    
    comprasDB = JSON.parse(localStorage.getItem('comprasDB')) || [];
    
    fichasTecnicasDB = JSON.parse(localStorage.getItem('fichasTecnicasDB')) || [];
    
    pratosDB = JSON.parse(localStorage.getItem('pratosDB')) || [];
    
    configuracoesDB = JSON.parse(localStorage.getItem('configuracoesDB')) || { custoFinalizacao: 10, margemLucro: 200 };
    fornecedoresDB = JSON.parse(localStorage.getItem('fornecedoresDB')) || [];
    
    // Não chamamos saveData() aqui para evitar loop recursivo
    // quando o Firebase não está disponível
    
    console.log('Dados carregados do localStorage (fallback)');
    updateConnectionStatus('offline');
    showLoading(false);
    renderAll();
}

function saveToLocalStorage() {
    console.log('💾 saveToLocalStorage() iniciada');
    console.log('📊 Salvando categoriasDB:', [...categoriasDB]);
    
    try {
        localStorage.setItem('insumosDB', JSON.stringify(insumosDB));
        localStorage.setItem('comprasDB', JSON.stringify(comprasDB));
        localStorage.setItem('fichasTecnicasDB', JSON.stringify(fichasTecnicasDB));
        localStorage.setItem('pratosDB', JSON.stringify(pratosDB));
        localStorage.setItem('configuracoesDB', JSON.stringify(configuracoesDB));
        localStorage.setItem('fornecedoresDB', JSON.stringify(fornecedoresDB));
        localStorage.setItem('categoriasDB', JSON.stringify(categoriasDB));
        
        console.log('✅ Dados salvos no localStorage com sucesso');
        
        // Verificar se realmente foi salvo
        const saved = localStorage.getItem('categoriasDB');
        console.log('✔️ Verificação categoriasDB salva:', saved);
        
    } catch (error) {
        console.error('❌ Erro ao salvar no localStorage:', error);
    }
}

// Função de atalho para salvar dados
function salvarDados() {
    console.log('🔄 salvarDados() - usando saveData() para Firebase/localStorage');
    saveData(); // Usar função completa que decide entre Firebase e localStorage
    // Atualizar hora da última sincronização
    lastSyncTime = Date.now();
    
    // Mostrar feedback
    showToast('Dados salvos com sucesso', 'success');
}

// Função para sincronização manual com feedback visual
async function sincronizarManualmente() {
    try {
        // Verificar se está online
        if (!navigator.onLine) {
            showToast('Dispositivo offline. Não é possível sincronizar.', 'error');
            return;
        }
        
        // Verificar se Firebase está pronto
        if (!isFirebaseReady) {
            showToast('Firebase não está disponível. Salvando apenas localmente.', 'info');
            saveToLocalStorage();
            return;
        }
        
        // Mostrar indicador de carregamento
        const syncBtn = document.getElementById('sync-button');
        if (syncBtn) {
            syncBtn.innerHTML = '<i data-lucide="loader" class="h-5 w-5 animate-spin"></i>';
            syncBtn.disabled = true;
        }
        
        // Sincronizar dados
        await saveData();
        lastSyncTime = Date.now();
        
        // Atualizar interface
        if (syncBtn) {
            syncBtn.innerHTML = '<i data-lucide="check" class="h-5 w-5"></i>';
            setTimeout(() => {
                syncBtn.innerHTML = '<i data-lucide="refresh-cw" class="h-5 w-5"></i>';
                syncBtn.disabled = false;
                lucide.createIcons();
            }, 1500);
        }
        
        // Mostrar feedback
        showToast('Sincronização concluída com sucesso', 'success');
        
    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
        
        // Atualizar interface
        const syncBtn = document.getElementById('sync-button');
        if (syncBtn) {
            syncBtn.innerHTML = '<i data-lucide="alert-circle" class="h-5 w-5"></i>';
            setTimeout(() => {
                syncBtn.innerHTML = '<i data-lucide="refresh-cw" class="h-5 w-5"></i>';
                syncBtn.disabled = false;
                lucide.createIcons();
            }, 1500);
        }
        
        // Mostrar feedback de erro
        showToast('Falha na sincronização: ' + (error.message || 'Erro desconhecido'), 'error');
    }
}

// --- FUNÇÕES PRINCIPAIS ---
function getTodayDate() { 
    const t = new Date(); 
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; 
}

function renderAll() {
    populateFilters();
    renderDashboard();
    renderInsumos();
    renderPratos();
    renderFichas();
    renderConfiguracoes();
    carregarCategorias(); // Garantir que categorias sejam sempre carregadas
    updateStats();
    lucide.createIcons();
}

function updateStats() {
    // Validar e corrigir dados antes de atualizar estatísticas
    validateAndFixData();
    
    // Atualizar estatísticas do dashboard com verificação de existência
    const totalInsumos = document.getElementById('totalInsumos');
    const totalFichas = document.getElementById('totalFichas');
    const totalPratos = document.getElementById('totalPratos');
    const totalCompras = document.getElementById('totalCompras');
    
    if (totalInsumos) totalInsumos.textContent = insumosDB.length;
    if (totalFichas) totalFichas.textContent = fichasTecnicasDB.length;
    if (totalPratos) totalPratos.textContent = pratosDB.length;
    if (totalCompras) totalCompras.textContent = comprasDB.length;
}

function validateAndFixData() {
    // Verificar se todas as fichas técnicas têm insumos válidos
    fichasTecnicasDB.forEach(ficha => {
        if (ficha.ingredientes) {
            ficha.ingredientes = ficha.ingredientes.filter(ingrediente => {
                const insumoExiste = insumosDB.find(insumo => insumo.id === ingrediente.insumoId);
                if (!insumoExiste) {
                    console.warn(`Insumo ${ingrediente.insumoId} não encontrado na ficha ${ficha.nome}`);
                    return false;
                }
                return true;
            });
        }
    });
    
    // Verificar se todas as compras têm insumos válidos
    comprasDB = comprasDB.filter(compra => {
        const insumoExiste = insumosDB.find(insumo => insumo.id === compra.insumoMestreId);
        if (!insumoExiste) {
            console.warn(`Insumo ${compra.insumoMestreId} não encontrado na compra ${compra.id}`);
            return false;
        }
        return true;
    });
    
    // Verificar se todos os pratos têm fichas e insumos válidos
    pratosDB.forEach(prato => {
        if (prato.componentes) {
            prato.componentes = prato.componentes.filter(componente => {
                if (componente.tipo === 'ficha') {
                    const fichaExiste = fichasTecnicasDB.find(ficha => ficha.id === componente.fichaId);
                    if (!fichaExiste) {
                        console.warn(`Ficha ${componente.fichaId} não encontrada no prato ${prato.nome}`);
                        return false;
                    }
                }
                return true;
            });
        }
        
        if (prato.insumos) {
            prato.insumos = prato.insumos.filter(insumo => {
                const insumoExiste = insumosDB.find(ins => ins.id === insumo.insumoId);
                if (!insumoExiste) {
                    console.warn(`Insumo ${insumo.insumoId} não encontrado no prato ${prato.nome}`);
                    return false;
                }
                return true;
            });
        }
    });
}

// Variável para controlar o intervalo de sincronização automática
let autoSyncInterval;
let lastSyncTime = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos em milissegundos

// Controle de estado da sincronização automática
let autoSyncEnabled = true;

// Função para atualizar informação de última sincronização
function updateLastSyncInfo() {
    const syncButton = document.getElementById('sync-button');
    if (!syncButton) return;
    
    if (lastSyncTime === 0) {
        syncButton.setAttribute('title', 'Sincronizar dados - Nunca sincronizado');
        return;
    }
    
    const now = Date.now();
    const diff = now - lastSyncTime;
    
    let timeText = '';
    if (diff < 60000) { // menos de 1 minuto
        timeText = 'há alguns segundos';
    } else if (diff < 3600000) { // menos de 1 hora
        const minutes = Math.floor(diff / 60000);
        timeText = `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diff < 86400000) { // menos de 1 dia
        const hours = Math.floor(diff / 3600000);
        timeText = `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
        const days = Math.floor(diff / 86400000);
        timeText = `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    
    syncButton.setAttribute('title', `Sincronizar dados (última: ${timeText})`);
}

// Função para sincronização automática em segundo plano
function startAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }
    
    // Verificar configuração salva
    // Primeiro verificar no objeto de configurações, depois no localStorage
    if (configuracoesDB && typeof configuracoesDB.autoSyncEnabled !== 'undefined') {
        autoSyncEnabled = configuracoesDB.autoSyncEnabled;
    } else {
        const savedPreference = localStorage.getItem('autoSyncEnabled');
        if (savedPreference !== null) {
            autoSyncEnabled = savedPreference === 'true';
        }
    }
    
    console.log('🔄 Iniciando sincronização automática a cada 5 minutos - Estado: ' + 
                (autoSyncEnabled ? 'Ativada' : 'Desativada'));
    
    // Atualizar controle na interface se existir
    updateSyncControlUI();
    
    // Atualizar a cada minuto
    setInterval(updateLastSyncInfo, 60000);
    
    // Iniciar intervalo de sincronização
    autoSyncInterval = setInterval(async () => {
        try {
            // Atualizar informação de tempo
            updateLastSyncInfo();
            
            // Verificar se a sincronização automática está habilitada
            if (!autoSyncEnabled) {
                return;
            }
            
            // Verificar se é hora de sincronizar (para evitar sincronizações muito frequentes)
            const now = Date.now();
            if (now - lastSyncTime < SYNC_INTERVAL / 2) {
                console.log('⏱️ Sincronização ignorada - muito recente');
                return;
            }
            
            // Verificar se está online
            if (!navigator.onLine) {
                console.log('📵 Dispositivo offline - sincronização adiada');
                return;
            }
            
            // Verificar se Firebase está pronto
            if (!isFirebaseReady) {
                console.log('🔥 Firebase não está pronto - sincronização adiada');
                return;
            }
            
            console.log('🔄 Sincronização automática iniciada...');
            await saveData();
            lastSyncTime = Date.now();
            updateLastSyncInfo(); // Atualizar imediatamente após sincronização
            
            // Notificação discreta
            showToast('Dados sincronizados com sucesso', 'success', 2000);
            
        } catch (error) {
            console.error('❌ Erro na sincronização automática:', error);
            // Notificar erro apenas se for grave
            if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
                showToast('Falha na sincronização automática', 'error', 3000);
            }
        }
    }, SYNC_INTERVAL);
}

// Função para atualizar controle na interface
function updateSyncControlUI() {
    const syncToggle = document.getElementById('auto-sync-toggle');
    if (syncToggle) {
        syncToggle.checked = autoSyncEnabled;
    }
}

// Função para alternar estado da sincronização automática
function toggleAutoSync() {
    autoSyncEnabled = !autoSyncEnabled;
    
    // Salvar preferência
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled);
    
    // Notificar usuário
    showToast(
        `Sincronização automática ${autoSyncEnabled ? 'ativada' : 'desativada'}`, 
        'info', 
        2000
    );
    
    console.log(`🔄 Sincronização automática ${autoSyncEnabled ? 'ativada' : 'desativada'}`);
    
    // Atualizar interface
    updateSyncControlUI();
}

// Função para exibir notificações discretas
function showToast(message, type = 'info', duration = 3000) {
    // Verificar se já existe um toast container
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Criar elemento toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background-color: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        margin-top: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        min-width: 250px;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    // Adicionar ícone
    const icon = document.createElement('span');
    icon.innerHTML = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    icon.style.marginRight = '8px';
    toast.appendChild(icon);
    
    // Adicionar mensagem
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    toast.appendChild(messageEl);
    
    // Adicionar ao container
    toastContainer.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // Remover após duração
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
            
            // Remover container se não tiver mais toasts
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, duration);
}

document.addEventListener('DOMContentLoaded', () => { 
    // Verificar se o Firebase está disponível
    if (window.firebaseServices) {
        initializeFirebase();
        // Iniciar sincronização automática após 2 minutos (para dar tempo ao sistema inicializar)
        setTimeout(() => {
            // Verificar novamente se o Firebase está disponível antes de iniciar sincronização
            if (isFirebaseReady && firebaseServices && currentUser) {
                console.log('🔄 Iniciando serviço de sincronização automática...');
                startAutoSync();
                updateLastSyncInfo(); // Inicializar informação de sincronização
            } else {
                console.warn('⚠️ Firebase ainda não está pronto. Sincronização automática não iniciada.');
                // Mostrar mensagem ao usuário
                showToast('Sincronização automática desativada - Firebase não disponível', 'warning', 5000);
            }
        }, 120000); // 2 minutos
    } else {
        // Se Firebase não carregou, usar localStorage
        console.warn('Firebase não disponível, usando localStorage');
        loadLocalData();
    }
    
    // Monitorar status de conexão
    window.addEventListener('online', () => {
        console.log('🌐 Conexão restabelecida');
        showToast('Conexão restabelecida', 'success');
        // Tentar sincronizar se estiver online
        if (isFirebaseReady) {
            saveData();
        }
    });
    
    // Monitorar status de conexão offline
    window.addEventListener('offline', () => {
        console.log('📵 Conexão perdida');
        showToast('Conexão perdida - Trabalhando offline', 'info');
        
        // Atualizar botão de sincronização
        const syncBtn = document.getElementById('sync-button');
        if (syncBtn) {
            syncBtn.classList.add('opacity-50');
            syncBtn.setAttribute('title', 'Dispositivo offline - Sincronização indisponível');
        }
    });
});

// --- PERSISTÊNCIA DE DADOS ATUALIZADA ---
async function saveData() {
    // Verificar se podemos usar o Firebase ou se precisamos cair para localStorage
    if (!isFirebaseReady || !firebaseServices) {
        console.warn('Firebase não disponível. Usando localStorage.');
        saveToLocalStorage();
        return;
    }
    
    // Verificar se estamos em modo offline deliberado
    const offlineMode = localStorage.getItem('offlineMode') === 'true';
    if (offlineMode) {
        console.warn('Modo offline ativado pelo usuário. Usando localStorage.');
        saveToLocalStorage();
        return;
    }
    
    // Verificar se há usuário e restaurante
    // No modo de testes, permitimos salvar mesmo sem usuário/restaurante
    if ((!currentUser || !currentRestaurant || !currentRestaurant.id) && !window.testMode) {
        console.warn('Usuário ou restaurante não definidos. Usando localStorage.');
        saveToLocalStorage();
        
        // Definir um restaurante temporário para testes
        if (!window.testMode && !currentRestaurant) {
            window.testMode = true;
            currentRestaurant = {
                id: 'local_' + Date.now(),
                name: 'Restaurante Local',
                isLocalOnly: true
            };
            console.info('Modo de teste local ativado temporariamente.');
        }
        return;
    }
    
    // Firebase está disponível, tentar salvar
    try {
        // Salvar cada item individualmente
        const savePromises = [];
        
        // Salvar insumos
        insumosDB.forEach(insumo => {
            if (insumo.id) {
                savePromises.push(saveToFirebase('insumos', insumo, insumo.id));
            }
        });
        
        // Salvar compras
        comprasDB.forEach(compra => {
            if (compra.id && typeof compra.id === 'string' && compra.id.trim() !== '') {
                savePromises.push(saveToFirebase('compras', compra, compra.id));
            }
        });
        
        // Salvar fichas técnicas
        fichasTecnicasDB.forEach(ficha => {
            if (ficha.id) {
                savePromises.push(saveToFirebase('fichasTecnicas', ficha, ficha.id));
            }
        });
        
        // Salvar pratos
        pratosDB.forEach(prato => {
            if (prato.id) {
                savePromises.push(saveToFirebase('pratos', prato, prato.id));
            }
        });
        
        // Salvar configurações
        if (configuracoesDB.id) {
            savePromises.push(saveToFirebase('configuracoes', configuracoesDB, configuracoesDB.id));
        }
        
        // Salvar categorias (importante para persistência)
        if (categoriasDB.length > 0) {
            savePromises.push(saveToFirebase('categorias', { 
                categorias: categoriasDB, 
                restaurantId: currentRestaurant.id 
            }, 'categorias'));
        }
        
        // Salvar fornecedores
        fornecedoresDB.forEach(fornecedor => {
            if (fornecedor.id && typeof fornecedor.id === 'string' && fornecedor.id.trim() !== '') {
                savePromises.push(saveToFirebase('fornecedores', fornecedor, fornecedor.id));
            }
        });
        
        await Promise.all(savePromises);
        console.log('Dados sincronizados com Firebase (incluindo categorias)');
    } catch (error) {
        console.error('Erro ao sincronizar com Firebase:', error);
        saveToLocalStorage(); // Fallback
    }
}

// --- FUNÇÕES DE RELATÓRIOS ---
function gerarRelatorios() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    
    // Se não há datas definidas, usar últimos 30 dias
    let startDate, endDate;
    if (!dataInicio || !dataFim) {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    } else {
        startDate = new Date(dataInicio);
        endDate = new Date(dataFim);
    }
    
    // Filtrar compras por período
    const comprasFiltradas = comprasDB.filter(compra => {
        const dataCompra = new Date(compra.data);
        return dataCompra >= startDate && dataCompra <= endDate;
    });
    
    gerarCardsResumo(comprasFiltradas);
    gerarGraficoFornecedores(comprasFiltradas);
    gerarGraficoEvolucao(comprasFiltradas);
    gerarTabelaVariacao();
    gerarRankingFornecedores(comprasFiltradas);
    
    showAlert('Relatórios Gerados', 'Relatórios atualizados com sucesso!', 'success');
}

function gerarCardsResumo(comprasFiltradas) {
    // Total de compras
    const totalCompras = comprasFiltradas.reduce((total, compra) => total + compra.preco, 0);
    document.getElementById('relatorioTotalCompras').textContent = `R$ ${totalCompras.toFixed(2)}`;
    
    // Ticket médio
    const ticketMedio = comprasFiltradas.length > 0 ? totalCompras / comprasFiltradas.length : 0;
    document.getElementById('relatorioTicketMedio').textContent = `R$ ${ticketMedio.toFixed(2)}`;
    
    // Insumos ativos (com compras no período)
    const insumosAtivos = new Set(comprasFiltradas.map(c => c.insumoMestreId)).size;
    document.getElementById('relatorioInsumosAtivos').textContent = insumosAtivos;
    
    // Fornecedores únicos
    const fornecedores = new Set(comprasFiltradas.map(c => c.fornecedor?.nome).filter(Boolean)).size;
    document.getElementById('relatorioFornecedores').textContent = fornecedores;
}

function gerarGraficoFornecedores(comprasFiltradas) {
    // Agrupar por fornecedor
    const fornecedorData = {};
    comprasFiltradas.forEach(compra => {
        const fornecedor = compra.fornecedor?.nome || 'Sem Fornecedor';
        fornecedorData[fornecedor] = (fornecedorData[fornecedor] || 0) + compra.preco;
    });
    
    const labels = Object.keys(fornecedorData);
    const data = Object.values(fornecedorData);
    
    createChart('relatorioFornecedoresChart', 'pie', labels, data, 'Valor (R$)');
}

function gerarGraficoEvolucao(comprasFiltradas) {
    // Agrupar por mês
    const evolucaoData = {};
    comprasFiltradas.forEach(compra => {
        const data = new Date(compra.data);
        const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
        evolucaoData[mesAno] = (evolucaoData[mesAno] || 0) + compra.preco;
    });
    
    // Ordenar por data
    const sortedKeys = Object.keys(evolucaoData).sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1) - new Date(anoB, mesB - 1);
    });
    
    const labels = sortedKeys;
    const data = sortedKeys.map(key => evolucaoData[key]);
    
    createChart('relatorioEvolucaoChart', 'line', labels, data, 'Gastos (R$)');
}

function gerarTabelaVariacao() {
    const tbody = document.getElementById('relatorioVariacaoTableBody');
    const variacoes = [];
    
    // Calcular variações para cada insumo
    insumosDB.forEach(insumo => {
        const comprasInsumo = comprasDB.filter(c => c.insumoMestreId === insumo.id)
            .sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (comprasInsumo.length >= 2) {
            const precoAtual = comprasInsumo[0].preco;
            const precoAnterior = comprasInsumo[1].preco;
            const variacao = precoAtual - precoAnterior;
            const percentualVariacao = ((variacao / precoAnterior) * 100);
            
            variacoes.push({
                nome: insumo.nome,
                precoAtual,
                precoAnterior,
                variacao,
                percentualVariacao
            });
        }
    });
    
    if (variacoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Dados insuficientes para análise de variação</td></tr>';
        return;
    }
    
    tbody.innerHTML = variacoes.map(item => {
        const statusClass = item.variacao > 0 ? 'text-red-600' : item.variacao < 0 ? 'text-green-600' : 'text-gray-600';
        const statusIcon = item.variacao > 0 ? 'trending-up' : item.variacao < 0 ? 'trending-down' : 'minus';
        const statusText = item.variacao > 0 ? 'Aumento' : item.variacao < 0 ? 'Redução' : 'Estável';
        
        return `<tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="p-4 font-medium">${item.nome}</td>
            <td class="p-4 font-semibold text-green-700">R$ ${item.precoAtual.toFixed(2)}</td>
            <td class="p-4">R$ ${item.precoAnterior.toFixed(2)}</td>
            <td class="p-4 font-semibold ${statusClass}">${item.variacao >= 0 ? '+' : ''}R$ ${item.variacao.toFixed(2)}</td>
            <td class="p-4 font-semibold ${statusClass}">${item.percentualVariacao >= 0 ? '+' : ''}${item.percentualVariacao.toFixed(1)}%</td>
            <td class="p-4">
                <div class="flex items-center ${statusClass}">
                    <i data-lucide="${statusIcon}" class="h-4 w-4 mr-1"></i>
                    <span class="text-sm font-medium">${statusText}</span>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    lucide.createIcons();
}

function gerarRankingFornecedores(comprasFiltradas) {
    const tbody = document.getElementById('relatorioFornecedoresTableBody');
    
    // Agrupar dados por fornecedor
    const fornecedorStats = {};
    comprasFiltradas.forEach(compra => {
        const fornecedor = compra.fornecedor?.nome || 'Sem Fornecedor';
        if (!fornecedorStats[fornecedor]) {
            fornecedorStats[fornecedor] = {
                total: 0,
                quantidade: 0,
                ultimaCompra: compra.data
            };
        }
        fornecedorStats[fornecedor].total += compra.preco;
        fornecedorStats[fornecedor].quantidade += 1;
        
        // Atualizar última compra se for mais recente
        if (new Date(compra.data) > new Date(fornecedorStats[fornecedor].ultimaCompra)) {
            fornecedorStats[fornecedor].ultimaCompra = compra.data;
        }
    });
    
    // Converter para array e ordenar por total
    const ranking = Object.entries(fornecedorStats)
        .map(([nome, stats]) => ({ nome, ...stats }))
        .sort((a, b) => b.total - a.total);
    
    if (ranking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhum fornecedor encontrado no período</td></tr>';
        return;
    }
    
    tbody.innerHTML = ranking.map((fornecedor, index) => `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="p-4 font-bold text-orange-600">${index + 1}º</td>
            <td class="p-4 font-medium">${fornecedor.nome}</td>
            <td class="p-4 font-semibold text-green-700">R$ ${fornecedor.total.toFixed(2)}</td>
            <td class="p-4">${fornecedor.quantidade} compras</td>
            <td class="p-4">${new Date(fornecedor.ultimaCompra + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
        </tr>
    `).join('');
}

function exportarRelatorioCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Insumo,Preco Atual,Preco Anterior,Variacao,Percentual Variacao,Status\r\n";
    
    insumosDB.forEach(insumo => {
        const comprasInsumo = comprasDB.filter(c => c.insumoMestreId === insumo.id)
            .sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (comprasInsumo.length >= 2) {
            const precoAtual = comprasInsumo[0].preco;
            const precoAnterior = comprasInsumo[1].preco;
            const variacao = precoAtual - precoAnterior;
            const percentualVariacao = ((variacao / precoAnterior) * 100);
            const status = variacao > 0 ? 'Aumento' : variacao < 0 ? 'Redução' : 'Estável';
            
            const row = [
                insumo.nome,
                precoAtual.toFixed(2),
                precoAnterior.toFixed(2),
                variacao.toFixed(2),
                percentualVariacao.toFixed(1) + '%',
                status
            ].join(",");
            csvContent += row + "\r\n";
        }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_variacao_precos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function createChart(canvasId, type, labels, data, label) {
    const ctx = document.getElementById(canvasId);
    
    // Destruir gráfico anterior se existir
    if (window.chartsInstances && window.chartsInstances[canvasId]) {
        window.chartsInstances[canvasId].destroy();
    }
    
    if (!window.chartsInstances) {
        window.chartsInstances = {};
    }
    
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB'
    ];
    
    const chartConfig = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: type === 'pie' ? colors.slice(0, labels.length) : 'rgba(54, 162, 235, 0.2)',
                borderColor: type === 'pie' ? colors.slice(0, labels.length) : 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: type === 'line' ? false : true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type === 'pie' ? 'right' : 'top',
                }
            },
            scales: type === 'pie' ? {} : {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + (value || 0).toFixed(2);
                        }
                    }
                }
            }
        }
    };
    
    window.chartsInstances[canvasId] = new Chart(ctx, chartConfig);
}

// --- FUNÇÕES DE PRATOS ---
function renderPratos() {
    const tbody = document.getElementById('pratosTableBody');
    if (!tbody) return;
    
    if (pratosDB.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-gray-500">Nenhum prato cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = pratosDB.map(prato => {
        const custo = calcularCustoPrato(prato);
        const preco = prato.preco || 0;
        // Margem corrigida: (Preço - Custo) / Custo * 100 = margem sobre o custo
        const margem = custo > 0 && preco > 0 ? (((preco - custo) / custo) * 100) : 0;
        const statusClass = prato.status === 'ativo' ? 'bg-green-100 text-green-800' : 
                           prato.status === 'sazonal' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        
        return `<tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div>
                    <div class="font-medium text-gray-900">${prato.nome}</div>
                    <div class="text-sm text-gray-500">${prato.categoria || ''}</div>
                    ${prato.tempoPreparo ? `<div class="text-xs text-gray-400">${prato.tempoPreparo} min</div>` : ''}
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 capitalize">${prato.categoria || '-'}</td>
            <td class="px-6 py-4 text-sm font-semibold text-green-700">R$ ${(prato.preco || 0).toFixed(2)}</td>
            <td class="px-6 py-4 text-sm text-gray-900">R$ ${(custo || 0).toFixed(2)}</td>
            <td class="px-6 py-4 text-sm ${margem >= 30 ? 'text-green-600' : margem >= 15 ? 'text-yellow-600' : 'text-red-600'} font-medium">
                ${(margem || 0).toFixed(1)}%
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                    ${prato.status || 'ativo'}
                </span>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="flex space-x-2">
                    <button onclick="editPrato('${prato.id}')" 
                        class="text-blue-600 hover:text-blue-800" title="Editar">
                        <i data-lucide="edit" class="h-4 w-4"></i>
                    </button>
                    <button onclick="viewPratoDetails('${prato.id}')" 
                        class="text-green-600 hover:text-green-800" title="Ver Detalhes">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button onclick="deletePrato('${prato.id}')" 
                        class="text-red-600 hover:text-red-800" title="Excluir">
                        <i data-lucide="trash-2" class="h-4 w-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    lucide.createIcons();
}

function calcularCustoPrato(prato) {
    let custoTotal = 0;
    
    console.log('💰 === CALCULANDO CUSTO DO PRATO ===');
    console.log('Prato:', prato.nome || 'Sem nome');
    
    // Calcular custo dos ingredientes individuais usando cálculo proporcional
    if (prato.ingredientes && prato.ingredientes.length > 0) {
        console.log(`📝 Processando ${prato.ingredientes.length} ingredientes individuais...`);
        
        const custoIngredientes = prato.ingredientes.reduce((total, ingrediente) => {
            const insumo = insumosDB.find(i => i.id === ingrediente.insumoId);
            if (!insumo) {
                console.warn(`⚠️ Insumo não encontrado: ${ingrediente.insumoId}`);
                return total;
            }
            
            // Usar a função de cálculo proporcional que implementamos
            const custoIngrediente = calcularPrecoProporcionaIngrediente(
                ingrediente.insumoId, 
                ingrediente.quantidade, 
                ingrediente.unidade || insumo.unidade
            );
            
            console.log(`  ${insumo.nome}: ${ingrediente.quantidade}${ingrediente.unidade || insumo.unidade} = R$ ${custoIngrediente.toFixed(2)}`);
            
            return total + custoIngrediente;
        }, 0);
        
        console.log(`💵 Custo ingredientes individuais: R$ ${custoIngredientes.toFixed(2)}`);
        custoTotal += custoIngredientes;
    }
    
    // Calcular custo das fichas técnicas (suporte para ambas estruturas)
    const fichasParaProcessar = prato.fichasTecnicas || prato.fichas;
    if (fichasParaProcessar && fichasParaProcessar.length > 0) {
        console.log(`📋 Processando ${fichasParaProcessar.length} fichas técnicas...`);
        
        const custoFichas = fichasParaProcessar.reduce((total, fichaItem) => {
            const ficha = fichasTecnicasDB.find(f => f.id === fichaItem.fichaId);
            if (!ficha) {
                console.warn(`⚠️ Ficha técnica não encontrada: ${fichaItem.fichaId}`);
                return total;
            }
            
            // Calcular o custo da ficha técnica baseado nos seus ingredientes
            const custoFicha = calcularCustoFichaTecnica(ficha);
            
            // Calcular custo proporcional baseado na quantidade e unidade
            let custoFichaUsada = 0;
            if (ficha.rendimento && ficha.unidade) {
                // Se tem rendimento definido, calcular proporcionalmente
                const rendimentoNumerico = parseFloat(ficha.rendimento) || 1;
                const quantidadeUsada = fichaItem.quantidade || 1;
                
                // Custo por unidade de rendimento
                const custoPorUnidade = custoFicha / rendimentoNumerico;
                custoFichaUsada = custoPorUnidade * quantidadeUsada;
                
                console.log(`  ${ficha.nome}: ${quantidadeUsada}x (rend. ${rendimentoNumerico}) = R$ ${custoFichaUsada.toFixed(2)}`);
            } else {
                // Se não tem rendimento, usar quantidade diretamente
                custoFichaUsada = custoFicha * (fichaItem.quantidade || 1);
                console.log(`  ${ficha.nome}: ${fichaItem.quantidade || 1}x = R$ ${custoFichaUsada.toFixed(2)}`);
            }
            
            return total + custoFichaUsada;
        }, 0);
        
        console.log(`🍽️ Custo fichas técnicas: R$ ${custoFichas.toFixed(2)}`);
        custoTotal += custoFichas;
    }
    
    // Adicionar custos de produção se definidos
    if (prato.custoFinalizacao && prato.custoFinalizacao > 0) {
        const custoProducao = custoTotal * (prato.custoFinalizacao / 100);
        console.log(`🔧 Custo de finalização (${prato.custoFinalizacao}%): R$ ${custoProducao.toFixed(2)}`);
        custoTotal += custoProducao;
    }
    
    console.log(`💎 CUSTO TOTAL FINAL: R$ ${custoTotal.toFixed(2)}`);
    console.log('💰 === FIM CÁLCULO CUSTO PRATO ===');
    
    return custoTotal;
}

function calcularCustoFichaTecnica(ficha) {
    if (!ficha.ingredientes || ficha.ingredientes.length === 0) return 0;
    
    // Calcular custo base dos ingredientes usando preço com taxa de correção
    const custoBase = ficha.ingredientes.reduce((total, ingrediente) => {
        const insumo = insumosDB.find(i => i.id === ingrediente.insumoId);
        if (!insumo) return total;
        
        // Usar a função que calcula preço com taxa de correção
        const precoComTaxa = getPrecoComTaxaCorrecao(insumo.id);
        if (precoComTaxa <= 0) return total;
        
        // O preço já inclui a taxa de correção do insumo
        const custoIngrediente = precoComTaxa * ingrediente.quantidade;
        
        return total + custoIngrediente;
    }, 0);
    
    // Aplicar taxa de correção (se houver)
    let custoComCorrecao = custoBase;
    if (ficha.taxaCorrecao && ficha.taxaCorrecao > 0) {
        const fatorCorrecao = ficha.taxaCorrecao / 100;
        if (ficha.tipoCorrecao === 'incremento') {
            // Incremento aumenta o custo (para perdas)
            custoComCorrecao = custoBase * (1 + fatorCorrecao);
        } else if (ficha.tipoCorrecao === 'decremento') {
            // Decremento diminui o custo (para maior aproveitamento)
            custoComCorrecao = custoBase * (1 - fatorCorrecao);
        }
    }
    
    // Aplicar custo de finalização (aumenta o custo)
    const custoFinal = custoComCorrecao * (1 + (ficha.custoFinalizacao || 0) / 100);
    
    return custoFinal;
}

function filtrarPratos() {
    const filtroTexto = document.getElementById('filtroPrato').value.toLowerCase();
    const filtroCategoria = document.getElementById('filtroCategoriaPrato').value;
    const filtroStatus = document.getElementById('filtroStatusPrato').value;
    
    const pratosOriginal = [...pratosDB];
    
    pratosDB = pratosOriginal.filter(prato => {
        const matchTexto = !filtroTexto || 
            prato.nome.toLowerCase().includes(filtroTexto) ||
            (prato.descricao && prato.descricao.toLowerCase().includes(filtroTexto));
        
        const matchCategoria = !filtroCategoria || prato.categoria === filtroCategoria;
        const matchStatus = !filtroStatus || prato.status === filtroStatus;
        
        return matchTexto && matchCategoria && matchStatus;
    });
    
    renderPratos();
    pratosDB = pratosOriginal; // Restaurar array original
}

function savePrato(event) {
    event.preventDefault();
    
    const id = document.getElementById('pratoId').value;
    const prato = {
        nome: document.getElementById('pratoNome').value,
        categoria: document.getElementById('pratoCategoria').value,
        preco: parseFloat(document.getElementById('pratoPreco').value),
        tempoPreparo: parseInt(document.getElementById('pratoTempoPreparo').value) || null,
        porcoes: parseInt(document.getElementById('pratoPorcoes').value) || 1,
        descricao: document.getElementById('pratoDescricao').value,
        custoFinalizacao: parseFloat(document.getElementById('pratoCustoFinalizacao').value) || 0,
        margemLucro: parseFloat(document.getElementById('pratoMargemLucro').value) || 0,
        status: document.getElementById('pratoStatus').value,
        ingredientes: getIngredientesFromForm(),
        fichasTecnicas: getFichasTecnicasFromForm(),
        dataAtualizacao: new Date().toISOString().split('T')[0]
    };
    
    if (id) {
        // Editar prato existente
        const index = pratosDB.findIndex(p => p.id === id);
        if (index !== -1) {
            pratosDB[index] = { ...pratosDB[index], ...prato };
            showAlert('Prato Atualizado', 'Prato atualizado com sucesso!', 'success');
        }
    } else {
        // Adicionar novo prato
        prato.id = 'prato_' + Date.now();
        prato.dataCriacao = new Date().toISOString().split('T')[0];
        pratosDB.push(prato);
        showAlert('Prato Criado', 'Prato adicionado com sucesso!', 'success');
    }
    
    saveData();
    renderPratos();
    updateStats();
    hideModal('pratoModal');
    resetPratoForm();
}

function editPrato(id) {
    const prato = pratosDB.find(p => p.id === id);
    if (!prato) return;
    
    document.getElementById('pratoModalTitle').textContent = 'Editar Prato';
    document.getElementById('pratoId').value = prato.id;
    document.getElementById('pratoNome').value = prato.nome;
    document.getElementById('pratoCategoria').value = prato.categoria || '';
    document.getElementById('pratoPreco').value = prato.preco;
    document.getElementById('pratoTempoPreparo').value = prato.tempoPreparo || '';
    document.getElementById('pratoPorcoes').value = prato.porcoes || 1;
    document.getElementById('pratoDescricao').value = prato.descricao || '';
    document.getElementById('pratoCustoFinalizacao').value = prato.custoFinalizacao || '';
    document.getElementById('pratoMargemLucro').value = prato.margemLucro || '';
    document.getElementById('pratoStatus').value = prato.status || 'ativo';
    
    // Carregar ingredientes e fichas técnicas
    loadIngredientesIntoForm(prato.ingredientes || []);
    loadFichasTecnicasIntoForm(prato.fichasTecnicas || []);
    
    showModal('pratoModal');
}

function deletePrato(id) {
    if (confirm('Tem certeza que deseja excluir este prato?')) {
        // Remover do array local
        pratosDB = pratosDB.filter(p => p.id !== id);
        
        // Deletar do Firebase se estiver conectado (sem bloquear a exclusão)
        if (isFirebaseReady) {
            deleteFromFirebase('pratos', id);
        }
        
        saveData();
        renderPratos();
        updateStats();
        showAlert('Prato Excluído', 'Prato removido com sucesso!', 'success');
    }
}

function viewPratoDetails(id) {
    const prato = pratosDB.find(p => p.id === id);
    if (!prato) return;
    
    const custo = calcularCustoPrato(prato);
    // Margem corrigida: (Preço - Custo) / Custo * 100 = margem sobre o custo
    const margem = custo > 0 && prato.preco > 0 ? (((prato.preco - custo) / custo) * 100) : 0;
    
    let ingredientesHtml = '';
    if (prato.ingredientes && prato.ingredientes.length > 0) {
        ingredientesHtml = prato.ingredientes.map(ing => {
            const insumo = insumosDB.find(i => i.id === ing.insumoId);
            if (!insumo) {
                return `<li class="flex justify-between">
                    <span>Insumo não encontrado</span>
                    <span>${ing.quantidade} ${ing.unidade || ''}</span>
                </li>`;
            }
            
            // Calcular o custo do insumo considerando quantidade e unidade
            const precoComTaxa = getPrecoComTaxaCorrecao(insumo.id);
            const custoIngrediente = precoComTaxa * ing.quantidade;
            
            return `<li class="flex justify-between items-center">
                <div>
                    <span class="font-medium">${insumo.nome}</span>
                    <div class="text-sm text-gray-500">${ing.quantidade} ${ing.unidade || insumo.unidade}</div>
                </div>
                <div class="text-right">
                    <span class="font-semibold text-green-700">R$ ${custoIngrediente.toFixed(2)}</span>
                    <div class="text-sm text-gray-500">R$ ${precoComTaxa.toFixed(2)}/${insumo.unidade}</div>
                </div>
            </li>`;
        }).join('');
    } else {
        ingredientesHtml = '<li class="text-gray-500">Nenhum insumo individual cadastrado</li>';
    }
    
    let fichasHtml = '';
    
    // Verificar se usa a estrutura nova (fichasTecnicas) ou antiga (fichas)
    const fichasParaProcessar = prato.fichasTecnicas || prato.fichas;
    
    if (fichasParaProcessar && fichasParaProcessar.length > 0) {
        fichasHtml = fichasParaProcessar.map(fichaItem => {
            const ficha = fichasTecnicasDB.find(f => f.id === fichaItem.fichaId);
            if (!ficha) {
                return `<li class="flex justify-between">
                    <span>Ficha não encontrada</span>
                    <span>${fichaItem.quantidade || 1}${fichaItem.unidade || 'x'}</span>
                </li>`;
            }
            
            // Calcular custo da ficha técnica
            const custoFichaTecnica = calcularCustoFichaTecnica(ficha);
            
            // Calcular custo proporcional baseado na quantidade/unidade usada no prato
            let custoFichaUsada = 0;
            let quantidadeFormatada = '';
            
            if (ficha.rendimento && ficha.unidade) {
                // Se tem rendimento definido, calcular proporcionalmente
                const rendimentoNumerico = parseFloat(ficha.rendimento) || 1;
                const quantidadeUsada = fichaItem.quantidade || 1;
                
                // Custo por unidade de rendimento
                const custoPorUnidade = custoFichaTecnica / rendimentoNumerico;
                custoFichaUsada = custoPorUnidade * quantidadeUsada;
                
                // Formatação da quantidade (estrutura antiga vs nova)
                if (fichaItem.unidade) {
                    // Estrutura antiga com unidade separada
                    quantidadeFormatada = `${quantidadeUsada} ${fichaItem.unidade} de ${ficha.rendimento} ${ficha.unidade}`;
                } else {
                    // Estrutura nova
                    quantidadeFormatada = `${quantidadeUsada} ${ficha.unidade || 'porção'} de ${ficha.rendimento} ${ficha.unidade || ''}`;
                }
            } else {
                // Se não tem rendimento, usar quantidade diretamente
                custoFichaUsada = custoFichaTecnica * (fichaItem.quantidade || 1);
                quantidadeFormatada = `${fichaItem.quantidade || 1}${fichaItem.unidade || 'x'}`;
            }
            
            return `<li class="flex justify-between items-center">
                <div>
                    <span class="font-medium">${ficha.nome}</span>
                    <div class="text-sm text-gray-500">${quantidadeFormatada}</div>
                </div>
                <div class="text-right">
                    <span class="font-semibold text-blue-700">R$ ${custoFichaUsada.toFixed(2)}</span>
                    <div class="text-sm text-gray-500">
                        R$ ${custoFichaTecnica.toFixed(2)} total
                        ${ficha.rendimento ? ` / ${ficha.rendimento} ${ficha.unidade || ''}` : ' (custo total)'}
                    </div>
                </div>
            </li>`;
        }).join('');
    } else {
        fichasHtml = '<li class="text-gray-500">Nenhuma ficha técnica cadastrada</li>';
    }
    
    const detailsHtml = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome</label>
                    <p class="text-gray-900">${prato.nome}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Categoria</label>
                    <p class="text-gray-900 capitalize">${prato.categoria || '-'}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Preço</label>
                    <p class="text-lg font-semibold text-green-700">R$ ${prato.preco.toFixed(2)}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Custo</label>
                    <p class="text-lg font-semibold">R$ ${custo.toFixed(2)}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Margem</label>
                    <p class="text-lg font-semibold ${margem >= 30 ? 'text-green-600' : margem >= 15 ? 'text-yellow-600' : 'text-red-600'}">${margem.toFixed(1)}%</p>
                </div>
            </div>
            
            ${prato.tempoPreparo ? `
            <div>
                <label class="block text-sm font-medium text-gray-700">Tempo de Preparo</label>
                <p class="text-gray-900">${prato.tempoPreparo} minutos</p>
            </div>
            ` : ''}
            
            ${prato.descricao ? `
            <div>
                <label class="block text-sm font-medium text-gray-700">Descrição</label>
                <p class="text-gray-900">${prato.descricao}</p>
            </div>
            ` : ''}
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Fichas Técnicas</label>
                <ul class="bg-blue-50 rounded-lg p-4 space-y-3 mb-4">
                    ${fichasHtml}
                </ul>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Insumos Individuais</label>
                <ul class="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                    ${ingredientesHtml}
                </ul>
            </div>
            
            <!-- Resumo dos Custos -->
            <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <i class="h-4 w-4 mr-2" data-lucide="calculator"></i>
                    Resumo de Custos
                </h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Custo Base:</span>
                        <span class="font-medium">R$ ${custo.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Margem:</span>
                        <span class="font-medium ${margem >= 30 ? 'text-green-600' : margem >= 15 ? 'text-yellow-600' : 'text-red-600'}">${margem.toFixed(1)}%</span>
                    </div>
                    <div class="flex justify-between font-semibold text-base pt-2 border-t">
                        <span class="text-gray-700">Preço de Venda:</span>
                        <span class="text-green-700">R$ ${(prato.preco || 0).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between font-semibold text-base pt-2 border-t">
                        <span class="text-gray-700">Lucro por Prato:</span>
                        <span class="text-blue-700">R$ ${((prato.preco || 0) - custo).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showCustomModal('Detalhes do Prato', detailsHtml);
}

function addIngrediente() {
    const container = document.getElementById('ingredientesList');
    const index = container.children.length;
    
    const ingredienteHtml = `
        <div class="ingrediente-item grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
            <select class="ingrediente-insumo px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" onchange="selecionarInsumo(this); calcularPrecoSugerido()"
                <option value="">Selecione um insumo</option>
                ${insumosDB.map(insumo => `<option value="${insumo.id}">${insumo.nome}</option>`).join('')}
            </select>
            <input type="number" class="ingrediente-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Quantidade" step="0.01" min="0" oninput="atualizarPrecoIngrediente(this.parentElement); calcularPrecoSugerido()">
            <select class="ingrediente-unidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" onchange="atualizarPrecoIngrediente(this.parentElement); calcularPrecoSugerido()"
                ${getUnidadesOptions()}
            </select>
            <div class="ingrediente-preco px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center font-semibold text-green-700">
                R$ 0,00
            </div>
            <button type="button" onclick="removeIngrediente(this)" 
                class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', ingredienteHtml);
    lucide.createIcons();
}

function switchTab(tabType) {
    // Remover classe ativa de todas as tabs
    document.querySelectorAll('[id^="tab"]').forEach(tab => {
        tab.classList.remove('active-tab');
    });
    
    // Esconder todo o conteúdo das tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Ativar a tab selecionada
    if (tabType === 'fichas') {
        document.getElementById('tabFichas').classList.add('active-tab');
        document.getElementById('fichasTab').style.display = 'block';
    } else {
        document.getElementById('tabInsumos').classList.add('active-tab');
        document.getElementById('insumosTab').style.display = 'block';
    }
}

function addFichaTecnica() {
    const container = document.getElementById('fichasList');
    
    // Verificar se existem fichas técnicas disponíveis
    if (!fichasTecnicasDB || fichasTecnicasDB.length === 0) {
        showAlert('Aviso', 'Nenhuma ficha técnica encontrada. Cadastre fichas técnicas primeiro.', 'info');
        return;
    }
    
    const fichaHtml = `
        <div class="ficha-item grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg">
            <select class="ficha-tecnica px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" onchange="calcularPrecoSugerido()">
                <option value="">Selecione uma ficha técnica</option>
                ${fichasTecnicasDB.map(ficha => `<option value="${ficha.id}">${ficha.nome}</option>`).join('')}
            </select>
            <input type="number" class="ficha-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Quantidade" step="0.01" min="0" value="1" oninput="calcularPrecoSugerido()">
            <button type="button" onclick="removeFichaTecnica(this)" 
                class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', fichaHtml);
    lucide.createIcons();
}

function removeFichaTecnica(button) {
    button.closest('.ficha-item').remove();
    // Recalcular preço sugerido
    setTimeout(calcularPrecoSugerido, 100);
}

function removeIngrediente(button) {
    button.closest('.ingrediente-item').remove();
    atualizarTotalInsumos();
}

function getIngredientesFromForm() {
    const ingredientes = [];
    const items = document.querySelectorAll('.ingrediente-item');
    
    items.forEach(item => {
        const insumoId = item.querySelector('.ingrediente-insumo').value;
        const quantidade = parseFloat(item.querySelector('.ingrediente-quantidade').value);
        const unidade = item.querySelector('.ingrediente-unidade').value;
        
        if (insumoId && quantidade > 0) {
            ingredientes.push({
                insumoId,
                quantidade,
                unidade: unidade || 'un'
            });
        }
    });
    
    return ingredientes;
}

function getFichasTecnicasFromForm() {
    const fichas = [];
    const items = document.querySelectorAll('.ficha-item');
    
    items.forEach(item => {
        const fichaId = item.querySelector('.ficha-tecnica').value;
        const quantidade = parseFloat(item.querySelector('.ficha-quantidade').value);
        
        if (fichaId && quantidade > 0) {
            fichas.push({
                fichaId,
                quantidade
            });
        }
    });
    
    return fichas;
}

function loadIngredientesIntoForm(ingredientes) {
    const container = document.getElementById('ingredientesList');
    container.innerHTML = '';
    
    if (ingredientes && ingredientes.length > 0) {
        ingredientes.forEach(ingrediente => {
            addIngrediente();
            const lastItem = container.lastElementChild;
            lastItem.querySelector('.ingrediente-insumo').value = ingrediente.insumoId;
            lastItem.querySelector('.ingrediente-quantidade').value = ingrediente.quantidade;
            lastItem.querySelector('.ingrediente-unidade').value = ingrediente.unidade || '';
            
            // Atualizar preço após carregar os dados
            atualizarPrecoIngrediente(lastItem);
        });
        
        // Forçar atualização do total após carregar todos os ingredientes
        setTimeout(atualizarTotalInsumos, 200);
    } else {
        // Atualizar total mesmo quando não há ingredientes
        atualizarTotalInsumos();
    }
}

function loadFichasTecnicasIntoForm(fichasTecnicas) {
    const container = document.getElementById('fichasList');
    container.innerHTML = '';
    
    if (fichasTecnicas && fichasTecnicas.length > 0) {
        fichasTecnicas.forEach(fichaItem => {
            addFichaTecnica();
            const lastItem = container.lastElementChild;
            lastItem.querySelector('.ficha-tecnica').value = fichaItem.fichaId;
            lastItem.querySelector('.ficha-quantidade').value = fichaItem.quantidade;
        });
    }
}

function resetPratoForm() {
    document.getElementById('pratoForm').reset();
    document.getElementById('pratoId').value = '';
    document.getElementById('pratoModalTitle').textContent = 'Adicionar Prato';
    document.getElementById('ingredientesList').innerHTML = '';
    document.getElementById('fichasList').innerHTML = '';
    
    // Resetar totais
    atualizarTotalInsumos();
    
    // Resetar para a primeira tab (Fichas Técnicas)
    switchTab('fichas');
}

// --- FUNÇÕES DE CONFIGURAÇÕES PADRÃO ---
function aplicarConfiguracoesDefault() {
    if (configuracoesDB.defaultCustoFinalizacao) {
        document.getElementById('pratoCustoFinalizacao').value = configuracoesDB.defaultCustoFinalizacao;
    }
    if (configuracoesDB.defaultMargemLucro) {
        document.getElementById('pratoMargemLucro').value = configuracoesDB.defaultMargemLucro;
    }
}

function aplicarConfiguracoesDefaultFicha() {
    if (configuracoesDB.defaultCustoFinalizacao) {
        document.getElementById('fichaCustoFinalizacao').value = configuracoesDB.defaultCustoFinalizacao;
    }
}

// --- FUNÇÕES DE FICHAS TÉCNICAS ---
function renderFichas() {
    const tbody = document.getElementById('fichasTableBody');
    if (!tbody) return;
    
    if (fichasTecnicasDB.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-gray-500">Nenhuma ficha técnica cadastrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = fichasTecnicasDB.map(ficha => {
        const custoTotal = calcularCustoFichaTecnica(ficha);
        const custoPorcao = ficha.rendimento > 0 ? custoTotal / ficha.rendimento : 0;
        const statusClass = ficha.status === 'ativo' ? 'bg-green-100 text-green-800' : 
                           ficha.status === 'teste' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        
        return `<tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <input type="checkbox" class="ficha-checkbox rounded" value="${ficha.id}" onchange="updateSelectedFichasCount()">
            </td>
            <td class="px-6 py-4">
                <div>
                    <div class="font-medium text-gray-900">${ficha.nome}</div>
                    <div class="text-sm text-gray-500">${ficha.tipo || ''}</div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 capitalize">${ficha.tipo || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-900">${ficha.rendimento} ${ficha.unidade || ''}</td>
            <td class="px-6 py-4 text-sm font-semibold text-blue-700">R$ ${custoTotal.toFixed(2)}</td>
            <td class="px-6 py-4 text-sm text-gray-900">R$ ${custoPorcao.toFixed(2)}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                    ${ficha.status || 'ativo'}
                </span>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="flex space-x-2">
                    <button onclick="editFicha('${ficha.id}')" 
                        class="text-blue-600 hover:text-blue-800" title="Editar">
                        <i data-lucide="edit" class="h-4 w-4"></i>
                    </button>
                    <button onclick="viewFichaDetails('${ficha.id}')" 
                        class="text-green-600 hover:text-green-800" title="Ver Detalhes">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button onclick="deleteFicha('${ficha.id}')" 
                        class="text-red-600 hover:text-red-800" title="Excluir">
                        <i data-lucide="trash-2" class="h-4 w-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    lucide.createIcons();
}

function filtrarFichas() {
    const filtroTexto = document.getElementById('filtroFicha').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroTipoFicha').value;
    const filtroStatus = document.getElementById('filtroStatusFicha').value;
    
    const fichasOriginal = [...fichasTecnicasDB];
    
    fichasTecnicasDB = fichasOriginal.filter(ficha => {
        const matchTexto = !filtroTexto || 
            ficha.nome.toLowerCase().includes(filtroTexto);
        
        const matchTipo = !filtroTipo || ficha.tipo === filtroTipo;
        const matchStatus = !filtroStatus || ficha.status === filtroStatus;
        
        return matchTexto && matchTipo && matchStatus;
    });
    
    renderFichas();
    fichasTecnicasDB = fichasOriginal; // Restaurar array original
}

function saveFicha(event) {
    event.preventDefault();
    
    const id = document.getElementById('fichaId').value;
    const ficha = {
        nome: document.getElementById('fichaNome').value,
        tipo: document.getElementById('fichaTipo').value,
        rendimento: parseFloat(document.getElementById('fichaRendimento').value),
        unidade: document.getElementById('fichaUnidade').value,
        tipoCorrecao: document.getElementById('fichaTipoCorrecao').value,
        taxaCorrecao: parseFloat(document.getElementById('fichaTaxaCorrecao').value) || 0,
        custoFinalizacao: parseFloat(document.getElementById('fichaCustoFinalizacao').value) || 0,
        status: document.getElementById('fichaStatus').value,
        ingredientes: getIngredientesFichaFromForm(),
        dataAtualizacao: new Date().toISOString().split('T')[0]
    };
    
    if (id) {
        // Editar ficha existente
        const index = fichasTecnicasDB.findIndex(f => f.id === id);
        if (index !== -1) {
            fichasTecnicasDB[index] = { ...fichasTecnicasDB[index], ...ficha };
            showAlert('Ficha Atualizada', 'Ficha técnica atualizada com sucesso!', 'success');
        }
    } else {
        // Adicionar nova ficha
        ficha.id = 'ficha_' + Date.now();
        ficha.dataCriacao = new Date().toISOString().split('T')[0];
        fichasTecnicasDB.push(ficha);
        showAlert('Ficha Criada', 'Ficha técnica adicionada com sucesso!', 'success');
    }
    
    saveData();
    renderFichas();
    updateStats();
    hideModal('fichaModal');
    resetFichaForm();
}

function editFicha(id) {
    const ficha = fichasTecnicasDB.find(f => f.id === id);
    if (!ficha) return;
    
    document.getElementById('fichaModalTitle').textContent = 'Editar Ficha Técnica';
    document.getElementById('fichaId').value = ficha.id;
    document.getElementById('fichaNome').value = ficha.nome;
    document.getElementById('fichaTipo').value = ficha.tipo || '';
    document.getElementById('fichaRendimento').value = ficha.rendimento;
    document.getElementById('fichaUnidade').value = ficha.unidade || '';
    document.getElementById('fichaTipoCorrecao').value = ficha.tipoCorrecao || 'incremento';
    document.getElementById('fichaTaxaCorrecao').value = ficha.taxaCorrecao || '';
    document.getElementById('fichaCustoFinalizacao').value = ficha.custoFinalizacao || '';
    document.getElementById('fichaStatus').value = ficha.status || 'ativo';
    
    // Carregar ingredientes
    loadIngredientesFichaIntoForm(ficha.ingredientes || []);
    
    showModal('fichaModal');
}

function deleteFicha(id) {
    if (confirm('Tem certeza que deseja excluir esta ficha técnica?')) {
        // Remover do array local
        fichasTecnicasDB = fichasTecnicasDB.filter(f => f.id !== id);
        
        // Deletar do Firebase se estiver conectado (sem bloquear a exclusão)
        if (isFirebaseReady) {
            deleteFromFirebase('fichasTecnicas', id);
        }
        
        saveData();
        renderFichas();
        updateStats();
        showAlert('Ficha Excluída', 'Ficha técnica removida com sucesso!', 'success');
    }
}

// --- FUNÇÕES DE SELEÇÃO MÚLTIPLA PARA FICHAS TÉCNICAS ---
function toggleSelectAllFichas() {
    const selectAll = document.getElementById('selectAllFichas');
    const checkboxes = document.querySelectorAll('.ficha-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedFichasCount();
}

function updateSelectedFichasCount() {
    const checkboxes = document.querySelectorAll('.ficha-checkbox:checked');
    const count = checkboxes.length;
    const selectAll = document.getElementById('selectAllFichas');
    const multiSelectActions = document.getElementById('fichaMultiSelectActions');
    const selectedCount = document.getElementById('selectedFichasCount');
    
    if (selectedCount) {
        selectedCount.textContent = `${count} itens selecionados`;
    }
    
    if (multiSelectActions) {
        if (count > 0) {
            multiSelectActions.classList.remove('hidden');
        } else {
            multiSelectActions.classList.add('hidden');
        }
    }
    
    // Atualizar estado do checkbox "selecionar todos"
    if (selectAll) {
        const allCheckboxes = document.querySelectorAll('.ficha-checkbox');
        if (count === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (count === allCheckboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }
}

function clearFichaSelection() {
    document.querySelectorAll('.ficha-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    const selectAll = document.getElementById('selectAllFichas');
    if (selectAll) selectAll.checked = false;
    updateSelectedFichasCount();
}

function deleteSelectedFichas() {
    const selected = Array.from(document.querySelectorAll('.ficha-checkbox:checked')).map(cb => cb.value);
    
    if (selected.length === 0) {
        showAlert('Nenhum item selecionado', 'Selecione pelo menos uma ficha técnica para excluir.', 'warning');
        return;
    }
    
    // Verificar se alguma das fichas selecionadas está em uso em pratos
    const fichasEmUso = [];
    selected.forEach(id => {
        const usedInPratos = pratosDB.filter(prato => 
            prato.componentes && prato.componentes.some(comp => comp.fichaId === id)
        );
        
        if (usedInPratos.length > 0) {
            const ficha = fichasTecnicasDB.find(f => f.id === id);
            fichasEmUso.push({
                ficha: ficha,
                pratos: usedInPratos
            });
        }
    });
    
    let message = `Tem certeza que deseja excluir ${selected.length} ficha(s) técnica(s) selecionada(s)?`;
    
    if (fichasEmUso.length > 0) {
        message += '\n\nATENÇÃO: As seguintes fichas estão sendo usadas:\n\n';
        fichasEmUso.forEach(item => {
            message += `• ${item.ficha.nome}\n`;
            if (item.pratos.length > 0) {
                message += `  Pratos: ${item.pratos.map(p => p.nome).join(', ')}\n`;
            }
        });
        message += '\nEstes pratos ficarão com componentes incompletos.';
    }
    
    if (confirm(message)) {
        // Excluir todas as fichas selecionadas
        selected.forEach(id => {
            fichasTecnicasDB = fichasTecnicasDB.filter(f => f.id !== id);
            
            // Deletar do Firebase se estiver conectado
            if (isFirebaseReady) {
                deleteFromFirebase('fichasTecnicas', id);
            }
        });
        
        saveData();
        renderFichas();
        clearFichaSelection();
        updateStats();
        showAlert('Fichas Excluídas', `${selected.length} ficha(s) técnica(s) removida(s) com sucesso!`, 'success');
    }
}

function viewFichaDetails(id) {
    const ficha = fichasTecnicasDB.find(f => f.id === id);
    if (!ficha) return;
    
    const custoTotal = calcularCustoFichaTecnica(ficha);
    const custoPorcao = ficha.rendimento > 0 ? custoTotal / ficha.rendimento : 0;
    
    let ingredientesHtml = '';
    if (ficha.ingredientes && ficha.ingredientes.length > 0) {
        ingredientesHtml = ficha.ingredientes.map(ing => {
            const insumo = insumosDB.find(i => i.id === ing.insumoId);
            return `<li class="flex justify-between">
                <span>${insumo ? insumo.nome : 'Insumo não encontrado'}</span>
                <span>${ing.quantidade} ${ing.unidade || ''}</span>
            </li>`;
        }).join('');
    } else {
        ingredientesHtml = '<li class="text-gray-500">Nenhum ingrediente cadastrado</li>';
    }
    
    const detailsHtml = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome</label>
                    <p class="text-gray-900">${ficha.nome}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Tipo</label>
                    <p class="text-gray-900 capitalize">${ficha.tipo || '-'}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Rendimento</label>
                    <p class="text-lg font-semibold text-blue-700">${ficha.rendimento} ${ficha.unidade || ''}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Custo Total</label>
                    <p class="text-lg font-semibold text-green-700">R$ ${custoTotal.toFixed(2)}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Custo/Porção</label>
                    <p class="text-lg font-semibold">R$ ${custoPorcao.toFixed(2)}</p>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ingredientes</label>
                <ul class="bg-gray-50 rounded-lg p-4 space-y-2">
                    ${ingredientesHtml}
                </ul>
            </div>
        </div>
    `;
    
    showCustomModal('Detalhes da Ficha Técnica', detailsHtml);
}

function addIngredienteFicha() {
    const container = document.getElementById('fichaIngredientesList');
    
    const ingredienteHtml = `
        <div class="ingrediente-ficha-item grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
            <select class="ingrediente-ficha-insumo px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="selecionarInsumoFicha(this)">
                <option value="">Selecione um insumo</option>
                ${insumosDB.map(insumo => `<option value="${insumo.id}">${insumo.nome}</option>`).join('')}
            </select>
            <input type="number" class="ingrediente-ficha-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Quantidade" step="0.01" min="0" oninput="atualizarPrecoIngredienteFicha(this.parentElement)">
            <select class="ingrediente-ficha-unidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="atualizarPrecoIngredienteFicha(this.parentElement)">
                ${getUnidadesOptions()}
            </select>
            <div class="ingrediente-ficha-preco px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center font-semibold text-green-700">
                R$ 0,00
            </div>
            <button type="button" onclick="removeIngredienteFicha(this)" 
                class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', ingredienteHtml);
    lucide.createIcons();
}

function removeIngredienteFicha(button) {
    button.closest('.ingrediente-ficha-item').remove();
    atualizarTotalFichaTecnica();
}

function getIngredientesFichaFromForm() {
    const ingredientes = [];
    const items = document.querySelectorAll('.ingrediente-ficha-item');
    
    items.forEach(item => {
        const insumoId = item.querySelector('.ingrediente-ficha-insumo').value;
        const quantidade = parseFloat(item.querySelector('.ingrediente-ficha-quantidade').value);
        const unidade = item.querySelector('.ingrediente-ficha-unidade').value;
        
        if (insumoId && quantidade > 0) {
            ingredientes.push({
                insumoId,
                quantidade,
                unidade: unidade || 'un'
            });
        }
    });
    
    return ingredientes;
}

function loadIngredientesFichaIntoForm(ingredientes) {
    const container = document.getElementById('fichaIngredientesList');
    container.innerHTML = '';
    
    if (ingredientes && ingredientes.length > 0) {
        ingredientes.forEach(ingrediente => {
            addIngredienteFicha();
            const lastItem = container.lastElementChild;
            lastItem.querySelector('.ingrediente-ficha-insumo').value = ingrediente.insumoId;
            lastItem.querySelector('.ingrediente-ficha-quantidade').value = ingrediente.quantidade;
            lastItem.querySelector('.ingrediente-ficha-unidade').value = ingrediente.unidade || '';
            
            // Atualizar preço após carregar os dados
            atualizarPrecoIngredienteFicha(lastItem);
        });
    } else {
        // Atualizar total mesmo quando não há ingredientes
        atualizarTotalFichaTecnica();
    }
}

function resetFichaForm() {
    document.getElementById('fichaForm').reset();
    document.getElementById('fichaId').value = '';
    document.getElementById('fichaModalTitle').textContent = 'Adicionar Ficha Técnica';
    document.getElementById('fichaIngredientesList').innerHTML = '';
    
    // Resetar total
    atualizarTotalFichaTecnica();
    
    // Definir valores padrão
    document.getElementById('fichaTipoCorrecao').value = 'incremento';
}

// --- NAVEGAÇÃO ---
function showView(viewId) {
    // Verificar se os elementos existem antes de tentar acessá-los
    const targetView = document.getElementById(viewId);
    if (!targetView) {
        console.warn(`View com ID '${viewId}' não encontrada`);
        return;
    }
    
    // Esconder todas as views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Mostrar a view alvo
    targetView.classList.add('active');
    
    // Auto-gerar relatórios quando a aba é aberta
    if (viewId === 'relatoriosView') {
        // Aguardar um pouco para garantir que os elementos foram renderizados
        setTimeout(() => {
            gerarRelatorios();
        }, 100);
    }
    
    // Carregar dados das configurações quando a aba é aberta
    if (viewId === 'configuracoes') {
        setTimeout(() => {
            carregarUsuarios();
            carregarCodigoRestaurante();
        }, 200);
    }
    
    // Renderizar pratos quando a aba é aberta
    if (viewId === 'pratos') {
        setTimeout(() => {
            renderPratos();
        }, 100);
    }
    
    // Renderizar fichas técnicas quando a aba é aberta
    if (viewId === 'fichas') {
        setTimeout(() => {
            renderFichas();
        }, 100);
    }
    
    // Atualizar links da sidebar
    document.querySelectorAll('.sidebar-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('onclick') === `showView('${viewId}')`) {
            l.classList.add('active');
        }
    });
}

// --- FUNÇÕES DE INSUMOS ---
function populateFilters() {
    ['filterFornecedor', 'filterUnidade'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const values = id === 'filterFornecedor' ? 
            [...new Set(comprasDB.map(c => c.fornecedor?.nome).filter(Boolean))] : 
            [...new Set(insumosDB.map(i => i.unidade))];
            
        const selected = select.value;
        select.innerHTML = `<option value="">Todos os ${id === 'filterFornecedor' ? 'Fornecedores' : 'Unidades'}</option>`;
        values.sort().forEach(v => select.innerHTML += `<option value="${v}">${v}</option>`);
        select.value = selected;
    });
}

function getUltimaCompra(insumoId) {
    const compras = comprasDB.filter(c => c.insumoMestreId === insumoId);
    return compras.length ? compras.sort((a, b) => new Date(b.data) - new Date(a.data))[0] : null;
}

function getPrecoComTaxaCorrecao(insumoId) {
    const insumo = insumosDB.find(i => i.id === insumoId);
    
    if (!insumo) {
        console.warn(`Insumo não encontrado: ${insumoId}`);
        return 0;
    }
    
    const ultimaCompra = getUltimaCompra(insumoId);
    
    // Prioridade 1: Usar preço da última compra se disponível
    // Prioridade 2: Usar valorUnitario do próprio insumo
    // Prioridade 3: Retornar 0 se nenhum preço estiver disponível
    let precoBase = 0;
    
    if (ultimaCompra && ultimaCompra.preco > 0) {
        precoBase = ultimaCompra.preco;
        console.log(`Usando preço da última compra para ${insumo.nome}: R$ ${precoBase}`);
    } else if (insumo.valorUnitario && insumo.valorUnitario > 0) {
        precoBase = parseFloat(insumo.valorUnitario);
        console.log(`Usando valorUnitario do insumo ${insumo.nome}: R$ ${precoBase}`);
    } else {
        console.warn(`Nenhum preço disponível para o insumo ${insumo.nome} (ID: ${insumoId})`);
        return 0;
    }
    
    const taxaCorrecao = parseFloat(insumo.taxaCorrecao) || 0;
    
    // Aplicar taxa de correção (percentual de acréscimo)
    // Se taxa é 0, o preço permanece o mesmo
    const precoComTaxa = precoBase * (1 + (taxaCorrecao / 100));
    
    console.log(`Preço final para ${insumo.nome}: R$ ${precoComTaxa.toFixed(2)} (base: ${precoBase}, taxa: ${taxaCorrecao}%)`);
    
    return precoComTaxa;
}

function renderInsumos() {
    const s = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const f = document.getElementById('filterFornecedor')?.value || '';
    const u = document.getElementById('filterUnidade')?.value || '';
    const tbody = document.getElementById('insumosTableBody');
    
    if (!tbody) return;
    
    let filtrados = insumosDB.filter(i => {
        const uc = getUltimaCompra(i.id);
        return (i.nome.toLowerCase().includes(s) || (uc && uc.fornecedor?.nome?.toLowerCase().includes(s))) && 
               (!f || (uc && uc.fornecedor?.nome === f)) && 
               (!u || i.unidade === u);
    });
    
    if (filtrados.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-500">Nenhum insumo encontrado.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = filtrados.map(insumo => {
        const uc = getUltimaCompra(insumo.id);
        const precoComTaxa = getPrecoComTaxaCorrecao(insumo.id);
        
        return `<tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="p-4">
                <input type="checkbox" class="item-checkbox rounded" value="${insumo.id}" onchange="updateSelectionCount()">
            </td>
            <td class="p-4 font-medium">${insumo.nome}</td>
            <td class="p-4">${insumo.unidade}</td>
            <td class="p-4">${uc ? uc.fornecedor?.nome || 'N/A' : 'N/A'}</td>
            <td class="p-4 font-semibold text-green-700">${uc ? `R$ ${uc.preco.toFixed(2)}` : 'N/A'}</td>
            <td class="p-4">
                <div class="font-bold text-orange-700">${precoComTaxa > 0 ? `R$ ${precoComTaxa.toFixed(2)}` : 'N/A'}</div>
                ${precoComTaxa > 0 ? `<div class="text-xs text-gray-500">
                    ${insumo.unidade}${getUnidadesConvertidas(insumo, precoComTaxa)}
                </div>` : ''}
            </td>
            <td class="p-4">${uc ? new Date(uc.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td class="p-4">
                <div class="flex items-center space-x-2">
                    <button onclick="editInsumo('${insumo.id}')" class="text-blue-500 hover:text-blue-700 font-semibold flex items-center text-sm">
                        <i data-lucide="edit-3" class="h-4 w-4 mr-1"></i>Editar
                    </button>
                    <div class="flex items-center">
                        <span class="text-xs text-gray-500 mr-2">${getPrecoConvertido(insumo, precoComTaxa)}</span>
                        <button onclick="deleteInsumo('${insumo.id}')" class="text-red-500 hover:text-red-700 font-semibold flex items-center text-sm">
                            <i data-lucide="trash-2" class="h-4 w-4 mr-1"></i>Excluir
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// Função para gerar opções de unidades para selects
function getUnidadesOptions() {
    const unidadesPadrao = [
        { value: '', text: 'Selecione uma unidade' },
        { value: 'kg', text: 'kg - Quilograma' },
        { value: 'g', text: 'g - Grama' },
        { value: 'l', text: 'L - Litro' },
        { value: 'ml', text: 'ml - Mililitro' },
        { value: 'un', text: 'un - Unidade' },
        { value: 'dz', text: 'dz - Dúzia' },
        { value: 'cx', text: 'cx - Caixa' },
        { value: 'pc', text: 'pc - Peça' },
        { value: 'sc', text: 'sc - Saco' },
        { value: 'bd', text: 'bd - Bandeja' },
        { value: 'fr', text: 'fr - Frasco' },
        { value: 'pt', text: 'pt - Pote' },
        { value: 'tb', text: 'tb - Tubo' },
        { value: 'lt', text: 'lt - Lata' },
        { value: 'gl', text: 'gl - Galão' },
        { value: 'm', text: 'm - Metro' },
        { value: 'cm', text: 'cm - Centímetro' }
    ];
    
    // Coletar unidades únicas dos insumos existentes
    const unidadesExistentes = [...new Set(insumosDB.map(insumo => insumo.unidade))]
        .filter(unidade => unidade && unidade.trim() !== '')
        .map(unidade => ({ value: unidade, text: unidade }));
    
    // Combinar unidades padrão com existentes (evitar duplicatas)
    const todasUnidades = [...unidadesPadrao];
    unidadesExistentes.forEach(unidadeExistente => {
        if (!unidadesPadrao.some(up => up.value === unidadeExistente.value)) {
            todasUnidades.push(unidadeExistente);
        }
    });
    
    return todasUnidades.map(unidade => 
        `<option value="${unidade.value}">${unidade.text}</option>`
    ).join('');
}

// Função para calcular valores em unidades convertidas
function getUnidadesConvertidas(insumo, precoComTaxa) {
    const unidade = insumo.unidade.toLowerCase();
    const conversoes = [];
    
    // Conversões de peso
    if (unidade === 'kg') {
        const precoGrama = precoComTaxa / 1000;
        if (precoGrama >= 0.001) {
            conversoes.push(`R$ ${precoGrama.toFixed(3)}/g`);
        }
        
        // Adicionar conversão para 100g (comum em receitas)
        const preco100g = precoComTaxa / 10;
        if (preco100g >= 0.01) {
            conversoes.push(`R$ ${preco100g.toFixed(2)}/100g`);
        }
    } else if (unidade === 'g') {
        const precoKg = precoComTaxa * 1000;
        if (precoKg < 9999) {
            conversoes.push(`R$ ${precoKg.toFixed(2)}/kg`);
        }
        
        // Adicionar conversão para 100g
        const preco100g = precoComTaxa * 100;
        if (preco100g < 999) {
            conversoes.push(`R$ ${preco100g.toFixed(2)}/100g`);
        }
    }
    
    // Conversões de volume
    if (unidade === 'l') {
        const precoMl = precoComTaxa / 1000;
        if (precoMl >= 0.001) {
            conversoes.push(`R$ ${precoMl.toFixed(3)}/ml`);
        }
        
        // Adicionar conversão para 100ml (comum em receitas)
        const preco100ml = precoComTaxa / 10;
        if (preco100ml >= 0.01) {
            conversoes.push(`R$ ${preco100ml.toFixed(2)}/100ml`);
        }
    } else if (unidade === 'ml') {
        const precoLitro = precoComTaxa * 1000;
        if (precoLitro < 9999) {
            conversoes.push(`R$ ${precoLitro.toFixed(2)}/L`);
        }
        
        // Adicionar conversão para 100ml
        const preco100ml = precoComTaxa * 100;
        if (preco100ml < 999) {
            conversoes.push(`R$ ${preco100ml.toFixed(2)}/100ml`);
        }
    }
    
    // Conversões de unidades
    if (unidade === 'dz' || unidade === 'duzia') {
        const precoUnidade = precoComTaxa / 12;
        conversoes.push(`R$ ${precoUnidade.toFixed(2)}/un`);
    } else if (unidade === 'un' || unidade === 'unidade') {
        const precoDuzia = precoComTaxa * 12;
        if (precoDuzia < 999) {
            conversoes.push(`R$ ${precoDuzia.toFixed(2)}/dz`);
        }
    }
    
    // Exibir até duas conversões mais relevantes
    if (conversoes.length > 1) {
        return ` → ${conversoes[0]} | ${conversoes[1]}`;
    } else if (conversoes.length === 1) {
        return ` → ${conversoes[0]}`;
    } else {
        return '';
    }
}

// Função para formatar o preço convertido para a visualização ao lado do botão excluir
function getPrecoConvertido(insumo, precoComTaxa) {
    const unidade = insumo.unidade.toLowerCase();
    let conversao = '';
    
    // Escolher a conversão mais útil dependendo da unidade do insumo
    if (unidade === 'kg') {
        // Para kg, mostrar o preço por 100g
        const preco100g = precoComTaxa / 10;
        if (preco100g >= 0.01) {
            conversao = `100g: R$${preco100g.toFixed(2)}`;
        }
    } else if (unidade === 'g') {
        // Para g, mostrar o preço por kg
        const precoKg = precoComTaxa * 1000;
        if (precoKg < 9999) {
            conversao = `kg: R$${precoKg.toFixed(2)}`;
        }
    } else if (unidade === 'l') {
        // Para l, mostrar o preço por 100ml
        const preco100ml = precoComTaxa / 10;
        if (preco100ml >= 0.01) {
            conversao = `100ml: R$${preco100ml.toFixed(2)}`;
        }
    } else if (unidade === 'ml') {
        // Para ml, mostrar o preço por litro
        const precoLitro = precoComTaxa * 1000;
        if (precoLitro < 9999) {
            conversao = `L: R$${precoLitro.toFixed(2)}`;
        }
    } else if (unidade === 'dz' || unidade === 'duzia') {
        // Para dúzia, mostrar o preço por unidade
        const precoUnidade = precoComTaxa / 12;
        conversao = `un: R$${precoUnidade.toFixed(2)}`;
    } else if (unidade === 'un' || unidade === 'unidade') {
        // Para unidade, mostrar o preço por dúzia
        const precoDuzia = precoComTaxa * 12;
        if (precoDuzia < 999) {
            conversao = `dz: R$${precoDuzia.toFixed(2)}`;
        }
    }
    
    return conversao;
}

// --- FUNÇÕES BÁSICAS PARA COMPLETAR O SISTEMA ---
function renderDashboard() {
    // Implementação usando dados reais do sistema
    console.log('Renderizando dashboard...');
    
    // Usar dados reais das fichas técnicas
    const fichasData = {
        labels: fichasTecnicasDB.slice(0, 4).map(ficha => ficha.nome || 'Sem nome'),
        data: fichasTecnicasDB.slice(0, 4).map(ficha => {
            const custo = calcularCustoFichaTecnica(ficha.id);
            return custo ? parseFloat(custo.toFixed(2)) : 0;
        })
    };
    
    // Usar dados reais dos insumos mais caros
    const insumosComPreco = insumosDB.map(insumo => {
        const ultimaCompra = getUltimaCompra(insumo.id);
        return {
            nome: insumo.nome,
            preco: ultimaCompra ? ultimaCompra.preco : 0
        };
    }).sort((a, b) => b.preco - a.preco).slice(0, 4);
    
    const insumosData = {
        labels: insumosComPreco.map(item => item.nome),
        data: insumosComPreco.map(item => item.preco)
    };
    
    createChart('dashboardFichasChart', 'bar', fichasData.labels, fichasData.data, 'Custo (R$)');
    createChart('dashboardInsumosChart', 'bar', insumosData.labels, insumosData.data, 'Preço (R$)');
}

function renderConfiguracoes() {
    if (configuracoesDB) {
        const defaultCustoFinalizacao = document.getElementById('defaultCustoFinalizacao');
        const defaultMargemLucro = document.getElementById('defaultMargemLucro');
        
        if (defaultCustoFinalizacao) defaultCustoFinalizacao.value = configuracoesDB.custoFinalizacao || 10;
        if (defaultMargemLucro) defaultMargemLucro.value = configuracoesDB.margemLucro || 200;
    }
    
    // Configurações de sincronização
    const syncToggle = document.getElementById('auto-sync-toggle');
    if (syncToggle) {
        syncToggle.checked = autoSyncEnabled;
        
        // Atualizar estado visual do botão de sincronização manual
        const syncButton = document.getElementById('sync-button');
        if (syncButton) {
            updateLastSyncInfo(); // Atualizar informação de última sincronização
        }
    }
}

async function salvarConfiguracoes() {
    const custoFinalizacao = parseFloat(document.getElementById('defaultCustoFinalizacao').value) || 0;
    const margemLucro = parseFloat(document.getElementById('defaultMargemLucro').value) || 0;
    
    configuracoesDB.custoFinalizacao = custoFinalizacao;
    configuracoesDB.margemLucro = margemLucro;
    
    // Salvar também configurações de sincronização no objeto principal
    configuracoesDB.autoSyncEnabled = autoSyncEnabled;
    
    try {
        if (isFirebaseReady && configuracoesDB.id) {
            await saveToFirebase('configuracoes', {
                custoFinalizacao, 
                margemLucro,
                autoSyncEnabled
            }, configuracoesDB.id);
            showToast('Configurações salvas com sucesso!', 'success');
        } else {
            saveToLocalStorage();
            showToast('Configurações salvas localmente', 'info');
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showToast('Erro ao salvar configurações: ' + error.message, 'error');
        saveToLocalStorage(); // Fallback para local
    }
    
    // Atualizar configurações localmente
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled);
    
    // Salvar todos os dados
    await saveData();
    renderAll();
}

function createChart(canvasId, type, labels, data, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const gridColor = 'rgba(0, 0, 0, 0.1)';
    const textColor = '#374151';

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const chartColors = type === 'pie' ? 
        ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'] :
        data.map(d => d >= 0 ? '#10B981' : '#EF4444');

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: chartColors,
                borderColor: '#FFFFFF',
                borderWidth: type === 'pie' ? 2 : 0
            }]
        },
        options: {
            indexAxis: type === 'bar' ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'pie',
                    labels: { color: textColor }
                }
            },
            scales: type === 'pie' ? {} : {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: 'transparent' } }
            }
        }
    });
}

function exportarInsumosCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Nome,Unidade,Ultimo Fornecedor,Ultimo Preco,Preco com Taxa,Data Ultima Compra\r\n";
    insumosDB.forEach(insumo => {
        const uc = getUltimaCompra(insumo.id);
        const precoComTaxa = getPrecoComTaxaCorrecao(insumo.id);
        const row = [
            insumo.id, 
            insumo.nome, 
            insumo.unidade, 
            uc ? uc.fornecedor?.nome || 'N/A' : 'N/A', 
            uc ? uc.preco.toFixed(2) : 'N/A',
            precoComTaxa > 0 ? precoComTaxa.toFixed(2) : 'N/A',
            uc ? uc.data : 'N/A'
        ].join(",");
        csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lista_de_insumos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função auxiliar para mostrar alertas
function showAlert(title, message, type = 'info') {
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info';
    const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 
                   type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 
                   'bg-blue-100 border-blue-400 text-blue-700';
    
    // Criar modal de alerta simples
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    alertDiv.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-lg">
            <div class="flex items-center mb-4">
                <i data-lucide="${icon}" class="h-6 w-6 mr-3 text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'}-500"></i>
                <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
            </div>
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="text-right">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    OK
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(alertDiv);
    lucide.createIcons();
    
    // Auto remove após 2 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 2000);
}

// --- FUNÇÕES DE INSUMOS ---
function populateFornecedores() {
    const fornecedorSelect = document.getElementById('insumoFornecedor');
    if (!fornecedorSelect) {
        console.log('Select de fornecedor não encontrado');
        return;
    }
    
    console.log('Populando fornecedores...');
    // Obter fornecedores únicos das compras e do banco de fornecedores
    const fornecedoresUnicos = new Set();
    
    // Adicionar fornecedores das compras
    comprasDB.forEach(compra => {
        if (compra.fornecedor?.nome) {
            fornecedoresUnicos.add(compra.fornecedor.nome);
        }
    });
    
    // Adicionar fornecedores do banco
    fornecedoresDB.forEach(fornecedor => {
        if (fornecedor.nome) {
            fornecedoresUnicos.add(fornecedor.nome);
        }
    });
    
    // Manter seleção atual
    const selectedValue = fornecedorSelect.value;
    
    // Limpar e repopular
    fornecedorSelect.innerHTML = '<option value="">Selecione um fornecedor</option>';
    
    // Adicionar opção para novo fornecedor
    fornecedorSelect.innerHTML += '<option value="__novo__">+ Adicionar novo fornecedor</option>';
    
    // Adicionar fornecedores existentes
    Array.from(fornecedoresUnicos).sort().forEach(nome => {
        fornecedorSelect.innerHTML += `<option value="${nome}">${nome}</option>`;
    });
    
    // Restaurar seleção
    fornecedorSelect.value = selectedValue;
}

function handleFornecedorChange(select) {
    if (select.value === '__novo__') {
        const novoFornecedor = prompt('Digite o nome do novo fornecedor:');
        if (novoFornecedor && novoFornecedor.trim() !== '') {
            const nome = novoFornecedor.trim();
            
            // Adicionar à lista se não existir
            const optionExists = Array.from(select.options).some(option => option.value === nome);
            if (!optionExists) {
                const newOption = new Option(nome, nome);
                select.add(newOption, select.options.length - 1); // Adicionar antes da opção "novo"
            }
            
            // Selecionar o novo fornecedor
            select.value = nome;
        } else {
            // Voltar para vazio se cancelou
            select.value = '';
        }
    }
}

function showAddInsumoModal() {
    console.log('Abrindo modal de adicionar insumo...');
    document.getElementById('insumoModalTitle').textContent = 'Adicionar Insumo';
    document.getElementById('insumoForm').reset();
    document.getElementById('insumoId').value = '';
    
    // Definir data atual por padrão
    document.getElementById('insumoDataCompra').value = new Date().toISOString().split('T')[0];
    
    // Popular fornecedores
    populateFornecedores();
    
    showModal('insumoModal');
}

function saveInsumo(event) {
    event.preventDefault();
    
    const id = document.getElementById('insumoId').value;
    const valorUnitario = parseFloat(document.getElementById('insumoValorUnitario').value) || 0;
    const taxaCorrecao = parseFloat(document.getElementById('insumoTaxaCorrecao').value) || 0;
    let fornecedorNome = document.getElementById('insumoFornecedor').value;
    const dataCompra = document.getElementById('insumoDataCompra').value;
    
    // Verificar se usuário escolheu "Adicionar novo fornecedor"
    if (fornecedorNome === '__novo__') {
        fornecedorNome = prompt('Digite o nome do novo fornecedor:');
        if (!fornecedorNome || fornecedorNome.trim() === '') {
            showAlert('Erro', 'Nome do fornecedor é obrigatório.', 'error');
            return;
        }
        fornecedorNome = fornecedorNome.trim();
    }
    
    const insumo = {
        nome: document.getElementById('insumoNome').value,
        unidade: document.getElementById('insumoUnidade').value,
        categoria: document.getElementById('insumoCategoria').value,
        observacoes: document.getElementById('insumoObservacoes').value,
        valorUnitario: valorUnitario,
        taxaCorrecao: taxaCorrecao
    };
    
    if (id) {
        // Editar insumo existente
        const index = insumosDB.findIndex(i => i.id === id);
        if (index !== -1) {
            insumosDB[index] = { ...insumosDB[index], ...insumo };
            
            // Se tiver dados de compra, criar novo registro de compra
            if (valorUnitario > 0 && fornecedorNome && dataCompra) {
                const compraId = 'compra_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                const novaCompra = {
                    id: compraId,
                    insumoMestreId: id,
                    data: dataCompra,
                    preco: valorUnitario,
                    quantidade: 1, // Quantidade padrão para cadastro manual
                    fornecedor: {
                        nome: fornecedorNome,
                        cnpj: '' // CNPJ não disponível no cadastro manual
                    },
                    notaFiscal: 'Manual',
                    codigoFornecedor: '',
                    dataRegistro: new Date().toISOString().split('T')[0]
                };
                
                comprasDB.push(novaCompra);
                
                // Adicionar fornecedor ao banco se não existir
                if (fornecedorNome && !fornecedoresDB.find(f => f.nome === fornecedorNome)) {
                    const fornecedorId = 'fornecedor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                    fornecedoresDB.push({
                        id: fornecedorId,
                        nome: fornecedorNome,
                        cnpj: '',
                        tipo: 'manual'
                    });
                }
            }
            
            showAlert('Insumo Atualizado', 'Insumo e histórico de compra atualizados com sucesso!', 'success');
        }
    } else {
        // Adicionar novo insumo
        insumo.id = 'insumo_' + Date.now();
        insumosDB.push(insumo);
        
        // Criar registro de compra se houver dados
        if (valorUnitario > 0 && fornecedorNome && dataCompra) {
            const compraId = 'compra_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const novaCompra = {
                id: compraId,
                insumoMestreId: insumo.id,
                data: dataCompra,
                preco: valorUnitario,
                quantidade: 1, // Quantidade padrão para cadastro manual
                fornecedor: {
                    nome: fornecedorNome,
                    cnpj: '' // CNPJ não disponível no cadastro manual
                },
                notaFiscal: 'Manual',
                codigoFornecedor: '',
                dataRegistro: new Date().toISOString().split('T')[0]
            };
            
            comprasDB.push(novaCompra);
            
            // Adicionar fornecedor ao banco se não existir
            if (fornecedorNome && !fornecedoresDB.find(f => f.nome === fornecedorNome)) {
                const fornecedorId = 'fornecedor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                fornecedoresDB.push({
                    id: fornecedorId,
                    nome: fornecedorNome,
                    cnpj: '',
                    tipo: 'manual'
                });
            }
        }
        
        showAlert('Insumo Criado', 'Insumo criado com sucesso' + (valorUnitario > 0 && fornecedorNome && dataCompra ? ' e registro de compra adicionado!' : '!'), 'success');
    }
    
    saveData();
    renderInsumos();
    populateFilters(); // Atualizar filtros com novos fornecedores
    hideModal('insumoModal');
}

function editInsumo(id) {
    const insumo = insumosDB.find(i => i.id === id);
    if (!insumo) return;
    
    // Buscar última compra para preencher dados de fornecedor
    const ultimaCompra = getUltimaCompra(id);
    
    document.getElementById('insumoModalTitle').textContent = 'Editar Insumo';
    document.getElementById('insumoId').value = insumo.id;
    document.getElementById('insumoNome').value = insumo.nome;
    document.getElementById('insumoUnidade').value = insumo.unidade || '';
    document.getElementById('insumoCategoria').value = insumo.categoria || '';
    document.getElementById('insumoObservacoes').value = insumo.observacoes || '';
    document.getElementById('insumoValorUnitario').value = ultimaCompra ? ultimaCompra.preco : (insumo.valorUnitario || '');
    document.getElementById('insumoTaxaCorrecao').value = insumo.taxaCorrecao || '';
    
    // Popular fornecedores
    populateFornecedores();
    
    // Preencher dados da última compra se existir
    document.getElementById('insumoFornecedor').value = ultimaCompra ? (ultimaCompra.fornecedor?.nome || '') : '';
    document.getElementById('insumoDataCompra').value = ultimaCompra ? ultimaCompra.data : new Date().toISOString().split('T')[0];
    
    showModal('insumoModal');
}

function deleteInsumo(id) {
    // Verificar se o insumo está sendo usado em fichas técnicas ou pratos
    const usedInFichas = fichasTecnicasDB.filter(ficha => 
        ficha.ingredientes && ficha.ingredientes.some(ing => ing.insumoId === id)
    );
    
    const usedInPratos = pratosDB.filter(prato => 
        prato.insumos && prato.insumos.some(ing => ing.insumoId === id)
    );
    
    if (usedInFichas.length > 0 || usedInPratos.length > 0) {
        let message = 'Este insumo está sendo usado em:\n\n';
        
        if (usedInFichas.length > 0) {
            message += 'Fichas Técnicas:\n';
            usedInFichas.forEach(ficha => message += `• ${ficha.nome}\n`);
        }
        
        if (usedInPratos.length > 0) {
            message += '\nPratos:\n';
            usedInPratos.forEach(prato => message += `• ${prato.nome}\n`);
        }
        
        message += '\nDeseja excluir o insumo mesmo assim? (Os itens que o utilizam ficarão com ingredientes incompletos)';
        
        if (!confirm(message)) {
            return;
        }
    }
    
    if (confirm('Tem certeza que deseja excluir este insumo?')) {
        // Remover do array local
        insumosDB = insumosDB.filter(i => i.id !== id);
        
        // Deletar do Firebase se estiver conectado (sem bloquear a exclusão)
        if (isFirebaseReady) {
            deleteFromFirebase('insumos', id);
        }
        
        saveData();
        renderInsumos();
        showAlert('Insumo Excluído', 'Insumo removido com sucesso!', 'success');
    }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
function initializeApp() {
    // Mostrar tela de carregamento imediatamente
    showLoading();
    
    // Suprimir erros de extensões do navegador
    suppressExtensionErrors();
    
    // Tentar inicializar Firebase
    initializeFirebase();
    
    // Carregar categorias
    carregarCategorias();
    
    // Fallback para localStorage se Firebase falhar
    setTimeout(() => {
        if (!isFirebaseReady) {
            logError('Firebase não disponível, usando localStorage');
            loadLocalData();
            carregarCategorias(); // Carregar novamente após dados locais
            renderDashboard();
            showFirebaseStatus(false);
        }
    }, 3000);
}

// --- FUNÇÕES AUXILIARES ---
function generateId() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
}

// --- FUNÇÕES DE MODAL ---
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showCustomModal(title, content) {
    // Criar modal dinâmico se não existir
    let customModal = document.getElementById('customModal');
    if (!customModal) {
        customModal = document.createElement('div');
        customModal.id = 'customModal';
        customModal.className = 'modal';
        customModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="customModalTitle" class="text-xl font-semibold"></h3>
                    <button onclick="hideModal('customModal')" class="text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="h-6 w-6"></i>
                    </button>
                </div>
                <div id="customModalBody" class="modal-body"></div>
            </div>
        `;
        document.body.appendChild(customModal);
    }
    
    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalBody').innerHTML = content;
    
    showModal('customModal');
    lucide.createIcons();
}

function showAlert(title, message, type = 'info') {
    const alertClass = type === 'success' ? 'bg-green-100 border-green-500 text-green-700' :
                      type === 'error' ? 'bg-red-100 border-red-500 text-red-700' :
                      'bg-blue-100 border-blue-500 text-blue-700';
    
    const alertHtml = `
        <div class="border-l-4 p-4 ${alertClass}">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="h-5 w-5"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${title}</p>
                    <p class="text-sm mt-1">${message}</p>
                </div>
            </div>
        </div>
    `;
    
    showCustomModal('Notificação', alertHtml);
    
    // Auto-fechar após 2 segundos
    setTimeout(() => {
        hideModal('customModal');
    }, 2000);
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando aplicação...');
    
    // Aguardar um pouco para garantir que tudo carregou
    setTimeout(() => {
        // Verificar integridade da página (silencioso)
        verificarIntegridadePagina();
        
        // Garantir que os ícones Lucide sejam criados
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            // Log silencioso sobre Lucide
            // console.warn('Biblioteca Lucide não carregada');
        }
        
        // Inicializar dashboard por padrão apenas se o elemento existir
        const dashboardElement = safeGetElement('dashboard');
        if (dashboardElement) {
            showView('dashboard');
        }
        
        // Carregar dados iniciais se ainda não carregaram
        if (insumosDB.length === 0) {
            loadLocalData();
            renderDashboard();
        }
        
        // Inicializar eventos de importação XML
        try {
            initializeXMLImport();
        } catch (error) {
            // Log silencioso
            // console.warn('Erro ao inicializar XML import:', error);
        }
        
        // Inicializar eventos de vinculação
        try {
            inicializarEventosVinculacao();
        } catch (error) {
            // Log silencioso
            // console.warn('Erro ao inicializar eventos de vinculação:', error);
        }
        
        // Log de sucesso apenas em modo debug
        // console.log('Aplicação inicializada com sucesso');
    }, 200);
});

// --- FUNÇÕES DE IMPORTAÇÃO XML ---

let xmlData = null;
let itemsParaImportar = [];
let vinculacoesInsumos = new Map(); // Para armazenar vinculações de itens com insumos

// Carregamento seguro do histórico de importações
let historicoImportacoes = [];
try {
    historicoImportacoes = JSON.parse(localStorage.getItem('historicoImportacoes') || '[]');
    if (!Array.isArray(historicoImportacoes)) {
        historicoImportacoes = [];
        localStorage.setItem('historicoImportacoes', '[]');
    }
} catch (error) {
    // Log silencioso para erro de JSON
    // console.warn('Erro ao carregar histórico de importações:', error);
    historicoImportacoes = [];
    localStorage.setItem('historicoImportacoes', '[]');
}

function initializeXMLImport() {
    const xmlFileInput = safeGetElement('xmlFileInput');
    const uploadArea = safeGetElement('uploadArea');
    
    if (!xmlFileInput || !uploadArea) {
        // Log silencioso - elementos de XML podem não estar na página atual
        // console.warn('Elementos de upload XML não encontrados');
        return;
    }
    
    // Eventos de drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-400');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-400');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-400');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleXMLFile(files[0]);
        }
    });
    
    // Evento de seleção de arquivo
    xmlFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleXMLFile(e.target.files[0]);
        }
    });
    
    // Carregar histórico de importações
    renderHistoricoImportacoes();
    // Log silencioso de sucesso
    // console.log('XML import inicializado com sucesso');
}

function handleXMLFile(file) {
    if (!file.name.toLowerCase().endsWith('.xml')) {
        showAlert('Erro', 'Por favor, selecione um arquivo XML válido.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const xmlContent = e.target.result;
            parseXMLContent(xmlContent);
        } catch (error) {
            console.error('Erro ao ler arquivo:', error);
            showAlert('Erro', 'Erro ao ler o arquivo XML.', 'error');
        }
    };
    reader.readAsText(file);
}

function parseXMLContent(xmlContent) {
    document.getElementById('processingStatus').classList.remove('hidden');
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Verificar se é um XML válido
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML inválido');
        }
        
        // Extrair dados da nota fiscal
        const nfeElement = xmlDoc.getElementsByTagName('infNFe')[0] || xmlDoc.getElementsByTagName('NFe')[0];
        if (!nfeElement) {
            throw new Error('Não é um XML de DANF-e válido');
        }
        
        // Informações da nota
        const numeroNota = getXMLValue(xmlDoc, 'nNF');
        const serie = getXMLValue(xmlDoc, 'serie');
        const dataEmissao = getXMLValue(xmlDoc, 'dhEmi');
        const valorTotal = getXMLValue(xmlDoc, 'vNF');
        
        // Informações do emitente (fornecedor)
        const cnpjFornecedor = getXMLValue(xmlDoc, 'emit CNPJ') || getXMLValue(xmlDoc, 'emit CPF');
        const nomeFornecedor = getXMLValue(xmlDoc, 'emit xNome');
        
        // Extrair itens
        const items = xmlDoc.getElementsByTagName('det');
        const itensExtraidos = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const codigo = getXMLValue(item, 'cProd');
            const descricao = getXMLValue(item, 'xProd');
            const unidade = getXMLValue(item, 'uCom');
            const quantidade = parseFloat(getXMLValue(item, 'qCom')) || 0;
            const valorUnitario = parseFloat(getXMLValue(item, 'vUnCom')) || 0;
            const valorTotal = parseFloat(getXMLValue(item, 'vProd')) || 0;
            
            itensExtraidos.push({
                codigo,
                descricao,
                unidade,
                quantidade,
                valorUnitario,
                valorTotal,
                status: 'pendente', // pendente, vinculado, ignorado
                insumoVinculado: null
            });
        }
        
        xmlData = {
            numeroNota,
            serie,
            dataEmissao: formatDate(dataEmissao),
            valorTotal: parseFloat(valorTotal) || 0,
            fornecedor: {
                cnpj: cnpjFornecedor,
                nome: nomeFornecedor
            },
            itens: itensExtraidos
        };
        
        itemsParaImportar = [...itensExtraidos];
        
        // Tentar vincular automaticamente itens já conhecidos
        autoVincularItens();
        
        // Mostrar resultados
        mostrarResultadosImportacao();
        
    } catch (error) {
        console.error('Erro ao processar XML:', error);
        showAlert('Erro', 'Erro ao processar o arquivo XML: ' + error.message, 'error');
    } finally {
        document.getElementById('processingStatus').classList.add('hidden');
    }
}

function getXMLValue(xmlDoc, tagPath) {
    const tags = tagPath.split(' ');
    let element = xmlDoc;
    
    for (const tag of tags) {
        const found = element.getElementsByTagName(tag)[0];
        if (!found) return '';
        element = found;
    }
    
    return element.textContent || '';
}

function autoVincularItens() {
    // Buscar vinculações salvas anteriormente para este fornecedor
    const vinculacoesSalvas = JSON.parse(localStorage.getItem('vinculacoesXML') || '{}');
    const chaveVinculacao = xmlData.fornecedor.cnpj;
    
    if (vinculacoesSalvas[chaveVinculacao]) {
        const vinculacoesFornecedor = vinculacoesSalvas[chaveVinculacao];
        
        itemsParaImportar.forEach(item => {
            // Tentar encontrar vinculação por código do produto
            if (vinculacoesFornecedor[item.codigo]) {
                const insumoId = vinculacoesFornecedor[item.codigo];
                const insumo = insumosDB.find(i => i.id === insumoId);
                
                if (insumo) {
                    item.status = 'vinculado';
                    item.insumoVinculado = insumo;
                    console.log(`Item ${item.codigo} vinculado automaticamente ao insumo ${insumo.nome}`);
                }
            }
            
            // Se não encontrou por código, tentar por descrição similar
            if (item.status === 'pendente') {
                const insumoSimilar = buscarInsumoSimilar(item.descricao);
                if (insumoSimilar) {
                    item.status = 'sugestao';
                    item.insumoVinculado = insumoSimilar;
                }
            }
        });
    }
}

function buscarInsumoSimilar(descricao) {
    const descricaoLimpa = descricao.toLowerCase().trim();
    
    // Buscar por nome exato
    let insumo = insumosDB.find(i => i.nome.toLowerCase() === descricaoLimpa);
    if (insumo) return insumo;
    
    // Buscar por palavras-chave (pelo menos 70% de similaridade)
    const palavrasDescricao = descricaoLimpa.split(' ').filter(p => p.length > 2);
    
    for (const insumo of insumosDB) {
        const palavrasInsumo = insumo.nome.toLowerCase().split(' ').filter(p => p.length > 2);
        const palavrasComuns = palavrasDescricao.filter(p => palavrasInsumo.some(pi => pi.includes(p) || p.includes(pi)));
        
        const similaridade = palavrasComuns.length / Math.max(palavrasDescricao.length, palavrasInsumo.length);
        if (similaridade >= 0.7) {
            return insumo;
        }
    }
    
    return null;
}

function mostrarResultadosImportacao() {
    // Mostrar informações da nota
    const notaInfo = document.getElementById('notaInfo');
    notaInfo.innerHTML = `
        <div><strong>Fornecedor:</strong> ${xmlData.fornecedor.nome} (${xmlData.fornecedor.cnpj})</div>
        <div><strong>Nota:</strong> ${xmlData.numeroNota} - Série: ${xmlData.serie}</div>
        <div><strong>Data:</strong> ${xmlData.dataEmissao}</div>
        <div><strong>Valor Total:</strong> R$ ${xmlData.valorTotal.toFixed(2)}</div>
    `;
    
    // Renderizar itens
    renderItensImportacao();
    
    // Mostrar seção de resultados
    document.getElementById('importResults').classList.remove('hidden');
}

function renderItensImportacao() {
    const tbody = document.getElementById('itensImportacao');
    tbody.innerHTML = '';
    
    itemsParaImportar.forEach((item, index) => {
        const statusClass = item.status === 'vinculado' ? 'text-green-600' :
                           item.status === 'sugestao' ? 'text-yellow-600' :
                           item.status === 'ignorado' ? 'text-gray-500' : 'text-red-600';
        
        const statusText = item.status === 'vinculado' ? 'Vinculado' :
                          item.status === 'sugestao' ? 'Sugestão' :
                          item.status === 'ignorado' ? 'Ignorado' : 'Pendente';
        
        const insumoVinculadoText = item.insumoVinculado ? 
            `${item.insumoVinculado.nome} (${item.insumoVinculado.unidade})` : '-';
        
        // Mostrar se houve conversão
        const conversaoInfo = item.conversaoAplicada ? 
            `<br><small class="text-blue-600">Convertido: ${item.conversaoAplicada.quantidadeOriginal} ${item.conversaoAplicada.unidadeOriginal} → ${item.quantidade} ${item.unidade}</small>` : '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${item.codigo}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.descricao}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${item.quantidade} ${item.unidade}${conversaoInfo}</td>
            <td class="px-4 py-3 text-sm text-gray-900">R$ ${item.valorUnitario.toFixed(2)}</td>
            <td class="px-4 py-3 text-sm ${statusClass}">${statusText}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${insumoVinculadoText}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <button type="button" onclick="abrirVinculacaoInsumo(${index})" 
                        class="text-blue-600 hover:text-blue-800 mr-2">
                    <i data-lucide="link" class="h-4 w-4"></i>
                </button>
                ${item.status !== 'ignorado' ? 
                    `<button type="button" onclick="ignorarItem(${index})" 
                             class="text-gray-600 hover:text-gray-800">
                        <i data-lucide="x" class="h-4 w-4"></i>
                     </button>` : 
                    `<button type="button" onclick="reativarItem(${index})" 
                             class="text-green-600 hover:text-green-800">
                        <i data-lucide="rotate-ccw" class="h-4 w-4"></i>
                     </button>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });
    
    lucide.createIcons();
}

let itemIndexParaVincular = null;

function abrirVinculacaoInsumo(index) {
    itemIndexParaVincular = index;
    const item = itemsParaImportar[index];
    
    // Preencher informações do item
    document.getElementById('itemInfo').innerHTML = `
        <h4 class="font-medium text-gray-900 mb-2">Item da Nota Fiscal</h4>
        <div class="text-sm text-gray-600 space-y-1">
            <div><strong>Código:</strong> ${item.codigo}</div>
            <div><strong>Descrição:</strong> ${item.descricao}</div>
            <div><strong>Quantidade:</strong> ${item.quantidade} ${item.unidade}</div>
            <div><strong>Valor Unitário:</strong> R$ ${item.valorUnitario.toFixed(2)}</div>
        </div>
    `;
    
    // Limpar seleções
    document.querySelectorAll('input[name="vinculacaoOpcao"]').forEach(radio => radio.checked = false);
    
    // Preencher select de insumos existentes
    const select = document.getElementById('insumoExistenteSelect');
    select.innerHTML = '<option value="">Selecione um insumo...</option>';
    
    insumosDB.forEach(insumo => {
        const option = document.createElement('option');
        option.value = insumo.id;
        option.textContent = `${insumo.nome} (${insumo.unidade})`;
        select.appendChild(option);
    });
    
    // Se há uma sugestão, pré-selecionar
    if (item.status === 'sugestao' && item.insumoVinculado) {
        document.querySelector('input[value="existente"]').checked = true;
        select.value = item.insumoVinculado.id;
        toggleVinculacaoOpcao();
    }
    
    // Preencher campos do novo insumo com dados do item
    document.getElementById('novoInsumoNome').value = item.descricao;
    document.getElementById('novoInsumoUnidade').value = mapearUnidade(item.unidade);
    
    // Inicializar dados de conversão
    atualizarDadosConversao(item);
    
    // Preencher dados específicos para vinculação
    preencherDadosVinculacao(item);
    
    showModal('vincularInsumoModal');
}

// Funções para conversão de unidades e edição de insumos
const fatoresConversao = {
    // Peso
    'kg-g': 1000,
    'g-kg': 0.001,
    // Volume  
    'l-ml': 1000,
    'ml-l': 0.001,
    // Unidades (sem conversão automática)
    'un-un': 1,
    'cx-cx': 1,
    'pc-pc': 1,
    'dz-dz': 1,
    'sc-sc': 1,
    'bd-bd': 1,
    'fr-fr': 1,
    // Dúzia para unidade
    'dz-un': 12,
    'un-dz': 1/12
};

function obterFatorConversao(unidadeOrigem, unidadeDestino) {
    if (unidadeOrigem === unidadeDestino) return 1;
    
    const chave = `${unidadeOrigem}-${unidadeDestino}`;
    return fatoresConversao[chave] || null; // null indica que precisa de conversão personalizada
}

function atualizarDadosConversao(item) {
    document.getElementById('quantidadeOriginal').value = item.quantidade;
    document.getElementById('unidadeOriginal').value = mapearUnidade(item.unidade);
    document.getElementById('quantidadeConvertida').value = item.quantidade;
    document.getElementById('unidadeConvertida').value = mapearUnidade(item.unidade);
    document.getElementById('valorUnitarioConvertido').value = item.valorUnitario.toFixed(2);
    document.getElementById('valorUnitarioConvertido').setAttribute('data-original', item.valorUnitario);
    document.getElementById('fatorConversao').textContent = '1';
    document.getElementById('valorTotalConvertido').textContent = item.valorTotal.toFixed(2);
    document.getElementById('tipoConversao').textContent = 'Sem conversão';
    
    // Limpar campos de conversão personalizada
    document.getElementById('pesoUnidade').value = '';
    document.getElementById('unidadePeso').value = 'g';
}

function aplicarConversaoAutomatica() {
    const quantidadeOriginal = parseFloat(document.getElementById('quantidadeOriginal').value) || 0;
    const unidadeOriginal = document.getElementById('unidadeOriginal').value;
    const unidadeDestino = document.getElementById('unidadeConvertida').value;
    const valorUnitarioOriginal = parseFloat(document.getElementById('valorUnitarioConvertido').getAttribute('data-original')) || 
                                 parseFloat(document.getElementById('valorUnitarioConvertido').value) || 0;
    
    const fator = obterFatorConversao(unidadeOriginal, unidadeDestino);
    
    if (fator !== null) {
        // Conversão automática disponível
        const quantidadeConvertida = quantidadeOriginal * fator;
        const valorUnitarioConvertido = fator !== 0 ? valorUnitarioOriginal / fator : valorUnitarioOriginal;
        
        document.getElementById('quantidadeConvertida').value = quantidadeConvertida.toFixed(3);
        document.getElementById('valorUnitarioConvertido').value = valorUnitarioConvertido.toFixed(2);
        document.getElementById('fatorConversao').textContent = fator.toFixed(3);
        document.getElementById('valorTotalConvertido').textContent = (quantidadeConvertida * valorUnitarioConvertido).toFixed(2);
        document.getElementById('tipoConversao').textContent = 'Automática';
        
        // Limpar conversão personalizada
        document.getElementById('pesoUnidade').value = '';
        
        // Aplicar conversão automaticamente aos dados do item
        aplicarConversaoAoItem();
        
    } else {
        // Conversão personalizada necessária
        document.getElementById('quantidadeConvertida').value = quantidadeOriginal;
        document.getElementById('valorUnitarioConvertido').value = valorUnitarioOriginal.toFixed(2);
        document.getElementById('fatorConversao').textContent = '1';
        document.getElementById('valorTotalConvertido').textContent = (quantidadeOriginal * valorUnitarioOriginal).toFixed(2);
        document.getElementById('tipoConversao').textContent = 'Personalizada necessária';
    }
}

function aplicarConversaoPersonalizada() {
    const quantidadeOriginal = parseFloat(document.getElementById('quantidadeOriginal').value) || 0;
    const unidadeOriginal = document.getElementById('unidadeOriginal').value;
    const unidadeDestino = document.getElementById('unidadeConvertida').value;
    const pesoUnidade = parseFloat(document.getElementById('pesoUnidade').value) || 0;
    const unidadePeso = document.getElementById('unidadePeso').value;
    const valorUnitarioOriginal = parseFloat(document.getElementById('valorUnitarioConvertido').getAttribute('data-original')) || 
                                 parseFloat(document.getElementById('valorUnitarioConvertido').value) || 0;
    
    if (pesoUnidade === 0) return;
    
    let quantidadeConvertida = 0;
    let fator = 1;
    
    // Exemplos de conversão personalizada:
    // 10 unidades × 500g cada = 5000g = 5kg
    // 1 dúzia × 60g cada = 720g
    // 1 caixa × 2kg cada = 2kg
    
    if (unidadeOriginal === 'un' || unidadeOriginal === 'dz' || unidadeOriginal === 'cx' || 
        unidadeOriginal === 'pc' || unidadeOriginal === 'sc' || unidadeOriginal === 'bd' || unidadeOriginal === 'fr') {
        
        // Converter o peso por unidade para a unidade de destino
        let pesoTotalOriginal = pesoUnidade; // peso em unidadePeso
        
        // Converter para unidade de destino se necessário
        const fatorPeso = obterFatorConversao(unidadePeso, unidadeDestino);
        if (fatorPeso !== null) {
            pesoTotalOriginal = pesoUnidade * fatorPeso;
        } else if (unidadePeso !== unidadeDestino) {
            // Se não conseguir converter automaticamente, avisar
            document.getElementById('tipoConversao').textContent = 'Erro: Unidades incompatíveis';
            return;
        }
        
        quantidadeConvertida = quantidadeOriginal * pesoTotalOriginal;
        fator = quantidadeConvertida / quantidadeOriginal;
        
    } else {
        // Para outras conversões, usar o peso como fator direto
        quantidadeConvertida = quantidadeOriginal * pesoUnidade;
        fator = pesoUnidade;
    }
    
    const valorUnitarioConvertido = fator !== 0 ? valorUnitarioOriginal / fator : valorUnitarioOriginal;
    
    document.getElementById('quantidadeConvertida').value = quantidadeConvertida.toFixed(3);
    document.getElementById('valorUnitarioConvertido').value = valorUnitarioConvertido.toFixed(2);
    document.getElementById('fatorConversao').textContent = fator.toFixed(3);
    document.getElementById('valorTotalConvertido').textContent = (quantidadeConvertida * valorUnitarioConvertido).toFixed(2);
    document.getElementById('tipoConversao').textContent = `Personalizada (${pesoUnidade}${unidadePeso}/${unidadeOriginal})`;
    
    // Aplicar conversão automaticamente aos dados do item
    aplicarConversaoAoItem();
}

function aplicarConversaoAoItem() {
    // Aplicar conversão automaticamente aos dados do item atual
    if (itemIndexParaVincular !== null && itemsParaImportar[itemIndexParaVincular]) {
        const item = itemsParaImportar[itemIndexParaVincular];
        const quantidadeConvertida = parseFloat(document.getElementById('quantidadeConvertida').value) || 0;
        const valorUnitarioConvertido = parseFloat(document.getElementById('valorUnitarioConvertido').value) || 0;
        const unidadeConvertida = document.getElementById('unidadeConvertida').value;
        const fatorConversao = parseFloat(document.getElementById('fatorConversao').textContent) || 1;
        
        // Armazenar dados convertidos temporariamente no item
        item.quantidadeConvertida = quantidadeConvertida;
        item.unidadeConvertida = unidadeConvertida;
        item.valorUnitarioConvertido = valorUnitarioConvertido;
        item.fatorConversao = fatorConversao;
        item.valorTotalConvertido = quantidadeConvertida * valorUnitarioConvertido;
        
        // Atualizar resumo do item se existir
        atualizarResumoItem();
    }
}

function calcularConversao() {
    const quantidadeOriginal = parseFloat(document.getElementById('quantidadeOriginal').value) || 0;
    const quantidadeConvertida = parseFloat(document.getElementById('quantidadeConvertida').value) || 0;
    const valorUnitarioOriginal = parseFloat(document.getElementById('valorUnitarioConvertido').getAttribute('data-original')) || 
                                 parseFloat(document.getElementById('valorUnitarioConvertido').value) || 0;
    
    if (quantidadeOriginal === 0 || quantidadeConvertida === 0) return;
    
    const fator = quantidadeConvertida / quantidadeOriginal;
    const valorUnitarioConvertido = valorUnitarioOriginal / fator;
    
    document.getElementById('valorUnitarioConvertido').value = valorUnitarioConvertido.toFixed(2);
    document.getElementById('fatorConversao').textContent = fator.toFixed(3);
    document.getElementById('valorTotalConvertido').textContent = (quantidadeConvertida * valorUnitarioConvertido).toFixed(2);
    document.getElementById('tipoConversao').textContent = 'Manual';
}

function carregarDadosInsumoParaEdicao(insumoId) {
    const insumo = insumosDB.find(i => i.id === insumoId);
    if (!insumo) return;
    
    document.getElementById('editarInsumoNome').value = insumo.nome || '';
    document.getElementById('editarInsumoCategoria').value = insumo.categoria || '';
    document.getElementById('editarInsumoTaxaPerda').value = insumo.taxaPerda || 0;
    document.getElementById('editarInsumoFornecedor').value = insumo.fornecedor || '';
    document.getElementById('salvarAlteracoesInsumo').checked = false;
}

function mapearUnidade(unidadeXML) {
    const mapeamento = {
        'KG': 'kg',
        'G': 'g',
        'GR': 'g',
        'L': 'l',
        'LT': 'l',
        'ML': 'ml',
        'UN': 'un',
        'UND': 'un',
        'UNID': 'un',
        'PC': 'pc',
        'PCT': 'pc',
        'CX': 'cx',
        'CAIXA': 'cx',
        'DZ': 'dz',
        'DUZIA': 'dz',
        'SC': 'sc',
        'SACO': 'sc',
        'BD': 'bd',
        'BANDEJA': 'bd',
        'FR': 'fr',
        'FARDO': 'fr'
    };
    
    return mapeamento[unidadeXML.toUpperCase()] || 'un';
}

function toggleVinculacaoOpcao() {
    const opcaoSelecionada = document.querySelector('input[name="vinculacaoOpcao"]:checked')?.value;
    
    document.getElementById('insumoExistenteSection').classList.toggle('hidden', opcaoSelecionada !== 'existente');
    document.getElementById('novoInsumoSection').classList.toggle('hidden', opcaoSelecionada !== 'novo');
    document.getElementById('edicaoInsumoExistenteSection').classList.toggle('hidden', opcaoSelecionada !== 'existente');
    
    // Sempre mostrar seção de conversão se não for ignorar
    document.getElementById('conversaoUnidadesSection').classList.toggle('hidden', opcaoSelecionada === 'ignorar');
    
    // Se selecionou insumo existente, carregar dados para edição
    if (opcaoSelecionada === 'existente') {
        const select = document.getElementById('insumoExistenteSelect');
        if (select.value) {
            carregarDadosInsumoParaEdicao(select.value);
        }
        
        // Adicionar listener para mudanças no select
        select.onchange = function() {
            if (this.value) {
                carregarDadosInsumoParaEdicao(this.value);
            }
        };
    }
    
    // Atualizar dados de conversão
    if (itemIndexParaVincular !== null) {
        const item = itemsParaImportar[itemIndexParaVincular];
        atualizarDadosConversao(item);
    }
}

function closeVincularInsumoModal() {
    hideModal('vincularInsumoModal');
    itemIndexParaVincular = null;
}

function confirmarVinculacao() {
    const opcaoSelecionada = document.querySelector('input[name="vinculacaoOpcao"]:checked')?.value;
    
    if (!opcaoSelecionada) {
        showAlert('Erro', 'Selecione uma opção de vinculação.', 'error');
        return;
    }
    
    const item = itemsParaImportar[itemIndexParaVincular];
    
    // Obter dados de conversão (já aplicados automaticamente)
    const quantidadeConvertida = item.quantidadeConvertida || item.quantidade;
    const unidadeConvertida = item.unidadeConvertida || document.getElementById('unidadeConvertida').value;
    const valorUnitarioConvertido = item.valorUnitarioConvertido || item.valorUnitario;
    
    if (opcaoSelecionada === 'existente') {
        const insumoId = document.getElementById('insumoExistenteSelect').value;
        if (!insumoId) {
            showAlert('Erro', 'Selecione um insumo existente.', 'error');
            return;
        }
        
        const insumo = insumosDB.find(i => i.id === insumoId);
        let insumoAtualizado = {...insumo};
        
        // Verificar se deve salvar alterações no insumo
        if (document.getElementById('salvarAlteracoesInsumo').checked) {
            const nome = document.getElementById('editarInsumoNome').value.trim();
            const categoria = document.getElementById('editarInsumoCategoria').value.trim();
            const taxaPerda = parseFloat(document.getElementById('editarInsumoTaxaPerda').value) || 0;
            const fornecedor = document.getElementById('editarInsumoFornecedor').value.trim();
            
            if (nome) {
                insumoAtualizado.nome = nome;
                insumoAtualizado.categoria = categoria;
                insumoAtualizado.taxaPerda = taxaPerda;
                insumoAtualizado.fornecedor = fornecedor;
                
                // Atualizar no banco de dados
                const index = insumosDB.findIndex(i => i.id === insumoId);
                if (index !== -1) {
                    insumosDB[index] = insumoAtualizado;
                    saveToLocalStorage();
                }
                
                showAlert('Sucesso', 'Dados do insumo atualizados com sucesso!', 'success');
                
                // Atualizar a aba de insumos para mostrar as alterações
                renderInsumos();
            }
        }
        
        // Aplicar conversão ao item
        item.quantidade = quantidadeConvertida;
        item.unidade = unidadeConvertida;
        item.valorUnitario = valorUnitarioConvertido;
        item.valorTotal = quantidadeConvertida * valorUnitarioConvertido;
        item.status = 'vinculado';
        item.insumoVinculado = insumoAtualizado;
        item.conversaoAplicada = {
            quantidadeOriginal: parseFloat(document.getElementById('quantidadeOriginal').value),
            unidadeOriginal: document.getElementById('unidadeOriginal').value,
            fatorConversao: parseFloat(document.getElementById('fatorConversao').textContent)
        };
        
    } else if (opcaoSelecionada === 'novo') {
        const nome = document.getElementById('novoInsumoNome').value.trim();
        const unidade = document.getElementById('novoInsumoUnidade').value;
        const categoria = obterCategoriaVinculacao();
        
        // Sempre usar a taxa padrão das configurações
        const taxaPerda = parseFloat(configuracoesDB.defaultTaxaPerca) || 0;
        
        const valorUnitarioNota = parseFloat(document.getElementById('valorUnitarioNota').value) || 0;
        const valorFinalComPerda = parseFloat(document.getElementById('valorFinalComPerda').value) || valorUnitarioNota;
        
        if (!nome) {
            showAlert('Erro', 'Digite o nome do insumo.', 'error');
            return;
        }
        
        // Criar novo insumo
        const novoInsumo = {
            id: generateId(),
            nome,
            unidade: unidadeConvertida, // Usar unidade convertida
            categoria: categoria || 'Importado',
            taxaPerda,
            valorUnitario: valorUnitarioNota,
            valorFinalComPerda: valorFinalComPerda,
            fornecedor: xmlData.fornecedor.nome,
            dataInclusao: new Date().toISOString()
        };
        
        insumosDB.push(novoInsumo);
        saveToLocalStorage();
        
        // Aplicar conversão ao item - usar valor com perda se aplicável
        item.quantidade = quantidadeConvertida;
        item.unidade = unidadeConvertida;
        item.valorUnitario = valorFinalComPerda; // Usar valor ajustado com perda
        item.valorUnitarioOriginal = valorUnitarioNota; // Manter valor original da nota
        item.valorTotal = quantidadeConvertida * valorFinalComPerda;
        item.status = 'vinculado';
        item.insumoVinculado = novoInsumo;
        item.conversaoAplicada = {
            quantidadeOriginal: parseFloat(document.getElementById('quantidadeOriginal').value),
            unidadeOriginal: document.getElementById('unidadeOriginal').value,
            fatorConversao: parseFloat(document.getElementById('fatorConversao').textContent),
            taxaPerdaAplicada: taxaPerda,
            valorComPerda: valorFinalComPerda
        };
        
        const mensagem = taxaPerda > 0 
            ? `Novo insumo "${nome}" criado e vinculado com taxa de perda de ${taxaPerda}%!`
            : `Novo insumo "${nome}" criado e vinculado com sucesso!`;
        
        showAlert('Sucesso', mensagem, 'success');
        
        // Atualizar a aba de insumos para mostrar o novo insumo criado
        renderInsumos();
        
    } else if (opcaoSelecionada === 'ignorar') {
        item.status = 'ignorado';
        item.insumoVinculado = null;
    }
    
    renderItensImportacao();
    closeVincularInsumoModal();
}

function ignorarItem(index) {
    itemsParaImportar[index].status = 'ignorado';
    itemsParaImportar[index].insumoVinculado = null;
    renderItensImportacao();
}

function reativarItem(index) {
    itemsParaImportar[index].status = 'pendente';
    renderItensImportacao();
}

function cancelarImportacao() {
    document.getElementById('importResults').classList.add('hidden');
    document.getElementById('xmlFileInput').value = '';
    xmlData = null;
    itemsParaImportar = [];
}

function confirmarImportacao() {
    const itensVinculados = itemsParaImportar.filter(item => item.status === 'vinculado');
    
    if (itensVinculados.length === 0) {
        showAlert('Aviso', 'Nenhum item foi vinculado. Vincule pelo menos um item antes de confirmar.', 'error');
        return;
    }
    
    // Salvar vinculações para futuras importações
    salvarVinculacoes();
    
    // Criar compras para os itens vinculados
    criarComprasDoXML(itensVinculados);
    
    // Adicionar ao histórico
    adicionarAoHistorico();
    
    // Limpar interface
    cancelarImportacao();
    
    showAlert('Sucesso', `Importação concluída! ${itensVinculados.length} itens foram processados.`, 'success');
    
    // Atualizar todas as views que podem ter sido afetadas
    renderInsumos();
    renderDashboard();
}

function salvarVinculacoes() {
    const vinculacoesSalvas = JSON.parse(localStorage.getItem('vinculacoesXML') || '{}');
    const chaveVinculacao = xmlData.fornecedor.cnpj;
    
    if (!vinculacoesSalvas[chaveVinculacao]) {
        vinculacoesSalvas[chaveVinculacao] = {};
    }
    
    itemsParaImportar.forEach(item => {
        if (item.status === 'vinculado' && item.insumoVinculado) {
            vinculacoesSalvas[chaveVinculacao][item.codigo] = item.insumoVinculado.id;
        }
    });
    
    localStorage.setItem('vinculacoesXML', JSON.stringify(vinculacoesSalvas));
}

function criarComprasDoXML(itensVinculados) {
    itensVinculados.forEach(item => {
        const compra = {
            id: generateId(),
            insumoId: item.insumoVinculado.id,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            fornecedor: xmlData.fornecedor.nome,
            dataCompra: xmlData.dataEmissao,
            notaFiscal: xmlData.numeroNota,
            origem: 'xml_import',
            dadosXML: {
                codigoProduto: item.codigo,
                descricaoProduto: item.descricao,
                unidadeXML: item.unidade
            }
        };
        
        comprasDB.push(compra);
    });
    
    saveToLocalStorage();
}

function adicionarAoHistorico() {
    const historico = {
        id: generateId(),
        data: new Date().toISOString(),
        fornecedor: xmlData.fornecedor.nome,
        cnpjFornecedor: xmlData.fornecedor.cnpj,
        numeroNota: xmlData.numeroNota,
        serie: xmlData.serie,
        dataEmissao: xmlData.dataEmissao,
        valorTotal: xmlData.valorTotal,
        totalItens: xmlData.itens.length,
        itensImportados: itemsParaImportar.filter(i => i.status === 'vinculado').length,
        itensIgnorados: itemsParaImportar.filter(i => i.status === 'ignorado').length
    };
    
    historicoImportacoes.unshift(historico);
    
    // Manter apenas os últimos 50 registros
    if (historicoImportacoes.length > 50) {
        historicoImportacoes = historicoImportacoes.slice(0, 50);
    }
    
    localStorage.setItem('historicoImportacoes', JSON.stringify(historicoImportacoes));
    renderHistoricoImportacoes();
}

function renderHistoricoImportacoes() {
    const tbody = document.getElementById('historicoImportacoes');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    historicoImportacoes.forEach(historico => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${formatDate(historico.data)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${historico.fornecedor}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${historico.numeroNota}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                ${historico.itensImportados}/${historico.totalItens}
                ${historico.itensIgnorados > 0 ? `<span class="text-gray-500">(${historico.itensIgnorados} ignorados)</span>` : ''}
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">R$ ${historico.valorTotal.toFixed(2)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">
                <div class="flex gap-2">
                    <button type="button" onclick="verDetalhesHistorico('${historico.id}')" 
                            class="text-blue-600 hover:text-blue-800" title="Ver detalhes">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button type="button" onclick="excluirImportacao('${historico.id}')" 
                            class="text-red-600 hover:text-red-800" title="Excluir importação">
                        <i data-lucide="trash-2" class="h-4 w-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    lucide.createIcons();
}

function excluirImportacao(historicoId) {
    const historico = historicoImportacoes.find(h => h.id === historicoId);
    if (!historico) return;
    
    if (confirm(`Tem certeza que deseja excluir a importação da nota ${historico.numeroNota} do fornecedor ${historico.fornecedor}?\n\nEsta ação não pode ser desfeita.`)) {
        // Remover do histórico
        const index = historicoImportacoes.findIndex(h => h.id === historicoId);
        if (index !== -1) {
            historicoImportacoes.splice(index, 1);
            
            // Salvar no localStorage
            localStorage.setItem('historicoImportacoes', JSON.stringify(historicoImportacoes));
            
            // Remover também do Firebase se estiver conectado
            if (isFirebaseReady && firebaseServices) {
                const { db, doc, deleteDoc } = firebaseServices;
                try {
                    deleteDoc(doc(db, 'historicoImportacoes', historicoId));
                } catch (error) {
                    console.warn('Erro ao excluir do Firebase:', error);
                }
            }
            
            // Atualizar interface
            renderHistoricoImportacoes();
            showAlert('Sucesso', 'Importação excluída com sucesso!', 'success');
        }
    }
}

function verDetalhesHistorico(historicoId) {
    const historico = historicoImportacoes.find(h => h.id === historicoId);
    if (!historico) return;
    
    const detalhes = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div><strong>Fornecedor:</strong> ${historico.fornecedor}</div>
                <div><strong>CNPJ:</strong> ${historico.cnpjFornecedor}</div>
                <div><strong>Nota:</strong> ${historico.numeroNota} - Série: ${historico.serie}</div>
                <div><strong>Data Emissão:</strong> ${historico.dataEmissao}</div>
                <div><strong>Data Importação:</strong> ${formatDate(historico.data)}</div>
                <div><strong>Valor Total:</strong> R$ ${historico.valorTotal.toFixed(2)}</div>
            </div>
            <div class="border-t pt-4">
                <strong>Resumo da Importação:</strong>
                <ul class="mt-2 space-y-1 text-sm">
                    <li>• Total de itens na nota: ${historico.totalItens}</li>
                    <li>• Itens importados: ${historico.itensImportados}</li>
                    <li>• Itens ignorados: ${historico.itensIgnorados}</li>
                </ul>
            </div>
        </div>
    `;
    
    showCustomModal('Detalhes da Importação', detalhes);
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('pt-BR');
}

// === FUNÇÕES DOS BOTÕES DE CONVERSÃO (REMOVIDAS - CONVERSÃO AUTOMÁTICA) ===
// As funções cancelarConversao() e confirmarConversao() foram removidas
// A conversão agora acontece automaticamente quando a unidade é alterada

function atualizarResumoItem() {
    if (!window.currentImportItem) return;
    
    const item = window.currentImportItem;
    const resumoElement = document.getElementById('resumoItemAtual');
    
    if (resumoElement) {
        let html = `
            <div class="bg-blue-50 p-4 rounded-lg">
                <h5 class="font-medium text-gray-900 mb-2">Item: ${item.descricao}</h5>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Quantidade Original: ${item.quantidade} ${item.unidade}</div>
                    <div>Valor Original: R$ ${item.valorUnitario.toFixed(2)}</div>
        `;
        
        if (item.quantidadeConvertida && item.quantidadeConvertida !== item.quantidade) {
            html += `
                    <div class="text-green-600">Quantidade Convertida: ${item.quantidadeConvertida} ${item.unidadeConvertida}</div>
                    <div class="text-green-600">Valor Convertido: R$ ${item.valorUnitarioConvertido.toFixed(2)}</div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        resumoElement.innerHTML = html;
    }
}

// === GESTÃO DE CATEGORIAS ===
function carregarCategorias() {
    console.log('🔄 carregarCategorias() iniciada');
    console.log('📊 categoriasDB atual:', [...categoriasDB]);
    
    const listaCategorias = document.getElementById('listaCategorias');
    const selectCategoria = document.getElementById('insumoCategoria');
    
    console.log('🎯 Elementos encontrados:', {
        listaCategorias: !!listaCategorias,
        selectCategoria: !!selectCategoria
    });
    
    if (!listaCategorias || !selectCategoria) {
        console.warn('⚠️ Elementos não encontrados, saindo...');
        return;
    }
    
    // Categorias padrão se não existir nenhuma
    if (categoriasDB.length === 0) {
        categoriasDB = [
            'Carnes',
            'Vegetais',
            'Frutas',
            'Laticínios',
            'Grãos e Cereais',
            'Temperos e Condimentos',
            'Bebidas',
            'Doces e Sobremesas'
        ];
        salvarDados();
    }
    
    // Atualizar lista visual
    listaCategorias.innerHTML = '';
    categoriasDB.forEach((categoria, index) => {
        const categoriaElement = document.createElement('div');
        categoriaElement.className = 'flex items-center justify-between p-2 bg-gray-50 rounded border';
        categoriaElement.innerHTML = `
            <span class="text-sm text-gray-700">${categoria}</span>
            <button onclick="removerCategoria(${index})" class="text-red-500 hover:text-red-700">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
        `;
        listaCategorias.appendChild(categoriaElement);
    });
    
    // Atualizar select do modal
    selectCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
    categoriasDB.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        selectCategoria.appendChild(option);
    });
    
    // Inicializar ícones Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function adicionarCategoria() {
    console.log('🔧 adicionarCategoria() iniciada');
    
    const input = document.getElementById('novaCategoria');
    const categoria = input.value.trim();
    
    console.log('📝 Categoria digitada:', categoria);
    console.log('📊 categoriasDB antes:', [...categoriasDB]);
    
    if (!categoria) {
        showAlert('Erro', 'Digite o nome da categoria', 'error');
        return;
    }
    
    if (categoriasDB.includes(categoria)) {
        showAlert('Erro', 'Esta categoria já existe', 'error');
        return;
    }
    
    categoriasDB.push(categoria);
    console.log('📊 categoriasDB depois:', [...categoriasDB]);
    
    input.value = '';
    
    // Verificar localStorage antes de salvar
    const beforeSave = localStorage.getItem('categoriasDB');
    console.log('💾 localStorage antes do save:', beforeSave);
    
    salvarDados();
    
    // Verificar localStorage depois de salvar
    const afterSave = localStorage.getItem('categoriasDB');
    console.log('💾 localStorage depois do save:', afterSave);
    
    carregarCategorias();
    showAlert('Sucesso', 'Categoria adicionada com sucesso!', 'success');
}

function removerCategoria(index) {
    if (confirm('Tem certeza que deseja remover esta categoria?')) {
        categoriasDB.splice(index, 1);
        salvarDados();
        carregarCategorias();
        showAlert('Sucesso', 'Categoria removida com sucesso!', 'success');
    }
}

// === FUNÇÕES MELHORADAS PARA APLICAR TAXA DE PERDA ===
function calcularValorComPerda(valorUnitario, taxaPerca) {
    // Aplicar taxa de perda no valor unitário
    // Se temos 10% de perda, o valor real deve ser 10% maior
    const fatorPerda = 1 + (taxaPerca / 100);
    return valorUnitario * fatorPerda;
}

function atualizarValorComPerda() {
    const valorUnitario = parseFloat(document.getElementById('insumoValorUnitario').value) || 0;
    const taxaPerca = parseFloat(document.getElementById('insumoTaxaPerca').value) || 0;
    const campoValorFinal = document.getElementById('insumoValorFinal');
    
    if (campoValorFinal) {
        const valorFinal = calcularValorComPerda(valorUnitario, taxaPerca);
        campoValorFinal.value = valorFinal.toFixed(4);
    }
}

// === FUNÇÕES PARA VINCULAÇÃO COM CATEGORIAS E TAXA DE PERDA ===
function carregarCategoriasVinculacao() {
    const select = document.getElementById('novoInsumoCategoriaSelect');
    if (!select) return;
    
    // Limpar opções existentes (exceto as padrões)
    select.innerHTML = `
        <option value="">Selecione uma categoria</option>
        <option value="nova">+ Nova categoria</option>
    `;
    
    // Adicionar categorias existentes
    categoriasDB.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        select.appendChild(option);
    });
}

function alternarCampoNovaCategoria() {
    const input = document.getElementById('novoInsumoCategoriaInput');
    const select = document.getElementById('novoInsumoCategoriaSelect');
    
    if (input.classList.contains('hidden')) {
        input.classList.remove('hidden');
        select.value = 'nova';
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = '';
        select.value = '';
    }
}

function selecionarCategoriaVinculacao() {
    const select = document.getElementById('novoInsumoCategoriaSelect');
    const input = document.getElementById('novoInsumoCategoriaInput');
    
    if (select.value === 'nova') {
        input.classList.remove('hidden');
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = '';
    }
}

function calcularValorComPerdaVinculacao() {
    const valorNota = parseFloat(document.getElementById('valorUnitarioNota').value) || 0;
    
    // Sempre usar a taxa padrão das configurações
    const taxaPerca = parseFloat(configuracoesDB.defaultTaxaPerca) || 0;
    
    console.log('DEBUG: calcularValorComPerdaVinculacao', {
        valorNota,
        taxaPerca,
        configuracoesDB: configuracoesDB
    });
    
    const valorFinal = calcularValorComPerda(valorNota, taxaPerca);
    const fatorPerda = 1 + (taxaPerca / 100);
    
    // Atualizar campos
    document.getElementById('valorFinalComPerda').value = valorFinal.toFixed(4);
    document.getElementById('fatorPerdaDisplay').textContent = fatorPerda.toFixed(2);
    document.getElementById('impactoCustoDisplay').textContent = `+${taxaPerca.toFixed(1)}%`;
    
    // Atualizar display da taxa padrão
    const taxaPadraoDisplay = document.getElementById('taxaPerdaPadrao');
    if (taxaPadraoDisplay) {
        taxaPadraoDisplay.textContent = `${taxaPerca.toFixed(1)}%`;
    }
}

function preencherDadosVinculacao(item) {
    // Preencher dados do item da nota
    const valorUnitario = item.valorUnitario || 0;
    document.getElementById('valorUnitarioNota').value = valorUnitario.toFixed(2);
    
    // Carregar categorias no select
    carregarCategoriasVinculacao();
    
    // Mostrar taxa padrão das configurações
    const taxaPadrao = parseFloat(configuracoesDB.defaultTaxaPerca) || 0;
    const taxaPadraoDisplay = document.getElementById('taxaPerdaPadrao');
    if (taxaPadraoDisplay) {
        taxaPadraoDisplay.textContent = `${taxaPadrao.toFixed(1)}%`;
    }
    
    // Calcular valor com perda
    calcularValorComPerdaVinculacao();
}

function obterCategoriaVinculacao() {
    const select = document.getElementById('novoInsumoCategoriaSelect');
    const input = document.getElementById('novoInsumoCategoriaInput');
    
    if (select.value === 'nova' && input.value.trim()) {
        const novaCategoria = input.value.trim();
        
        // Adicionar à lista de categorias se não existir
        if (!categoriasDB.includes(novaCategoria)) {
            categoriasDB.push(novaCategoria);
            salvarDados();
            carregarCategorias(); // Atualizar todas as listas de categorias
        }
        
        return novaCategoria;
    } else if (select.value && select.value !== 'nova') {
        return select.value;
    }
    
    return '';
}

// === FUNÇÕES DE INICIALIZAÇÃO DE EVENTOS ===
function inicializarEventosVinculacao() {
    // Adicionar listener para Enter no campo de nova categoria
    const inputNovaCategoria = safeGetElement('novoInsumoCategoriaInput');
    if (inputNovaCategoria) {
        inputNovaCategoria.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const categoria = this.value.trim();
                if (categoria && !categoriasDB.includes(categoria)) {
                    categoriasDB.push(categoria);
                    salvarDados();
                    carregarCategoriasVinculacao();
                    const selectCategoria = safeGetElement('novoInsumoCategoriaSelect');
                    if (selectCategoria) {
                        selectCategoria.value = categoria;
                    }
                    this.classList.add('hidden');
                    this.value = '';
                    showAlert('Sucesso', 'Categoria adicionada: ' + categoria, 'success');
                }
            }
        });
    } else {
        // Log silencioso - elementos podem não estar na página atual
        // console.warn('Campo de nova categoria não encontrado');
    }
}

// --- FUNÇÕES DE SELEÇÃO MÚLTIPLA ---
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectionCount();
}

function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('.item-checkbox:checked');
    const count = checkboxes.length;
    const selectAll = document.getElementById('selectAll');
    const multiSelectActions = document.getElementById('multiSelectActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedCount) {
        selectedCount.textContent = `${count} itens selecionados`;
    }
    
    if (multiSelectActions) {
        if (count > 0) {
            multiSelectActions.classList.remove('hidden');
        } else {
            multiSelectActions.classList.add('hidden');
        }
    }
    
    // Atualizar estado do checkbox "selecionar todos"
    if (selectAll) {
        const allCheckboxes = document.querySelectorAll('.item-checkbox');
        if (count === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (count === allCheckboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }
}

function clearSelection() {
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('selectAll').checked = false;
    updateSelectionCount();
}

function deleteSelectedInsumos() {
    const selected = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => cb.value);
    
    if (selected.length === 0) {
        showAlert('Nenhum item selecionado', 'Selecione pelo menos um insumo para excluir.', 'warning');
        return;
    }
    
    // Verificar se algum dos insumos selecionados está em uso
    const insumosEmUso = [];
    selected.forEach(id => {
        const usedInFichas = fichasTecnicasDB.filter(ficha => 
            ficha.ingredientes && ficha.ingredientes.some(ing => ing.insumoId === id)
        );
        
        const usedInPratos = pratosDB.filter(prato => 
            prato.insumos && prato.insumos.some(ing => ing.insumoId === id)
        );
        
        if (usedInFichas.length > 0 || usedInPratos.length > 0) {
            const insumo = insumosDB.find(i => i.id === id);
            insumosEmUso.push({
                insumo: insumo,
                fichas: usedInFichas,
                pratos: usedInPratos
            });
        }
    });
    
    let message = `Tem certeza que deseja excluir ${selected.length} insumo(s) selecionado(s)?`;
    
    if (insumosEmUso.length > 0) {
        message += '\n\nATENÇÃO: Os seguintes insumos estão sendo usados:\n\n';
        insumosEmUso.forEach(item => {
            message += `• ${item.insumo.nome}\n`;
            if (item.fichas.length > 0) {
                message += `  Fichas: ${item.fichas.map(f => f.nome).join(', ')}\n`;
            }
            if (item.pratos.length > 0) {
                message += `  Pratos: ${item.pratos.map(p => p.nome).join(', ')}\n`;
            }
        });
        message += '\nEstes itens ficarão com ingredientes incompletos.';
    }
    
    if (confirm(message)) {
        // Excluir todos os insumos selecionados
        selected.forEach(id => {
            insumosDB = insumosDB.filter(i => i.id !== id);
            
            // Deletar do Firebase se estiver conectado
            if (isFirebaseReady) {
                deleteFromFirebase('insumos', id);
            }
        });
        
        saveData();
        renderInsumos();
        clearSelection();
        showAlert('Insumos Excluídos', `${selected.length} insumo(s) removido(s) com sucesso!`, 'success');
    }
}

// Chamar na inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    inicializarEventosVinculacao();
});

// =====================================================
// 👥 SISTEMA DE GERENCIAMENTO DE USUÁRIOS
// =====================================================

// Carregar lista de usuários do restaurante
async function carregarUsuarios() {
    if (!firebaseServices || !currentRestaurant?.id) return;
    
    try {
        const { db, collection, query, where, getDocs } = firebaseServices;
        
        const usersQuery = query(
            collection(db, 'users'),
            where('restaurantId', '==', currentRestaurant.id)
        );
        
        const querySnapshot = await getDocs(usersQuery);
        const usuarios = [];
        
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            usuarios.push({
                id: doc.id,
                ...userData
            });
        });
        
        renderUsuarios(usuarios);
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
    }
}

// Renderizar lista de usuários
function renderUsuarios(usuarios) {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    
    container.innerHTML = '';
    
    usuarios.forEach(usuario => {
        const roleDisplay = getRoleDisplayName(usuario.role);
        const isCurrentUser = usuario.id === currentUser?.uid;
        
        const userCard = document.createElement('div');
        userCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        
        userCard.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-medium">
                    ${usuario.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-900">
                        ${usuario.name} ${isCurrentUser ? '(Você)' : ''}
                    </p>
                    <p class="text-xs text-gray-500">${usuario.email}</p>
                    <p class="text-xs text-orange-600 font-medium">${roleDisplay}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                ${!isCurrentUser && (userRole === 'admin' || userRole === 'manager') ? `
                    <select onchange="alterarRoleUsuario('${usuario.id}', this.value)" 
                            class="text-xs px-2 py-1 border border-gray-300 rounded">
                        <option value="user" ${usuario.role === 'user' ? 'selected' : ''}>Usuário</option>
                        <option value="chef" ${usuario.role === 'chef' ? 'selected' : ''}>Chef</option>
                        <option value="manager" ${usuario.role === 'manager' ? 'selected' : ''}>Gerente</option>
                        ${userRole === 'admin' ? `<option value="admin" ${usuario.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
                    </select>
                    <button onclick="removerUsuario('${usuario.id}', '${usuario.name}')" 
                            class="text-red-600 hover:text-red-800 text-xs p-1">
                        <i data-lucide="trash-2" class="h-3 w-3"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(userCard);
    });
    
    // Re-renderizar ícones do Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Convidar novo usuário
async function convidarUsuario() {
    const email = document.getElementById('novoUsuarioEmail')?.value?.trim();
    const role = document.getElementById('novoUsuarioRole')?.value;
    
    if (!email) {
        showAlert('Erro', 'Digite o email do usuário', 'error');
        return;
    }
    
    if (!currentRestaurant?.id) {
        showAlert('Erro', 'Restaurante não identificado', 'error');
        return;
    }
    
    try {
        const { db, collection, doc: fbDoc, setDoc } = firebaseServices;
        
        // 1. Salvar convite no Firebase
        const inviteId = generateId();
        const inviteRef = fbDoc(db, 'invites', inviteId);
        
        const inviteData = {
            email: email,
            role: role,
            restaurantId: currentRestaurant.id,
            restaurantName: currentRestaurant.name,
            invitedBy: currentUser.uid,
            invitedByName: currentUser.displayName || currentUser.email,
            createdAt: new Date().toISOString(),
            status: 'pending', // pending, accepted, expired
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
        };
        
        await setDoc(inviteRef, inviteData);
        
        // 2. Criar mensagem com instruções
        const inviteMessage = `
🏢 CONVITE PARA ${currentRestaurant.name}

Você foi convidado(a) para fazer parte da equipe como ${getRoleDisplayName(role)}.

📋 COMO ACEITAR:
1. Acesse: https://allanmths.github.io/CozinhaInteligente/
2. Crie sua conta escolhendo "Juntar-se a Restaurante"
3. Use o código: ${currentRestaurant.accessCode || await getRestaurantCode()}

O convite expira em 7 dias.
        `;
        
        console.log('📧 Instruções do convite:', inviteMessage);
        
        // 3. Mostrar instruções para compartilhar
        showAlert('Convite Criado', 
            `Convite criado para ${email}. Compartilhe o código do restaurante: ${currentRestaurant.accessCode || 'Carregando...'} \n\nInstruções detalhadas foram logadas no console.`, 
            'success');
        
        // Limpar campos
        document.getElementById('novoUsuarioEmail').value = '';
        document.getElementById('novoUsuarioRole').value = 'user';
        
    } catch (error) {
        console.error('❌ Erro ao convidar usuário:', error);
        showAlert('Erro', 'Erro ao enviar convite', 'error');
    }
}

// Buscar código do restaurante (função auxiliar)
async function getRestaurantCode() {
    try {
        if (!currentRestaurant?.id) return null;
        
        const { db, doc: fbDoc, getDoc } = firebaseServices;
        const restaurantRef = fbDoc(db, 'restaurants', currentRestaurant.id);
        const restaurantSnap = await getDoc(restaurantRef);
        
        if (restaurantSnap.exists()) {
            return restaurantSnap.data().accessCode;
        }
    } catch (error) {
        console.error('❌ Erro ao buscar código:', error);
    }
    return null;
}

// Alterar role do usuário
async function alterarRoleUsuario(userId, newRole) {
    if (!firebaseServices) return;
    
    try {
        const { db, doc: fbDoc, updateDoc } = firebaseServices;
        
        await updateDoc(fbDoc(db, 'users', userId), {
            role: newRole,
            updatedAt: new Date().toISOString()
        });
        
        showAlert('Sucesso', `Papel do usuário alterado para ${getRoleDisplayName(newRole)}`, 'success');
        carregarUsuarios(); // Recarregar lista
        
    } catch (error) {
        console.error('❌ Erro ao alterar papel do usuário:', error);
        showAlert('Erro', 'Erro ao alterar papel do usuário', 'error');
    }
}

// Remover usuário
async function removerUsuario(userId, userName) {
    if (!confirm(`Tem certeza que deseja remover ${userName} do restaurante?`)) return;
    
    if (!firebaseServices) return;
    
    try {
        const { db, doc: fbDoc, deleteDoc } = firebaseServices;
        
        await deleteDoc(fbDoc(db, 'users', userId));
        
        showAlert('Sucesso', `${userName} foi removido do restaurante`, 'success');
        carregarUsuarios(); // Recarregar lista
        
    } catch (error) {
        console.error('❌ Erro ao remover usuário:', error);
        showAlert('Erro', 'Erro ao remover usuário', 'error');
    }
}

// =====================================================
// 🔑 SISTEMA DE CÓDIGO DO RESTAURANTE
// =====================================================

// Gerar código do restaurante
function generateRestaurantCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Carregar código do restaurante
async function carregarCodigoRestaurante() {
    console.log('🔄 === CARREGANDO CÓDIGO DO RESTAURANTE ===');
    
    if (!firebaseServices) {
        console.error('❌ Firebase services não disponível');
        return;
    }
    
    if (!currentRestaurant?.id) {
        console.error('❌ ID do restaurante não disponível:', currentRestaurant);
        return;
    }
    
    try {
        const { db, doc: fbDoc, getDoc, updateDoc } = firebaseServices;
        
        console.log(`🏢 Carregando restaurante: ${currentRestaurant.id}`);
        const restaurantRef = fbDoc(db, 'restaurants', currentRestaurant.id);
        const restaurantSnap = await getDoc(restaurantRef);
        
        if (restaurantSnap.exists()) {
            const data = restaurantSnap.data();
            
            console.log('🔍 Dados completos do restaurante:', data);
            
            // Verificar se existe código de acesso
            let accessCode = data.accessCode;
            
            if (!accessCode || accessCode === '') {
                console.log('⚠️ Código de acesso vazio ou inexistente, gerando novo...');
                accessCode = generateRestaurantCode();
                
                console.log(`🔄 Gerando código: ${accessCode}`);
                
                // Atualizar no Firebase
                await updateDoc(restaurantRef, {
                    accessCode: accessCode,
                    updatedAt: new Date().toISOString()
                });
                
                console.log('✅ Código salvo no Firebase');
            } else {
                console.log(`✅ Código existente encontrado: ${accessCode}`);
            }
            
            // Verificar se os elementos da interface existem
            const codeInput = document.getElementById('restaurantCode');
            const nameInput = document.getElementById('restaurantName');
            
            console.log('🔍 Elementos da interface:');
            console.log('  - restaurantCode:', codeInput ? 'Encontrado' : 'NÃO ENCONTRADO');
            console.log('  - restaurantName:', nameInput ? 'Encontrado' : 'NÃO ENCONTRADO');
            
            // Atualizar campos na interface
            if (codeInput) {
                codeInput.value = accessCode;
                console.log(`✅ Campo código atualizado com: "${accessCode}"`);
                
                // Forçar atualização visual
                codeInput.setAttribute('value', accessCode);
                codeInput.dispatchEvent(new Event('input'));
            } else {
                console.error('❌ Campo restaurantCode não encontrado na página');
            }
            
            if (nameInput) {
                nameInput.value = data.name || '';
                console.log(`✅ Campo nome atualizado com: "${data.name}"`);
            } else {
                console.error('❌ Campo restaurantName não encontrado na página');
            }
            
        } else {
            console.error('❌ Documento do restaurante não encontrado no Firebase');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar código do restaurante:', error);
        console.error('📋 Stack trace:', error.stack);
    }
}

// Copiar código para clipboard
async function copiarCodigo() {
    const codeInput = document.getElementById('restaurantCode');
    if (!codeInput) return;
    
    try {
        await navigator.clipboard.writeText(codeInput.value);
        showAlert('Copiado', 'Código copiado para a área de transferência', 'success');
    } catch (error) {
        // Fallback para browsers antigos
        codeInput.select();
        document.execCommand('copy');
        showAlert('Copiado', 'Código copiado para a área de transferência', 'success');
    }
}

// Gerar novo código
async function gerarNovoCodigo() {
    if (!confirm('Tem certeza que deseja gerar um novo código? O código atual será invalidado.')) return;
    
    if (!firebaseServices || !currentRestaurant?.id) return;
    
    try {
        const { db, doc: fbDoc, updateDoc } = firebaseServices;
        
        const newCode = generateRestaurantCode();
        
        await updateDoc(fbDoc(db, 'restaurants', currentRestaurant.id), {
            accessCode: newCode,
            updatedAt: new Date().toISOString()
        });
        
        document.getElementById('restaurantCode').value = newCode;
        showAlert('Sucesso', 'Novo código gerado com sucesso', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao gerar novo código:', error);
        showAlert('Erro', 'Erro ao gerar novo código', 'error');
    }
}

// Atualizar nome do restaurante
async function atualizarNomeRestaurante() {
    const nameInput = document.getElementById('restaurantName');
    if (!nameInput) return;
    
    const newName = nameInput.value.trim();
    if (!newName) {
        showAlert('Erro', 'Digite um nome para o restaurante', 'error');
        return;
    }
    
    if (!firebaseServices || !currentRestaurant?.id) return;
    
    try {
        const { db, doc: fbDoc, updateDoc } = firebaseServices;
        
        await updateDoc(fbDoc(db, 'restaurants', currentRestaurant.id), {
            name: newName,
            updatedAt: new Date().toISOString()
        });
        
        // Atualizar dados locais
        currentRestaurant.name = newName;
        document.title = `${newName} - Cozinha Inteligente`;
        
        showAlert('Sucesso', 'Nome do restaurante atualizado', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar nome do restaurante:', error);
        showAlert('Erro', 'Erro ao atualizar nome do restaurante', 'error');
    }
}

// Mostrar/ocultar gerenciamento de usuários baseado no papel
function updateUIBasedOnRole(role) {
    const userManagementCard = document.getElementById('userManagementCard');
    
    if (userManagementCard) {
        // Apenas admins e gerentes podem ver o gerenciamento de usuários
        if (role === 'admin' || role === 'manager') {
            userManagementCard.style.display = 'block';
        } else {
            userManagementCard.style.display = 'none';
        }
    }
    
    // Aplicar outras regras de UI baseadas no papel
    // ... outras regras podem ser adicionadas aqui
}

// 🎨 Atualizar informações do usuário na interface
function updateUserDisplayInfo() {
    const currentUserNameElement = document.getElementById('currentUserName');
    if (!currentUserNameElement || !currentUser || !currentRestaurant) return;
    
    try {
        // Obter dados do usuário
        const userName = currentUser.displayName || currentUser.email;
        const roleDisplay = getRoleDisplayName(userRole);
        
        // Texto mais compacto para evitar overflow
        const displayName = userName.length > 25 ? userName.substring(0, 22) + '...' : userName;
        
        // Atualizar elemento com nome do restaurante correto
        currentUserNameElement.innerHTML = 
            `${displayName}<br><span class="text-xs text-orange-600">${roleDisplay} • ${currentRestaurant.name || 'Sem restaurante'}</span>`;
            
        console.log(`🎨 Interface atualizada: ${displayName} - ${roleDisplay} - ${currentRestaurant.name}`);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface do usuário:', error);
    }
}

// =====================================================
// 📄 FUNCÇÕES PARA DOCUMENTOS LEGAIS
// =====================================================

// Abrir termos de uso
function openTermsOfService() {
    window.open('termos-de-uso.html', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
}

// Abrir política de privacidade
function openPrivacyPolicy() {
    window.open('politica-privacidade.html', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
}

// Validar aceitação dos termos com feedback visual
function validateTermsAcceptance() {
    const termsCheckbox = document.getElementById('acceptTerms');
    if (!termsCheckbox) return true;
    
    if (!termsCheckbox.checked) {
        // Destacar visualmente o checkbox
        termsCheckbox.parentElement.classList.add('ring-2', 'ring-red-500', 'rounded');
        
        // Remover destaque após alguns segundos
        setTimeout(() => {
            termsCheckbox.parentElement.classList.remove('ring-2', 'ring-red-500', 'rounded');
        }, 3000);
        
        return false;
    }
    
    return true;
}

// =====================================================
// 💰 FUNÇÕES DE CÁLCULO DE PREÇOS PROPORCIONAIS
// =====================================================

// Função para selecionar insumo e pré-popular dados
function selecionarInsumo(selectElement) {
    const insumoId = selectElement.value;
    const container = selectElement.parentElement;
    const unidadeSelect = container.querySelector('.ingrediente-unidade');
    
    if (insumoId) {
        const insumo = insumosDB.find(i => i.id === insumoId);
        if (insumo) {
            // Definir a unidade padrão do insumo
            unidadeSelect.value = insumo.unidade;
        }
    }
    
    // Atualizar o preço
    atualizarPrecoIngrediente(container);
}

// Função para calcular preço proporcional baseado na quantidade e unidade
function calcularPrecoProporcionaIngrediente(insumoId, quantidade, unidadeUsada) {
    if (!insumoId || !quantidade || quantidade <= 0) return 0;
    
    const insumo = insumosDB.find(i => i.id === insumoId);
    if (!insumo) return 0;
    
    // Obter preço por unidade cadastrada
    const precoComTaxa = getPrecoComTaxaCorrecao(insumoId);
    if (precoComTaxa <= 0) return 0;
    
    // Converter para a mesma unidade base para fazer o cálculo
    const unidadeInsumo = insumo.unidade.toLowerCase();
    const unidadeUsadaLower = unidadeUsada.toLowerCase();
    
    let fatorConversao = 1;
    
    // Conversões de peso
    if (unidadeInsumo === 'kg' && unidadeUsadaLower === 'g') {
        fatorConversao = 1 / 1000; // 1g = 0.001kg
    } else if (unidadeInsumo === 'g' && unidadeUsadaLower === 'kg') {
        fatorConversao = 1000; // 1kg = 1000g
    }
    // Conversões de volume
    else if (unidadeInsumo === 'l' && unidadeUsadaLower === 'ml') {
        fatorConversao = 1 / 1000; // 1ml = 0.001l
    } else if (unidadeInsumo === 'ml' && unidadeUsadaLower === 'l') {
        fatorConversao = 1000; // 1l = 1000ml
    }
    // Conversões de quantidade
    else if (unidadeInsumo === 'dz' && unidadeUsadaLower === 'un') {
        fatorConversao = 1 / 12; // 1un = 1/12 dz
    } else if (unidadeInsumo === 'un' && unidadeUsadaLower === 'dz') {
        fatorConversao = 12; // 1dz = 12un
    }
    // Se as unidades são iguais ou não há conversão conhecida
    else if (unidadeInsumo !== unidadeUsadaLower) {
        console.warn(`Conversão não suportada: ${unidadeInsumo} para ${unidadeUsadaLower}`);
        fatorConversao = 1; // Assumir mesma unidade
    }
    
    // Calcular preço proporcional
    const precoFinal = precoComTaxa * quantidade * fatorConversao;
    
    console.log(`💰 Cálculo proporcional: ${insumo.nome}`);
    console.log(`   Preço cadastrado: R$ ${precoComTaxa.toFixed(2)}/${unidadeInsumo}`);
    console.log(`   Quantidade usada: ${quantidade} ${unidadeUsadaLower}`);
    console.log(`   Fator conversão: ${fatorConversao}`);
    console.log(`   Preço final: R$ ${precoFinal.toFixed(2)}`);
    
    return precoFinal;
}

// Função para atualizar preço do ingrediente em tempo real
function atualizarPrecoIngrediente(container) {
    const insumoSelect = container.querySelector('.ingrediente-insumo');
    const quantidadeInput = container.querySelector('.ingrediente-quantidade');
    const unidadeSelect = container.querySelector('.ingrediente-unidade');
    const precoDiv = container.querySelector('.ingrediente-preco');
    
    if (!insumoSelect || !quantidadeInput || !unidadeSelect || !precoDiv) return;
    
    const insumoId = insumoSelect.value;
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const unidade = unidadeSelect.value;
    
    if (!insumoId || quantidade <= 0) {
        precoDiv.textContent = 'R$ 0,00';
        atualizarTotalInsumos();
        return;
    }
    
    const precoCalculado = calcularPrecoProporcionaIngrediente(insumoId, quantidade, unidade);
    precoDiv.textContent = `R$ ${precoCalculado.toFixed(2)}`;
    
    // Atualizar o total
    atualizarTotalInsumos();
    
    // Recalcular preço sugerido
    setTimeout(calcularPrecoSugerido, 100);
}

// Função para atualizar o total de todos os insumos
function atualizarTotalInsumos() {
    console.log('🔍 === INÍCIO CÁLCULO TOTAL INSUMOS ===');
    
    const container = document.getElementById('ingredientesList');
    const totalElement = document.getElementById('totalInsumos'); // Pode não existir (removido da UI)
    
    console.log('Container encontrado:', !!container);
    console.log('TotalElement encontrado:', !!totalElement);
    
    if (!container) {
        console.warn('⚠️ Container de ingredientes não encontrado');
        return 0;
    }
    
    let total = 0;
    const ingredientes = container.querySelectorAll('.ingrediente-item');
    
    console.log(`📊 Atualizando total - ${ingredientes.length} ingredientes encontrados`);
    console.log('Ingredientes HTML:', Array.from(ingredientes).map(el => el.outerHTML.substring(0, 100)));
    
    ingredientes.forEach((item, index) => {
        const precoDiv = item.querySelector('.ingrediente-preco');
        console.log(`Ingrediente ${index + 1}:`, {
            item: item.outerHTML.substring(0, 100),
            precoDiv: !!precoDiv,
            precoHTML: precoDiv ? precoDiv.outerHTML : 'N/A'
        });
        
        if (precoDiv) {
            const precoText = precoDiv.textContent;
            console.log(`  Texto original: "${precoText}"`);
            
            // Remover "R$" e espaços, trocar vírgula por ponto
            const precoLimpo = precoText.replace('R$', '').replace(/\s/g, '').replace(',', '.');
            const preco = parseFloat(precoLimpo) || 0;
            
            console.log(`  Processado: "${precoLimpo}" -> ${preco}`);
            total += preco;
        } else {
            console.warn(`  ⚠️ Div de preço não encontrada para ingrediente ${index + 1}`);
        }
    });
    
    console.log(`💰 Total final calculado: ${total}`);
    console.log(`💰 Total formatado: R$ ${total.toFixed(2)}`);
    
    // Atualizar elemento se existir (opcional - foi removido da UI)
    if (totalElement) {
        try {
            totalElement.textContent = `R$ ${total.toFixed(2)}`;
            console.log('✅ Elemento visual atualizado');
        } catch (error) {
            console.warn('⚠️ Erro ao atualizar elemento visual:', error);
        }
    } else {
        console.log('ℹ️ Elemento visual não existe (removido da UI)');
    }
    
    console.log('🔍 === FIM CÁLCULO TOTAL INSUMOS ===');
    
    // Retornar o total calculado para outras funções poderem usar
    return total;
}

// Função para obter o total dos insumos individuais sem atualizar UI
function obterTotalInsumos() {
    const container = document.getElementById('ingredientesList');
    
    if (!container) {
        return 0;
    }
    
    let total = 0;
    const ingredientes = container.querySelectorAll('.ingrediente-item');
    
    ingredientes.forEach((item) => {
        const precoDiv = item.querySelector('.ingrediente-preco');
        if (precoDiv) {
            const precoText = precoDiv.textContent;
            const precoLimpo = precoText.replace('R$', '').replace(/\s/g, '').replace(',', '.');
            const preco = parseFloat(precoLimpo) || 0;
            total += preco;
        }
    });
    
    return total;
}

// Função para selecionar insumo em ficha técnica
function selecionarInsumoFicha(selectElement) {
    const insumoId = selectElement.value;
    const container = selectElement.parentElement;
    const unidadeSelect = container.querySelector('.ingrediente-ficha-unidade');
    
    if (insumoId) {
        const insumo = insumosDB.find(i => i.id === insumoId);
        if (insumo) {
            // Definir a unidade padrão do insumo
            unidadeSelect.value = insumo.unidade;
        }
    }
    
    // Atualizar o preço
    atualizarPrecoIngredienteFicha(container);
}

// Função para atualizar preço do ingrediente em ficha técnica
function atualizarPrecoIngredienteFicha(container) {
    const insumoSelect = container.querySelector('.ingrediente-ficha-insumo');
    const quantidadeInput = container.querySelector('.ingrediente-ficha-quantidade');
    const unidadeSelect = container.querySelector('.ingrediente-ficha-unidade');
    const precoDiv = container.querySelector('.ingrediente-ficha-preco');
    
    if (!insumoSelect || !quantidadeInput || !unidadeSelect || !precoDiv) return;
    
    const insumoId = insumoSelect.value;
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const unidade = unidadeSelect.value;
    
    if (!insumoId || quantidade <= 0) {
        precoDiv.textContent = 'R$ 0,00';
        atualizarTotalFichaTecnica();
        return;
    }
    
    const precoCalculado = calcularPrecoProporcionaIngrediente(insumoId, quantidade, unidade);
    precoDiv.textContent = `R$ ${precoCalculado.toFixed(2)}`;
    
    // Atualizar o total da ficha técnica
    atualizarTotalFichaTecnica();
}

// Função para atualizar o total da ficha técnica
function atualizarTotalFichaTecnica() {
    const container = document.getElementById('fichaIngredientesList');
    const totalElement = document.getElementById('totalFichaInsumos'); // Nome correto do elemento
    
    if (!container || !totalElement) return;
    
    let total = 0;
    const ingredientes = container.querySelectorAll('.ingrediente-ficha-item');
    
    ingredientes.forEach(item => {
        const precoDiv = item.querySelector('.ingrediente-ficha-preco');
        if (precoDiv) {
            const precoText = precoDiv.textContent.replace('R$', '').replace(',', '.').trim();
            const preco = parseFloat(precoText) || 0;
            total += preco;
        }
    });
    
    totalElement.textContent = `R$ ${total.toFixed(2)}`;
}

// =====================================================
// 🔄 INICIALIZAÇÃO E OBSERVADORES DE TOTAIS
// =====================================================

// Função para configurar observadores de mudanças nos ingredientes
function configurarObservadoresTotais() {
    console.log('🔄 Configurando observadores de totais...');
    
    // Observar mudanças na lista de ingredientes dos pratos
    const ingredientesList = document.getElementById('ingredientesList');
    if (ingredientesList) {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                console.log('📝 Mudança detectada na lista de ingredientes');
                setTimeout(atualizarTotalInsumos, 100); // Pequeno delay para garantir que o DOM foi atualizado
            }
        });
        
        observer.observe(ingredientesList, { childList: true, subtree: true });
        console.log('✅ Observador configurado para ingredientes de pratos');
    }
    
    // Observar mudanças na lista de ingredientes das fichas técnicas
    const fichaIngredientesList = document.getElementById('fichaIngredientesList');
    if (fichaIngredientesList) {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                console.log('📝 Mudança detectada na lista de ingredientes da ficha');
                setTimeout(atualizarTotalFichaTecnica, 100);
            }
        });
        
        observer.observe(fichaIngredientesList, { childList: true, subtree: true });
        console.log('✅ Observador configurado para ingredientes de fichas técnicas');
    }
}

// Função para forçar atualização de todos os totais
function forcarAtualizacaoTotais() {
    console.log('🔄 Forçando atualização de todos os totais...');
    atualizarTotalInsumos();
    atualizarTotalFichaTecnica();
}

// Função de teste para debug - pode ser chamada do console
function debugTotais() {
    console.log('🧪 === TESTE MANUAL DE TOTAIS ===');
    
    // Verificar elementos
    const container = document.getElementById('ingredientesList');
    const totalElement = document.getElementById('totalInsumos');
    
    console.log('Container existe:', !!container);
    console.log('Total element existe:', !!totalElement, '(elemento visual foi removido da UI)');
    
    if (container) {
        const ingredientes = container.querySelectorAll('.ingrediente-item');
        console.log(`Ingredientes encontrados: ${ingredientes.length}`);
        
        ingredientes.forEach((item, i) => {
            const precoDiv = item.querySelector('.ingrediente-preco');
            const insumoSelect = item.querySelector('.ingrediente-insumo');
            const quantidadeInput = item.querySelector('.ingrediente-quantidade');
            
            console.log(`Ingrediente ${i+1}:`, {
                insumo: insumoSelect ? insumoSelect.value : 'N/A',
                quantidade: quantidadeInput ? quantidadeInput.value : 'N/A',
                preco: precoDiv ? precoDiv.textContent : 'N/A'
            });
        });
    }
    
    // Calcular total
    console.log('Calculando total...');
    const totalCalculado = atualizarTotalInsumos();
    console.log(`📊 Total final: R$ ${totalCalculado.toFixed(2)}`);
    
    // Testar função alternativa
    const totalAlternativo = obterTotalInsumos();
    console.log(`📊 Total alternativo: R$ ${totalAlternativo.toFixed(2)}`);
    
    console.log('🧪 === FIM TESTE ===');
}

// Disponibilizar função globalmente
window.debugTotais = debugTotais;

// =====================================================
// 💰 CÁLCULO DE PREÇO SUGERIDO
// =====================================================

// Função para calcular o preço sugerido baseado na margem de lucro
function calcularPrecoSugerido() {
    console.log('💰 Calculando preço sugerido...');
    
    const margemInput = document.getElementById('pratoMargemLucro');
    const precoSugeridoDisplay = document.getElementById('precoSugeridoDisplay');
    
    if (!margemInput || !precoSugeridoDisplay) {
        console.warn('⚠️ Elementos não encontrados para cálculo de preço sugerido');
        return;
    }
    
    const margemDesejada = parseFloat(margemInput.value) || 0;
    
    if (margemDesejada <= 0) {
        precoSugeridoDisplay.textContent = 'R$ 0,00';
        precoSugeridoDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-500';
        return;
    }
    
    // Calcular custo total baseado nos ingredientes e fichas técnicas atuais
    const custoTotal = calcularCustoAtualFormulario();
    
    // Atualizar display do custo total
    const custoTotalDisplay = document.getElementById('custoTotalDisplay');
    if (custoTotalDisplay) {
        custoTotalDisplay.textContent = `R$ ${custoTotal.toFixed(2)}`;
        
        // Cor baseada no valor do custo
        if (custoTotal > 0) {
            custoTotalDisplay.className = 'w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center font-semibold text-blue-700';
        } else {
            custoTotalDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-500';
        }
    }
    
    if (custoTotal <= 0) {
        precoSugeridoDisplay.textContent = 'R$ 0,00';
        precoSugeridoDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-500';
        console.log('⚠️ Custo total é zero - adicione ingredientes primeiro');
        return;
    }
    
    // Fórmula correta: Preço = Custo × (1 + Margem/100)
    // Se margem é 30%, então: Preço = Custo × 1.30
    const precoSugerido = custoTotal * (1 + (margemDesejada / 100));
    
    console.log(`📊 Cálculo do preço sugerido:`);
    console.log(`   Custo total: R$ ${custoTotal.toFixed(2)}`);
    console.log(`   Margem desejada: ${margemDesejada}%`);
    console.log(`   Preço sugerido: R$ ${precoSugerido.toFixed(2)}`);
    
    // Atualizar display
    precoSugeridoDisplay.textContent = `R$ ${precoSugerido.toFixed(2)}`;
    
    // Cor baseada na margem
    if (margemDesejada >= 40) {
        precoSugeridoDisplay.className = 'w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center font-semibold text-green-700';
    } else if (margemDesejada >= 20) {
        precoSugeridoDisplay.className = 'w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center font-semibold text-blue-700';
    } else {
        precoSugeridoDisplay.className = 'w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center font-semibold text-yellow-700';
    }
}

// Função para calcular o custo total baseado no formulário atual
function calcularCustoAtualFormulario() {
    let custoTotal = 0;
    
    // Somar custo dos ingredientes individuais
    const totalInsumos = obterTotalInsumos();
    custoTotal += totalInsumos;
    
    console.log(`💵 Custo ingredientes individuais: R$ ${totalInsumos.toFixed(2)}`);
    
    // Somar custo das fichas técnicas
    const fichasList = document.getElementById('fichasList');
    if (fichasList) {
        const fichasItems = fichasList.querySelectorAll('.ficha-item');
        let custoFichas = 0;
        
        fichasItems.forEach((item, index) => {
            const fichaSelect = item.querySelector('.ficha-tecnica');
            const quantidadeInput = item.querySelector('.ficha-quantidade');
            
            if (fichaSelect && quantidadeInput) {
                const fichaId = fichaSelect.value;
                const quantidade = parseFloat(quantidadeInput.value) || 0;
                
                if (fichaId && quantidade > 0) {
                    const ficha = fichasTecnicasDB.find(f => f.id === fichaId);
                    if (ficha) {
                        const custoFicha = calcularCustoFichaTecnica(ficha);
                        const custoFichaUsada = custoFicha * quantidade;
                        custoFichas += custoFichaUsada;
                        
                        console.log(`🍽️ Ficha ${index + 1} (${ficha.nome}): ${quantidade}x = R$ ${custoFichaUsada.toFixed(2)}`);
                    }
                }
            }
        });
        
        console.log(`🍽️ Custo fichas técnicas: R$ ${custoFichas.toFixed(2)}`);
        custoTotal += custoFichas;
    }
    
    // Adicionar custo de finalização se definido
    const custoFinalizacaoInput = document.getElementById('pratoCustoFinalizacao');
    if (custoFinalizacaoInput) {
        const custoFinalizacao = parseFloat(custoFinalizacaoInput.value) || 0;
        if (custoFinalizacao > 0) {
            const custoProducao = custoTotal * (custoFinalizacao / 100);
            custoTotal += custoProducao;
            console.log(`🔧 Custo de finalização (${custoFinalizacao}%): R$ ${custoProducao.toFixed(2)}`);
        }
    }
    
    console.log(`💎 Custo total final: R$ ${custoTotal.toFixed(2)}`);
    return custoTotal;
}

// Disponibilizar função globalmente
window.calcularPrecoSugerido = calcularPrecoSugerido;

// Configurar observadores quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado - configurando sistema de totais');
    
    setTimeout(() => {
        configurarObservadoresTotais();
        forcarAtualizacaoTotais();
    }, 1000);
});

// Também configurar quando a página for focada (útil para desenvolvimento)
window.addEventListener('focus', function() {
    setTimeout(forcarAtualizacaoTotais, 500);
});


