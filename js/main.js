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

// --- BANCO DE DADOS ---
let insumosDB = [], comprasDB = [], fichasTecnicasDB = [], pratosDB = [], configuracoesDB = {}, fornecedoresDB = [];
let insumosParaRevisao = [];
const conversionFactors = { 'kg': 1000, 'g': 1, 'l': 1000, 'ml': 1 };
let charts = {};

// --- FUNÇÕES DE FIREBASE ---
async function initializeFirebase() {
    if (!firebaseServices) {
        console.log('Firebase services não estão disponíveis ainda');
        return;
    }
    
    const { db, auth, signInAnonymously, onAuthStateChanged } = firebaseServices;
    
    try {
        showLoading(true);
        
        // Conectar diretamente ao Firestore sem autenticação
        currentUser = { uid: 'anonymous' }; // Mock user
        isFirebaseReady = true;
        
        console.log('Firebase conectado sem autenticação');
        showFirebaseStatus(true);
        loadFirebaseData();
        
        showLoading(false);
    } catch (error) {
        console.error('Erro na conexão Firebase:', error);
        showFirebaseStatus(false);
        // Fallback para localStorage se Firebase falhar
        loadLocalData();
        showLoading(false);
    }
}

async function loadFirebaseData() {
    if (!firebaseServices) {
        console.log('Firebase services não disponíveis');
        return;
    }
    
    const { db, collection, addDoc, getDocs, query, orderBy } = firebaseServices;
    
    try {
        // Carregar todas as coleções
        const [insumosSnap, comprasSnap, fichasSnap, pratosSnap, configSnap] = await Promise.all([
            getDocs(collection(db, 'insumos')),
            getDocs(query(collection(db, 'compras'), orderBy('data', 'desc'))),
            getDocs(collection(db, 'fichasTecnicas')),
            getDocs(collection(db, 'pratos')),
            getDocs(collection(db, 'configuracoes'))
        ]);
        
        // Processar dados
        insumosDB = insumosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        comprasDB = comprasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fichasTecnicasDB = fichasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        pratosDB = pratosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Configurações (documento único)
        if (configSnap.docs.length > 0) {
            configuracoesDB = { id: configSnap.docs[0].id, ...configSnap.docs[0].data() };
        } else {
            // Criar configurações padrão
            configuracoesDB = { taxaPerca: 5, custoFinalizacao: 10, margemLucro: 200 };
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
    if (!isFirebaseReady || !firebaseServices) {
        console.warn('Firebase não está pronto, salvando localmente');
        return saveToLocalStorage();
    }
    
    const { db, collection, addDoc, doc, updateDoc } = firebaseServices;
    
    try {
        if (docId) {
            // Atualizar documento existente
            await updateDoc(doc(db, collection_name, docId), data);
            return docId;
        } else {
            // Criar novo documento
            const docRef = await addDoc(collection(db, collection_name), data);
            return docRef.id;
        }
    } catch (error) {
        console.error(`Erro ao salvar em ${collection_name}:`, error);
        throw error;
    }
}

async function deleteFromFirebase(collection_name, docId) {
    if (!isFirebaseReady || !firebaseServices) return;
    
    const { db, doc, deleteDoc } = firebaseServices;
    
    try {
        await deleteDoc(doc(db, collection_name, docId));
    } catch (error) {
        console.error(`Erro ao deletar de ${collection_name}:`, error);
        throw error;
    }
}

async function createSampleData({ db, collection, addDoc }) {
    try {
        // Dados de exemplo - Insumos
        const sampleInsumos = [
            { nome: 'Tomate Italiano', unidade: 'kg', taxaPerca: 8, categoria: 'vegetais' },
            { nome: 'Cebola Pera', unidade: 'kg', taxaPerca: 12, categoria: 'vegetais' },
            { nome: 'Azeite Extra Virgem', unidade: 'L', taxaPerca: 0, categoria: 'oleos' },
            { nome: 'Manjericão Fresco', unidade: 'maço', taxaPerca: 15, categoria: 'temperos' },
            { nome: 'Farinha de Trigo', unidade: 'kg', taxaPerca: 2, categoria: 'graos' },
            { nome: 'Ovo de Galinha', unidade: 'unidade', taxaPerca: 5, categoria: 'outros' },
            { nome: 'Queijo Parmesão', unidade: 'kg', taxaPerca: 3, categoria: 'laticinios' },
            { nome: 'Massa de Lasanha', unidade: 'kg', taxaPerca: 2, categoria: 'massas' },
            { nome: 'Ricota Fresca', unidade: 'kg', taxaPerca: 5, categoria: 'laticinios' },
            { nome: 'Sal Refinado', unidade: 'kg', taxaPerca: 0, categoria: 'temperos' },
            { nome: 'Pimenta do Reino', unidade: 'kg', taxaPerca: 1, categoria: 'temperos' },
            { nome: 'Alho', unidade: 'kg', taxaPerca: 10, categoria: 'vegetais' }
        ];
        
        // Criar insumos
        for (const insumo of sampleInsumos) {
            const docRef = await addDoc(collection(db, 'insumos'), insumo);
            insumosDB.push({ id: docRef.id, ...insumo });
        }
        
        // Criar compras de exemplo
        const sampleCompras = [
            { insumoMestreId: insumosDB[0].id, data: '2024-08-20', preco: 8.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[1].id, data: '2024-08-20', preco: 5.50, quantidade: 1, perdaPercentual: 10, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[2].id, data: '2024-08-15', preco: 42.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Importadora Sabor' } },
            { insumoMestreId: insumosDB[3].id, data: '2024-08-25', preco: 3.80, quantidade: 1, perdaPercentual: 5, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[4].id, data: '2024-08-10', preco: 6.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Distribuidora Grãos' } },
            { insumoMestreId: insumosDB[5].id, data: '2024-08-18', preco: 0.95, quantidade: 1, perdaPercentual: 2, fornecedor: { nome: 'Distribuidora Grãos' } },
            { insumoMestreId: insumosDB[6].id, data: '2024-08-22', preco: 65.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Laticínios Premium' } },
            { insumoMestreId: insumosDB[7].id, data: '2024-08-12', preco: 12.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Massas Artesanais' } },
            { insumoMestreId: insumosDB[8].id, data: '2024-08-23', preco: 18.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Laticínios Premium' } },
            { insumoMestreId: insumosDB[9].id, data: '2024-08-01', preco: 2.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Distribuidora Grãos' } },
            { insumoMestreId: insumosDB[10].id, data: '2024-08-01', preco: 35.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Temperos & Especiarias' } },
            { insumoMestreId: insumosDB[11].id, data: '2024-08-20', preco: 15.00, quantidade: 1, perdaPercentual: 8, fornecedor: { nome: 'Hortifruti Frescor' } }
        ];
        
        for (const compra of sampleCompras) {
            const docRef = await addDoc(collection(db, 'compras'), compra);
            comprasDB.push({ id: docRef.id, ...compra });
        }
        
        // Criar fichas técnicas de exemplo
        const sampleFichas = [
            {
                nome: 'Molho de Tomate Caseiro',
                tipo: 'molho',
                rendimento: 500,
                unidade: 'ml',
                tempoPreparo: 45,
                modoPreparo: '1. Refogue a cebola e o alho no azeite\n2. Adicione os tomates picados\n3. Tempere com sal, pimenta e manjericão\n4. Cozinhe em fogo baixo por 30-40 minutos\n5. Ajuste temperos a gosto',
                custoFinalizacao: 8,
                status: 'ativo',
                ingredientes: [
                    { insumoId: insumosDB[0].id, quantidade: 0.8 }, // Tomate - 800g
                    { insumoId: insumosDB[1].id, quantidade: 0.1 }, // Cebola - 100g
                    { insumoId: insumosDB[2].id, quantidade: 0.05 }, // Azeite - 50ml
                    { insumoId: insumosDB[3].id, quantidade: 0.2 }, // Manjericão - 0.2 maço
                    { insumoId: insumosDB[11].id, quantidade: 0.02 }, // Alho - 20g
                    { insumoId: insumosDB[9].id, quantidade: 0.01 }, // Sal - 10g
                    { insumoId: insumosDB[10].id, quantidade: 0.002 } // Pimenta - 2g
                ],
                dataCriacao: '2024-08-30',
                dataAtualizacao: '2024-08-30'
            },
            {
                nome: 'Recheio de Ricota e Manjericão',
                tipo: 'base',
                rendimento: 600,
                unidade: 'g',
                tempoPreparo: 15,
                modoPreparo: '1. Amasse bem a ricota com um garfo\n2. Misture o manjericão picado finamente\n3. Tempere com sal e pimenta\n4. Adicione o queijo parmesão ralado\n5. Misture até obter consistência homogênea',
                custoFinalizacao: 5,
                status: 'ativo',
                ingredientes: [
                    { insumoId: insumosDB[8].id, quantidade: 0.5 }, // Ricota - 500g
                    { insumoId: insumosDB[3].id, quantidade: 0.3 }, // Manjericão - 0.3 maço
                    { insumoId: insumosDB[6].id, quantidade: 0.1 }, // Parmesão - 100g
                    { insumoId: insumosDB[9].id, quantidade: 0.005 }, // Sal - 5g
                    { insumoId: insumosDB[10].id, quantidade: 0.001 } // Pimenta - 1g
                ],
                dataCriacao: '2024-08-30',
                dataAtualizacao: '2024-08-30'
            }
        ];
        
        for (const ficha of sampleFichas) {
            const docRef = await addDoc(collection(db, 'fichasTecnicas'), ficha);
            fichasTecnicasDB.push({ id: docRef.id, ...ficha });
        }
        
        // Criar pratos de exemplo
        const samplePratos = [
            {
                nome: 'Lasanha de Ricota com Manjericão',
                categoria: 'prato-principal',
                descricao: 'Deliciosa lasanha com camadas de massa artesanal, recheio cremoso de ricota e manjericão fresco, coberta com molho de tomate caseiro e queijo parmesão gratinado.',
                rendimento: 8,
                unidade: 'porções',
                tempoPreparo: 90,
                modoPreparo: '1. Pré-aqueça o forno a 180°C\n2. Cozinhe a massa de lasanha al dente\n3. Prepare uma camada de molho no fundo da forma\n4. Alterne camadas: massa, recheio de ricota, molho\n5. Finalize com queijo parmesão por cima\n6. Leve ao forno por 35-40 minutos\n7. Deixe descansar 10 minutos antes de servir',
                custoFinalizacao: 12,
                margemLucro: 180,
                status: 'ativo',
                componentes: [
                    { 
                        tipo: 'ficha', 
                        fichaId: fichasTecnicasDB[0].id, 
                        quantidade: 1, 
                        observacoes: 'Molho para todas as camadas' 
                    },
                    { 
                        tipo: 'ficha', 
                        fichaId: fichasTecnicasDB[1].id, 
                        quantidade: 1, 
                        observacoes: 'Recheio principal' 
                    }
                ],
                insumos: [
                    { insumoId: insumosDB[7].id, quantidade: 0.5 }, // Massa de lasanha - 500g
                    { insumoId: insumosDB[6].id, quantidade: 0.2 }  // Parmesão para gratinar - 200g
                ],
                dataCriacao: '2024-08-30',
                dataAtualizacao: '2024-08-30'
            },
            {
                nome: 'Bruschetta de Tomate e Manjericão',
                categoria: 'entrada',
                descricao: 'Entrada clássica italiana com fatias de pão tostado, cobertas com tomates frescos temperados, manjericão e azeite extra virgem.',
                rendimento: 4,
                unidade: 'porções',
                tempoPreparo: 20,
                modoPreparo: '1. Corte o pão em fatias de 2cm\n2. Toste as fatias até dourar\n3. Esfregue alho nas fatias quentes\n4. Cubra com a mistura de tomate temperado\n5. Finalize com manjericão fresco e azeite',
                custoFinalizacao: 10,
                margemLucro: 250,
                status: 'ativo',
                componentes: [],
                insumos: [
                    { insumoId: insumosDB[0].id, quantidade: 0.3 }, // Tomate - 300g
                    { insumoId: insumosDB[2].id, quantidade: 0.03 }, // Azeite - 30ml
                    { insumoId: insumosDB[3].id, quantidade: 0.15 }, // Manjericão - 0.15 maço
                    { insumoId: insumosDB[11].id, quantidade: 0.01 }, // Alho - 10g
                    { insumoId: insumosDB[9].id, quantidade: 0.003 }, // Sal - 3g
                    { insumoId: insumosDB[10].id, quantidade: 0.001 } // Pimenta - 1g
                ],
                dataCriacao: '2024-08-30',
                dataAtualizacao: '2024-08-30'
            }
        ];
        
        for (const prato of samplePratos) {
            const docRef = await addDoc(collection(db, 'pratos'), prato);
            pratosDB.push({ id: docRef.id, ...prato });
        }
        
        console.log('Dados de exemplo criados no Firebase');
        
    } catch (error) {
        console.error('Erro ao criar dados de exemplo:', error);
    }
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
    insumosDB = JSON.parse(localStorage.getItem('insumosDB')) || [
        { id: '1', nome: 'Tomate Italiano', unidade: 'kg', taxaPerca: 8, categoria: 'vegetais' },
        { id: '2', nome: 'Cebola Pera', unidade: 'kg', taxaPerca: 12, categoria: 'vegetais' },
        { id: '3', nome: 'Azeite Extra Virgem', unidade: 'L', taxaPerca: 0, categoria: 'oleos' },
        { id: '4', nome: 'Manjericão Fresco', unidade: 'maço', taxaPerca: 15, categoria: 'temperos' },
        { id: '5', nome: 'Farinha de Trigo', unidade: 'kg', taxaPerca: 2, categoria: 'graos' },
        { id: '6', nome: 'Ovo de Galinha', unidade: 'unidade', taxaPerca: 5, categoria: 'outros' },
        { id: '7', nome: 'Queijo Parmesão', unidade: 'kg', taxaPerca: 3, categoria: 'laticinios' },
        { id: '8', nome: 'Massa de Lasanha', unidade: 'kg', taxaPerca: 2, categoria: 'massas' },
        { id: '9', nome: 'Ricota Fresca', unidade: 'kg', taxaPerca: 5, categoria: 'laticinios' },
        { id: '10', nome: 'Sal Refinado', unidade: 'kg', taxaPerca: 0, categoria: 'temperos' },
        { id: '11', nome: 'Pimenta do Reino', unidade: 'kg', taxaPerca: 1, categoria: 'temperos' },
        { id: '12', nome: 'Alho', unidade: 'kg', taxaPerca: 10, categoria: 'vegetais' }
    ];
    
    comprasDB = JSON.parse(localStorage.getItem('comprasDB')) || [
        { id: '1', insumoMestreId: '1', data: '2024-08-20', preco: 8.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } },
        { id: '2', insumoMestreId: '2', data: '2024-08-20', preco: 5.50, quantidade: 1, perdaPercentual: 10, fornecedor: { nome: 'Hortifruti Frescor' } },
        { id: '3', insumoMestreId: '3', data: '2024-08-15', preco: 42.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Importadora Sabor' } },
        { id: '4', insumoMestreId: '4', data: '2024-08-25', preco: 3.80, quantidade: 1, perdaPercentual: 5, fornecedor: { nome: 'Hortifruti Frescor' } },
        { id: '5', insumoMestreId: '5', data: '2024-08-10', preco: 6.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Distribuidora Grãos' } },
        { id: '6', insumoMestreId: '6', data: '2024-08-18', preco: 0.95, quantidade: 1, perdaPercentual: 2, fornecedor: { nome: 'Distribuidora Grãos' } },
        { id: '7', insumoMestreId: '7', data: '2024-08-22', preco: 65.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Laticínios Premium' } },
        { id: '8', insumoMestreId: '8', data: '2024-08-12', preco: 12.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Massas Artesanais' } },
        { id: '9', insumoMestreId: '9', data: '2024-08-23', preco: 18.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Laticínios Premium' } },
        { id: '10', insumoMestreId: '10', data: '2024-08-01', preco: 2.50, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Distribuidora Grãos' } },
        { id: '11', insumoMestreId: '11', data: '2024-08-01', preco: 35.00, quantidade: 1, perdaPercentual: 0, fornecedor: { nome: 'Temperos & Especiarias' } },
        { id: '12', insumoMestreId: '12', data: '2024-08-20', preco: 15.00, quantidade: 1, perdaPercentual: 8, fornecedor: { nome: 'Hortifruti Frescor' } }
    ];
    
    fichasTecnicasDB = JSON.parse(localStorage.getItem('fichasTecnicasDB')) || [
        {
            id: 'ficha_1',
            nome: 'Molho de Tomate Caseiro',
            tipo: 'molho',
            rendimento: 500,
            unidade: 'ml',
            tempoPreparo: 45,
            modoPreparo: '1. Refogue a cebola e o alho no azeite\n2. Adicione os tomates picados\n3. Tempere com sal, pimenta e manjericão\n4. Cozinhe em fogo baixo por 30-40 minutos\n5. Ajuste temperos a gosto',
            custoFinalizacao: 8,
            status: 'ativo',
            ingredientes: [
                { insumoId: '1', quantidade: 0.8 },
                { insumoId: '2', quantidade: 0.1 },
                { insumoId: '3', quantidade: 0.05 },
                { insumoId: '4', quantidade: 0.2 },
                { insumoId: '12', quantidade: 0.02 },
                { insumoId: '10', quantidade: 0.01 },
                { insumoId: '11', quantidade: 0.002 }
            ],
            dataCriacao: '2024-08-30',
            dataAtualizacao: '2024-08-30'
        },
        {
            id: 'ficha_2',
            nome: 'Recheio de Ricota e Manjericão',
            tipo: 'base',
            rendimento: 600,
            unidade: 'g',
            tempoPreparo: 15,
            modoPreparo: '1. Amasse bem a ricota com um garfo\n2. Misture o manjericão picado finamente\n3. Tempere com sal e pimenta\n4. Adicione o queijo parmesão ralado\n5. Misture até obter consistência homogênea',
            custoFinalizacao: 5,
            status: 'ativo',
            ingredientes: [
                { insumoId: '9', quantidade: 0.5 },
                { insumoId: '4', quantidade: 0.3 },
                { insumoId: '7', quantidade: 0.1 },
                { insumoId: '10', quantidade: 0.005 },
                { insumoId: '11', quantidade: 0.001 }
            ],
            dataCriacao: '2024-08-30',
            dataAtualizacao: '2024-08-30'
        }
    ];
    
    pratosDB = JSON.parse(localStorage.getItem('pratosDB')) || [
        {
            id: 'prato_1',
            nome: 'Lasanha de Ricota com Manjericão',
            categoria: 'prato-principal',
            descricao: 'Deliciosa lasanha com camadas de massa artesanal, recheio cremoso de ricota e manjericão fresco, coberta com molho de tomate caseiro e queijo parmesão gratinado.',
            rendimento: 8,
            unidade: 'porções',
            tempoPreparo: 90,
            modoPreparo: '1. Pré-aqueça o forno a 180°C\n2. Cozinhe a massa de lasanha al dente\n3. Prepare uma camada de molho no fundo da forma\n4. Alterne camadas: massa, recheio de ricota, molho\n5. Finalize com queijo parmesão por cima\n6. Leve ao forno por 35-40 minutos\n7. Deixe descansar 10 minutos antes de servir',
            custoFinalizacao: 12,
            margemLucro: 180,
            status: 'ativo',
            componentes: [
                { tipo: 'ficha', fichaId: 'ficha_1', quantidade: 1, observacoes: 'Molho para todas as camadas' },
                { tipo: 'ficha', fichaId: 'ficha_2', quantidade: 1, observacoes: 'Recheio principal' }
            ],
            insumos: [
                { insumoId: '8', quantidade: 0.5 },
                { insumoId: '7', quantidade: 0.2 }
            ],
            dataCriacao: '2024-08-30',
            dataAtualizacao: '2024-08-30'
        },
        {
            id: 'prato_2',
            nome: 'Bruschetta de Tomate e Manjericão',
            categoria: 'entrada',
            descricao: 'Entrada clássica italiana com fatias de pão tostado, cobertas com tomates frescos temperados, manjericão e azeite extra virgem.',
            rendimento: 4,
            unidade: 'porções',
            tempoPreparo: 20,
            modoPreparo: '1. Corte o pão em fatias de 2cm\n2. Toste as fatias até dourar\n3. Esfregue alho nas fatias quentes\n4. Cubra com a mistura de tomate temperado\n5. Finalize com manjericão fresco e azeite',
            custoFinalizacao: 10,
            margemLucro: 250,
            status: 'ativo',
            componentes: [],
            insumos: [
                { insumoId: '1', quantidade: 0.3 },
                { insumoId: '3', quantidade: 0.03 },
                { insumoId: '4', quantidade: 0.15 },
                { insumoId: '12', quantidade: 0.01 },
                { insumoId: '10', quantidade: 0.003 },
                { insumoId: '11', quantidade: 0.001 }
            ],
            dataCriacao: '2024-08-30',
            dataAtualizacao: '2024-08-30'
        }
    ];
    
    configuracoesDB = JSON.parse(localStorage.getItem('configuracoesDB')) || { taxaPerca: 5, custoFinalizacao: 10, margemLucro: 200 };
    fornecedoresDB = JSON.parse(localStorage.getItem('fornecedoresDB')) || [];
    
    // Salvar dados atualizados para garantir consistência
    saveData();
    
    console.log('Dados carregados do localStorage (fallback)');
    updateConnectionStatus('offline');
    showLoading(false);
    renderAll();
}

function saveToLocalStorage() {
    localStorage.setItem('insumosDB', JSON.stringify(insumosDB));
    localStorage.setItem('comprasDB', JSON.stringify(comprasDB));
    localStorage.setItem('fichasTecnicasDB', JSON.stringify(fichasTecnicasDB));
    localStorage.setItem('pratosDB', JSON.stringify(pratosDB));
    localStorage.setItem('configuracoesDB', JSON.stringify(configuracoesDB));
    localStorage.setItem('fornecedoresDB', JSON.stringify(fornecedoresDB));
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

document.addEventListener('DOMContentLoaded', () => { 
    // Verificar se o Firebase está disponível
    if (window.firebaseServices) {
        initializeFirebase();
    } else {
        // Se Firebase não carregou, usar localStorage
        console.warn('Firebase não disponível, usando localStorage');
        loadLocalData();
    }
});

// --- PERSISTÊNCIA DE DADOS ATUALIZADA ---
async function saveData() {
    if (isFirebaseReady) {
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
                if (compra.id) {
                    savePromises.push(saveToFirebase('compras', compra, compra.id));
                }
            });
            
            // Salvar fichas técnicas
            fichasTecnicasDB.forEach(ficha => {
                if (ficha.id) {
                    savePromises.push(saveToFirebase('fichas', ficha, ficha.id));
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
            
            await Promise.all(savePromises);
            console.log('Dados sincronizados com Firebase');
        } catch (error) {
            console.error('Erro ao sincronizar com Firebase:', error);
            saveToLocalStorage(); // Fallback
        }
    } else {
        // Fallback para localStorage
        saveToLocalStorage();
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
        const margem = preco > 0 ? (((preco - custo) / preco) * 100) : 0;
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
    
    // Calcular custo dos ingredientes individuais
    if (prato.ingredientes && prato.ingredientes.length > 0) {
        custoTotal += prato.ingredientes.reduce((total, ingrediente) => {
            const insumo = insumosDB.find(i => i.id === ingrediente.insumoId);
            if (!insumo) return total;
            
            // Buscar última compra para obter preço atual
            const ultimaCompra = comprasDB
                .filter(c => c.insumoMestreId === insumo.id)
                .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
            
            if (!ultimaCompra) return total;
            
            // Calcular custo baseado na quantidade usada
            const custoUnitario = ultimaCompra.preco / ultimaCompra.quantidade;
            return total + (custoUnitario * ingrediente.quantidade);
        }, 0);
    }
    
    // Calcular custo das fichas técnicas
    if (prato.fichasTecnicas && prato.fichasTecnicas.length > 0) {
        custoTotal += prato.fichasTecnicas.reduce((total, fichaItem) => {
            const ficha = fichasTecnicasDB.find(f => f.id === fichaItem.fichaId);
            if (!ficha) return total;
            
            // Calcular o custo da ficha técnica baseado nos seus ingredientes
            const custoFicha = calcularCustoFichaTecnica(ficha);
            return total + (custoFicha * fichaItem.quantidade);
        }, 0);
    }
    
    return custoTotal;
}

function calcularCustoFichaTecnica(ficha) {
    if (!ficha.ingredientes || ficha.ingredientes.length === 0) return 0;
    
    // Calcular custo base dos ingredientes com suas respectivas taxas de perca
    const custoBase = ficha.ingredientes.reduce((total, ingrediente) => {
        const insumo = insumosDB.find(i => i.id === ingrediente.insumoId);
        if (!insumo) return total;
        
        // Buscar última compra para obter preço atual
        const ultimaCompra = comprasDB
            .filter(c => c.insumoMestreId === insumo.id)
            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
        
        if (!ultimaCompra) return total;
        
        // Calcular custo baseado na quantidade usada
        const custoUnitario = ultimaCompra.preco / ultimaCompra.quantidade;
        const custoIngrediente = custoUnitario * ingrediente.quantidade;
        
        // Aplicar taxa de perca específica do insumo
        const custoComPerca = custoIngrediente * (1 + (insumo.taxaPerca || 0) / 100);
        
        return total + custoComPerca;
    }, 0);
    
    // Aplicar custo de finalização (aumenta o custo)
    const custoFinal = custoBase * (1 + (ficha.custoFinalizacao || 0) / 100);
    
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
        pratosDB = pratosDB.filter(p => p.id !== id);
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
    const margem = prato.preco > 0 ? (((prato.preco - custo) / prato.preco) * 100) : 0;
    
    let ingredientesHtml = '';
    if (prato.ingredientes && prato.ingredientes.length > 0) {
        ingredientesHtml = prato.ingredientes.map(ing => {
            const insumo = insumosDB.find(i => i.id === ing.insumoId);
            return `<li class="flex justify-between">
                <span>${insumo ? insumo.nome : 'Insumo não encontrado'}</span>
                <span>${ing.quantidade} ${ing.unidade || ''}</span>
            </li>`;
        }).join('');
    } else {
        ingredientesHtml = '<li class="text-gray-500">Nenhum insumo individual cadastrado</li>';
    }
    
    let fichasHtml = '';
    if (prato.fichasTecnicas && prato.fichasTecnicas.length > 0) {
        fichasHtml = prato.fichasTecnicas.map(fichaItem => {
            const ficha = fichasTecnicasDB.find(f => f.id === fichaItem.fichaId);
            const custoFicha = ficha ? calcularCustoFichaTecnica(ficha) : 0;
            return `<li class="flex justify-between">
                <span>${ficha ? ficha.nome : 'Ficha não encontrada'}</span>
                <span>${fichaItem.quantidade}x (R$ ${custoFicha.toFixed(2)} cada)</span>
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
                <ul class="bg-blue-50 rounded-lg p-4 space-y-2 mb-4">
                    ${fichasHtml}
                </ul>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Insumos Individuais</label>
                <ul class="bg-gray-50 rounded-lg p-4 space-y-2">
                    ${ingredientesHtml}
                </ul>
            </div>
        </div>
    `;
    
    showCustomModal('Detalhes do Prato', detailsHtml);
}

function addIngrediente() {
    const container = document.getElementById('ingredientesList');
    const index = container.children.length;
    
    const ingredienteHtml = `
        <div class="ingrediente-item grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
            <select class="ingrediente-insumo px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Selecione um insumo</option>
                ${insumosDB.map(insumo => `<option value="${insumo.id}">${insumo.nome}</option>`).join('')}
            </select>
            <input type="number" class="ingrediente-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Quantidade" step="0.01" min="0">
            <input type="text" class="ingrediente-unidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Unidade (kg, g, L, ml...)">
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
            <select class="ficha-tecnica px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Selecione uma ficha técnica</option>
                ${fichasTecnicasDB.map(ficha => `<option value="${ficha.id}">${ficha.nome}</option>`).join('')}
            </select>
            <input type="number" class="ficha-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                placeholder="Quantidade" step="0.01" min="0" value="1">
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
}

function removeIngrediente(button) {
    button.closest('.ingrediente-item').remove();
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
        });
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-gray-500">Nenhuma ficha técnica cadastrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = fichasTecnicasDB.map(ficha => {
        const custoTotal = calcularCustoFichaTecnica(ficha);
        const custoPorcao = ficha.rendimento > 0 ? custoTotal / ficha.rendimento : 0;
        const statusClass = ficha.status === 'ativo' ? 'bg-green-100 text-green-800' : 
                           ficha.status === 'teste' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
        
        return `<tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div>
                    <div class="font-medium text-gray-900">${ficha.nome}</div>
                    <div class="text-sm text-gray-500">${ficha.tipo || ''}</div>
                    ${ficha.tempoPreparo ? `<div class="text-xs text-gray-400">${ficha.tempoPreparo} min</div>` : ''}
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
            ficha.nome.toLowerCase().includes(filtroTexto) ||
            (ficha.modoPreparo && ficha.modoPreparo.toLowerCase().includes(filtroTexto));
        
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
        tempoPreparo: parseInt(document.getElementById('fichaTempoPreparo').value) || null,
        modoPreparo: document.getElementById('fichaModoPreparo').value,
        taxaPerca: parseFloat(document.getElementById('fichaTaxaPerca').value) || 0,
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
    document.getElementById('fichaTempoPreparo').value = ficha.tempoPreparo || '';
    document.getElementById('fichaModoPreparo').value = ficha.modoPreparo || '';
    document.getElementById('fichaTaxaPerca').value = ficha.taxaPerca || '';
    document.getElementById('fichaCustoFinalizacao').value = ficha.custoFinalizacao || '';
    document.getElementById('fichaStatus').value = ficha.status || 'ativo';
    
    // Carregar ingredientes
    loadIngredientesFichaIntoForm(ficha.ingredientes || []);
    
    showModal('fichaModal');
}

function deleteFicha(id) {
    if (confirm('Tem certeza que deseja excluir esta ficha técnica?')) {
        fichasTecnicasDB = fichasTecnicasDB.filter(f => f.id !== id);
        saveData();
        renderFichas();
        updateStats();
        showAlert('Ficha Excluída', 'Ficha técnica removida com sucesso!', 'success');
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
            
            ${ficha.tempoPreparo ? `
            <div>
                <label class="block text-sm font-medium text-gray-700">Tempo de Preparo</label>
                <p class="text-gray-900">${ficha.tempoPreparo} minutos</p>
            </div>
            ` : ''}
            
            ${ficha.modoPreparo ? `
            <div>
                <label class="block text-sm font-medium text-gray-700">Modo de Preparo</label>
                <p class="text-gray-900 whitespace-pre-line">${ficha.modoPreparo}</p>
            </div>
            ` : ''}
            
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
        <div class="ingrediente-ficha-item grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
            <select class="ingrediente-ficha-insumo px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione um insumo</option>
                ${insumosDB.map(insumo => `<option value="${insumo.id}">${insumo.nome}</option>`).join('')}
            </select>
            <input type="number" class="ingrediente-ficha-quantidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Quantidade" step="0.01" min="0">
            <input type="text" class="ingrediente-ficha-unidade px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Unidade (kg, g, L, ml...)">
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
        });
    }
}

function resetFichaForm() {
    document.getElementById('fichaForm').reset();
    document.getElementById('fichaId').value = '';
    document.getElementById('fichaModalTitle').textContent = 'Adicionar Ficha Técnica';
    document.getElementById('fichaIngredientesList').innerHTML = '';
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">Nenhum insumo encontrado.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = filtrados.map(insumo => {
        const uc = getUltimaCompra(insumo.id);
        const taxaPercaDisplay = insumo.taxaPerca ? `${insumo.taxaPerca}%` : 'N/A';
        
        return `<tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="p-4 font-medium">${insumo.nome}</td>
            <td class="p-4">${insumo.unidade}</td>
            <td class="p-4 text-center">${taxaPercaDisplay}</td>
            <td class="p-4">${uc ? uc.fornecedor?.nome || 'N/A' : 'N/A'}</td>
            <td class="p-4 font-semibold text-green-700">${uc ? `R$ ${uc.preco.toFixed(2)}` : 'N/A'}</td>
            <td class="p-4">${uc ? new Date(uc.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td class="p-4">
                <div class="flex items-center space-x-2">
                    <button onclick="editInsumo('${insumo.id}')" class="text-blue-500 hover:text-blue-700 font-semibold flex items-center text-sm">
                        <i data-lucide="edit-3" class="h-4 w-4 mr-1"></i>Editar
                    </button>
                    <button onclick="deleteInsumo('${insumo.id}')" class="text-red-500 hover:text-red-700 font-semibold flex items-center text-sm">
                        <i data-lucide="trash-2" class="h-4 w-4 mr-1"></i>Excluir
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
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
        const defaultTaxaPerca = document.getElementById('defaultTaxaPerca');
        const defaultCustoFinalizacao = document.getElementById('defaultCustoFinalizacao');
        const defaultMargemLucro = document.getElementById('defaultMargemLucro');
        
        if (defaultTaxaPerca) defaultTaxaPerca.value = configuracoesDB.taxaPerca || 5;
        if (defaultCustoFinalizacao) defaultCustoFinalizacao.value = configuracoesDB.custoFinalizacao || 10;
        if (defaultMargemLucro) defaultMargemLucro.value = configuracoesDB.margemLucro || 200;
    }
}

async function salvarConfiguracoes() {
    const taxaPerca = parseFloat(document.getElementById('defaultTaxaPerca').value) || 0;
    const custoFinalizacao = parseFloat(document.getElementById('defaultCustoFinalizacao').value) || 0;
    const margemLucro = parseFloat(document.getElementById('defaultMargemLucro').value) || 0;
    
    configuracoesDB.taxaPerca = taxaPerca;
    configuracoesDB.custoFinalizacao = custoFinalizacao;
    configuracoesDB.margemLucro = margemLucro;
    
    try {
        await saveToFirebase('configuracoes', { taxaPerca, custoFinalizacao, margemLucro }, configuracoesDB.id);
        showAlert('Sucesso', 'Configurações salvas com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showAlert('Erro', 'Erro ao salvar configurações', 'error');
    }
    
    saveData();
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
    csvContent += "ID,Nome,Unidade,Ultimo Fornecedor,Ultimo Preco,Data Ultima Compra\r\n";
    insumosDB.forEach(insumo => {
        const uc = getUltimaCompra(insumo.id);
        const row = [
            insumo.id, 
            insumo.nome, 
            insumo.unidade, 
            uc ? uc.fornecedor?.nome || 'N/A' : 'N/A', 
            uc ? uc.preco.toFixed(2) : 'N/A', 
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
    
    // Auto remove após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// --- FUNÇÕES DE INSUMOS ---
function showAddInsumoModal() {
    document.getElementById('insumoModalTitle').textContent = 'Adicionar Insumo';
    document.getElementById('insumoForm').reset();
    document.getElementById('insumoId').value = '';
    
    // Preencher com valores padrão das configurações
    if (configuracoesDB) {
        document.getElementById('insumoTaxaPerca').value = configuracoesDB.taxaPerca || 0;
    }
    
    showModal('insumoModal');
}

function saveInsumo(event) {
    event.preventDefault();
    
    const id = document.getElementById('insumoId').value;
    const insumo = {
        nome: document.getElementById('insumoNome').value,
        unidade: document.getElementById('insumoUnidade').value,
        taxaPerca: parseFloat(document.getElementById('insumoTaxaPerca').value) || 0,
        categoria: document.getElementById('insumoCategoria').value,
        observacoes: document.getElementById('insumoObservacoes').value
    };
    
    if (id) {
        // Editar insumo existente
        const index = insumosDB.findIndex(i => i.id === id);
        if (index !== -1) {
            insumosDB[index] = { ...insumosDB[index], ...insumo };
            showAlert('Insumo Atualizado', 'Insumo atualizado com sucesso!', 'success');
        }
    } else {
        // Adicionar novo insumo
        insumo.id = 'insumo_' + Date.now();
        insumosDB.push(insumo);
        showAlert('Insumo Criado', 'Insumo adicionado com sucesso!', 'success');
    }
    
    saveData();
    renderInsumos();
    hideModal('insumoModal');
}

function editInsumo(id) {
    const insumo = insumosDB.find(i => i.id === id);
    if (!insumo) return;
    
    document.getElementById('insumoModalTitle').textContent = 'Editar Insumo';
    document.getElementById('insumoId').value = insumo.id;
    document.getElementById('insumoNome').value = insumo.nome;
    document.getElementById('insumoUnidade').value = insumo.unidade || '';
    document.getElementById('insumoTaxaPerca').value = insumo.taxaPerca || '';
    document.getElementById('insumoCategoria').value = insumo.categoria || '';
    document.getElementById('insumoObservacoes').value = insumo.observacoes || '';
    
    showModal('insumoModal');
}

function deleteInsumo(id) {
    // Verificar se o insumo está sendo usado em fichas técnicas ou pratos
    const usedInFichas = fichasTecnicasDB.some(ficha => 
        ficha.ingredientes && ficha.ingredientes.some(ing => ing.insumoId === id)
    );
    
    const usedInPratos = pratosDB.some(prato => 
        prato.insumos && prato.insumos.some(ing => ing.insumoId === id)
    );
    
    if (usedInFichas || usedInPratos) {
        showAlert('Não é possível excluir', 'Este insumo está sendo usado em fichas técnicas ou pratos. Remova-o primeiro desses locais.', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este insumo?')) {
        insumosDB = insumosDB.filter(i => i.id !== id);
        saveData();
        renderInsumos();
        showAlert('Insumo Excluído', 'Insumo removido com sucesso!', 'success');
    }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
function initializeApp() {
    // Tentar inicializar Firebase
    initializeFirebase();
    
    // Fallback para localStorage se Firebase falhar
    setTimeout(() => {
        if (!isFirebaseReady) {
            console.log('Usando localStorage como fallback');
            loadLocalData();
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
    
    // Auto-fechar após 3 segundos
    setTimeout(() => {
        hideModal('customModal');
    }, 3000);
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando aplicação...');
    
    // Aguardar um pouco para garantir que tudo carregou
    setTimeout(() => {
        // Garantir que os ícones Lucide sejam criados
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Inicializar dashboard por padrão apenas se o elemento existir
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            showView('dashboard');
        }
        
        // Carregar dados iniciais se ainda não carregaram
        if (insumosDB.length === 0) {
            loadLocalData();
            renderDashboard();
        }
        
        // Inicializar eventos de importação XML
        initializeXMLImport();
    }, 200);
});

// --- FUNÇÕES DE IMPORTAÇÃO XML ---

let xmlData = null;
let itemsParaImportar = [];
let vinculacoesInsumos = new Map(); // Para armazenar vinculações de itens com insumos
let historicoImportacoes = JSON.parse(localStorage.getItem('historicoImportacoes') || '[]');

function initializeXMLImport() {
    const xmlFileInput = document.getElementById('xmlFileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    if (!xmlFileInput || !uploadArea) return;
    
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
    document.getElementById('novoInsumoTaxaPerda').value = configuracoesDB.taxaPerca || 0;
    
    // Inicializar dados de conversão
    atualizarDadosConversao(item);
    
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
    // Unidades (sem conversão)
    'un-un': 1,
    'cx-cx': 1,
    'pc-pc': 1
};

function obterFatorConversao(unidadeOrigem, unidadeDestino) {
    if (unidadeOrigem === unidadeDestino) return 1;
    
    const chave = `${unidadeOrigem}-${unidadeDestino}`;
    return fatoresConversao[chave] || 1;
}

function atualizarDadosConversao(item) {
    document.getElementById('quantidadeOriginal').value = item.quantidade;
    document.getElementById('unidadeOriginal').textContent = item.unidade;
    document.getElementById('quantidadeConvertida').value = item.quantidade;
    document.getElementById('unidadeConvertida').value = mapearUnidade(item.unidade);
    document.getElementById('valorUnitarioConvertido').value = item.valorUnitario.toFixed(2);
    document.getElementById('fatorConversao').textContent = '1';
    document.getElementById('valorTotalConvertido').textContent = item.valorTotal.toFixed(2);
}

function aplicarConversaoAutomatica() {
    const quantidadeOriginal = parseFloat(document.getElementById('quantidadeOriginal').value) || 0;
    const unidadeOriginal = document.getElementById('unidadeOriginal').textContent;
    const unidadeDestino = document.getElementById('unidadeConvertida').value;
    const valorUnitarioOriginal = parseFloat(document.getElementById('valorUnitarioConvertido').getAttribute('data-original')) || 
                                 parseFloat(document.getElementById('valorUnitarioConvertido').value) || 0;
    
    // Armazenar valor original se ainda não foi feito
    if (!document.getElementById('valorUnitarioConvertido').getAttribute('data-original')) {
        document.getElementById('valorUnitarioConvertido').setAttribute('data-original', valorUnitarioOriginal);
    }
    
    const fator = obterFatorConversao(unidadeOriginal, unidadeDestino);
    const quantidadeConvertida = quantidadeOriginal * fator;
    const valorUnitarioConvertido = fator !== 0 ? valorUnitarioOriginal / fator : valorUnitarioOriginal;
    
    document.getElementById('quantidadeConvertida').value = quantidadeConvertida.toFixed(3);
    document.getElementById('valorUnitarioConvertido').value = valorUnitarioConvertido.toFixed(2);
    document.getElementById('fatorConversao').textContent = fator.toFixed(3);
    document.getElementById('valorTotalConvertido').textContent = (quantidadeConvertida * valorUnitarioConvertido).toFixed(2);
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
        'PC': 'pc',
        'PCT': 'pc',
        'CX': 'cx'
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
    
    // Obter dados de conversão
    const quantidadeConvertida = parseFloat(document.getElementById('quantidadeConvertida').value) || item.quantidade;
    const unidadeConvertida = document.getElementById('unidadeConvertida').value;
    const valorUnitarioConvertido = parseFloat(document.getElementById('valorUnitarioConvertido').value) || item.valorUnitario;
    
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
            unidadeOriginal: document.getElementById('unidadeOriginal').textContent,
            fatorConversao: parseFloat(document.getElementById('fatorConversao').textContent)
        };
        
    } else if (opcaoSelecionada === 'novo') {
        const nome = document.getElementById('novoInsumoNome').value.trim();
        const unidade = document.getElementById('novoInsumoUnidade').value;
        const categoria = document.getElementById('novoInsumoCategoria').value.trim();
        const taxaPerda = parseFloat(document.getElementById('novoInsumoTaxaPerda').value) || 0;
        
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
            fornecedor: xmlData.fornecedor.nome,
            dataInclusao: new Date().toISOString()
        };
        
        insumosDB.push(novoInsumo);
        saveToLocalStorage();
        
        // Aplicar conversão ao item
        item.quantidade = quantidadeConvertida;
        item.unidade = unidadeConvertida;
        item.valorUnitario = valorUnitarioConvertido;
        item.valorTotal = quantidadeConvertida * valorUnitarioConvertido;
        item.status = 'vinculado';
        item.insumoVinculado = novoInsumo;
        item.conversaoAplicada = {
            quantidadeOriginal: parseFloat(document.getElementById('quantidadeOriginal').value),
            unidadeOriginal: document.getElementById('unidadeOriginal').textContent,
            fatorConversao: parseFloat(document.getElementById('fatorConversao').textContent)
        };
        
        showAlert('Sucesso', 'Novo insumo criado e vinculado com sucesso!', 'success');
        
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
    
    // Atualizar dashboard
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
                <button type="button" onclick="verDetalhesHistorico('${historico.id}')" 
                        class="text-blue-600 hover:text-blue-800">
                    <i data-lucide="eye" class="h-4 w-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    lucide.createIcons();
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
