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
let curr// --- INICIALIZAÇÃO DA APLICAÇÃO ---
function initializeApp() {
    // Tentar inicializar Firebase
    initializeFirebase();
    
    // Fallback para localStorage se Firebase falhar
    setTimeout(() => {
        if (!isFirebaseReady) {
            console.log('Usando localStorage como fallback');
            loadFromLocalStorage();
            updateDashboard();
            showFirebaseStatus(false);
        }
    }, 3000);
}

// Estado de autenticação
let currentUser = null;
let isFirebaseReady = false;

// --- BANCO DE DADOS ---
let insumosDB = [], comprasDB = [], fichasTecnicasDB = [], pratosDB = [], configuracoesDB = {};
let insumosParaRevisao = [];
const conversionFactors = { 'kg': 1000, 'g': 1, 'l': 1000, 'ml': 1 };
let charts = {};

// --- FUNÇÕES DE FIREBASE ---
async function initializeFirebase() {
    if (!firebaseServices) {
        console.log('Firebase services não estão disponíveis ainda');
        return;
    }
    
    const { db } = firebaseServices;
    
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
        console.error('Erro ao conectar Firebase:', error);
        showFirebaseStatus(false);
        // Fallback para localStorage se Firebase falhar
        loadLocalData();
    }
}

async function loadFirebaseData() {
    if (!firebaseServices) {
        console.log('Firebase services não disponíveis');
        return;
    }
    
    const { db, collection, getDocs, query, orderBy } = firebaseServices;
    
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
            configuracoesDB = { taxaPerca: 0, custoFinalizacao: 10, margemLucro: 200 };
            const docRef = await addDoc(collection(db, 'configuracoes'), configuracoesDB);
            configuracoesDB.id = docRef.id;
        }
        
        // Se não há dados, criar dados de exemplo
        if (insumosDB.length === 0) {
            await createSampleData();
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

async function createSampleData() {
    try {
        // Dados de exemplo
        const sampleInsumos = [
            { nome: 'Tomate Italiano', unidade: 'kg' },
            { nome: 'Cebola Pera', unidade: 'kg' },
            { nome: 'Azeite Extra Virgem', unidade: 'L' },
            { nome: 'Manjericão Fresco', unidade: 'maço' },
            { nome: 'Farinha de Trigo', unidade: 'kg' },
            { nome: 'Ovo de Galinha', unidade: 'unidade' },
            { nome: 'Queijo Parmesão', unidade: 'kg' },
            { nome: 'Massa de Lasanha', unidade: 'kg' }
        ];
        
        // Criar insumos
        for (const insumo of sampleInsumos) {
            const docRef = await addDoc(collection(db, 'insumos'), insumo);
            insumosDB.push({ id: docRef.id, ...insumo });
        }
        
        // Criar algumas compras de exemplo
        const sampleCompras = [
            { insumoMestreId: insumosDB[0].id, data: '2024-07-20', preco: 7.90, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[0].id, data: '2024-08-15', preco: 8.50, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[1].id, data: '2024-07-20', preco: 5.50, perdaPercentual: 10, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[2].id, data: '2024-07-15', preco: 42.50, perdaPercentual: 0, fornecedor: { nome: 'Importadora Sabor' } },
            { insumoMestreId: insumosDB[3].id, data: '2024-08-01', preco: 3.80, perdaPercentual: 5, fornecedor: { nome: 'Hortifruti Frescor' } },
            { insumoMestreId: insumosDB[4].id, data: '2024-07-05', preco: 6.00, perdaPercentual: 0, fornecedor: { nome: 'Distribuidora Grãos' } },
            { insumoMestreId: insumosDB[5].id, data: '2024-07-18', preco: 0.95, perdaPercentual: 2, fornecedor: { nome: 'Distribuidora Grãos' } },
            { insumoMestreId: insumosDB[6].id, data: '2024-08-10', preco: 65.00, perdaPercentual: 0, fornecedor: { nome: 'Laticínios Premium' } }
        ];
        
        for (const compra of sampleCompras) {
            const docRef = await addDoc(collection(db, 'compras'), compra);
            comprasDB.push({ id: docRef.id, ...compra });
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
        { id: '1', nome: 'Tomate Italiano', unidade: 'kg' },
        { id: '2', nome: 'Cebola Pera', unidade: 'kg' },
        { id: '3', nome: 'Azeite Extra Virgem', unidade: 'L' },
        { id: '4', nome: 'Manjericão Fresco', unidade: 'maço' },
        { id: '5', nome: 'Farinha de Trigo', unidade: 'kg' },
        { id: '6', nome: 'Ovo de Galinha', unidade: 'unidade' }
    ];
    comprasDB = JSON.parse(localStorage.getItem('comprasDB')) || [
        { id: '1', insumoMestreId: '1', data: '2024-07-20', preco: 7.90, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } },
        { id: '2', insumoMestreId: '1', data: '2024-08-15', preco: 8.50, perdaPercentual: 0, fornecedor: { nome: 'Hortifruti Frescor' } }
    ];
    fichasTecnicasDB = JSON.parse(localStorage.getItem('fichasTecnicasDB')) || [];
    pratosDB = JSON.parse(localStorage.getItem('pratosDB')) || [];
    configuracoesDB = JSON.parse(localStorage.getItem('configuracoesDB')) || { taxaPerca: 0, custoFinalizacao: 10, margemLucro: 200 };
    
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
    renderConfiguracoes();
    updateStats();
    lucide.createIcons();
}

function updateStats() {
    // Atualizar estatísticas do dashboard
    document.getElementById('totalInsumos').textContent = insumosDB.length;
    document.getElementById('totalFichas').textContent = fichasTecnicasDB.length;
    document.getElementById('totalPratos').textContent = pratosDB.length;
    document.getElementById('totalCompras').textContent = comprasDB.length;
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
        console.log('Dados sincronizados com Firebase');
    } else {
        // Fallback para localStorage
        saveToLocalStorage();
    }
}

// --- NAVEGAÇÃO ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
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
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhum insumo encontrado.</td></tr>`; 
        return; 
    }
    
    tbody.innerHTML = filtrados.map(insumo => {
        const uc = getUltimaCompra(insumo.id);
        return `<tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="p-4 font-medium">${insumo.nome}</td>
            <td class="p-4">${insumo.unidade}</td>
            <td class="p-4">${uc ? uc.fornecedor?.nome || 'N/A' : 'N/A'}</td>
            <td class="p-4 font-semibold text-green-700">${uc ? `R$ ${uc.preco.toFixed(2)}` : 'N/A'}</td>
            <td class="p-4">${uc ? new Date(uc.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td class="p-4">
                <div class="flex items-center space-x-4">
                    <button onclick="showAlert('Histórico de ${insumo.nome}', 'Funcionalidade em desenvolvimento')" class="text-orange-500 hover:text-orange-700 font-semibold flex items-center text-sm">
                        <i data-lucide="history" class="h-4 w-4 mr-1"></i>Histórico
                    </button>
                    <button onclick="showAlert('Editar ${insumo.nome}', 'Funcionalidade em desenvolvimento')" class="text-blue-500 hover:text-blue-700 font-semibold flex items-center text-sm">
                        <i data-lucide="edit-3" class="h-4 w-4 mr-1"></i>Editar
                    </button>
                    <button onclick="showAlert('Excluir ${insumo.nome}', 'Funcionalidade em desenvolvimento')" class="text-red-500 hover:text-red-700 font-semibold flex items-center text-sm">
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
    // Implementação básica dos gráficos
    console.log('Renderizando dashboard...');
    
    // Dados de exemplo para os gráficos
    const fichasData = {
        labels: ['Molho Tomate', 'Massa Fresca', 'Pesto', 'Molho Branco'],
        data: [2.5, -1.2, 3.8, 0.5]
    };
    
    const insumosData = {
        labels: ['Tomate', 'Cebola', 'Azeite', 'Manjericão'],
        data: [0.6, -0.3, 2.5, 0.2]
    };
    
    createChart('dashboardFichasChart', 'bar', fichasData.labels, fichasData.data, 'Variação (R$)');
    createChart('dashboardInsumosChart', 'bar', insumosData.labels, insumosData.data, 'Variação (R$)');
}

function renderConfiguracoes() {
    if (configuracoesDB) {
        const defaultTaxaPerca = document.getElementById('defaultTaxaPerca');
        const defaultCustoFinalizacao = document.getElementById('defaultCustoFinalizacao');
        const defaultMargemLucro = document.getElementById('defaultMargemLucro');
        
        if (defaultTaxaPerca) defaultTaxaPerca.value = configuracoesDB.taxaPerca || 0;
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

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
function initializeApp() {
    // Configurar navegação
    setupNavigation();
    
    // Tentar inicializar Firebase
    initializeFirebase();
    
    // Fallback para localStorage se Firebase falhar
    setTimeout(() => {
        if (!isFirebaseReady) {
            console.log('Usando localStorage como fallback');
            loadFromLocalStorage();
            updateDashboard();
            showFirebaseStatus(false);
        }
    }, 3000);
}

 / /   I n i c i a l i z a r   q u a n d o   D O M   e s t i v e r   p r o n t o 
 d o c u m e n t . a d d E v e n t L i s t e n e r ( ' D O M C o n t e n t L o a d e d ' ,   ( )   = >   { 
         c o n s o l e . l o g ( ' D O M   c a r r e g a d o ,   i n i c i a l i z a n d o   a p l i c a � � o . . . ' ) ; 
         / /   A g u a r d a r   u m   p o u c o   p a r a   g a r a n t i r   q u e   o   L u c i d e   c a r r e g o u 
         s e t T i m e o u t ( ( )   = >   { 
                 l u c i d e . c r e a t e I c o n s ( ) ; 
         } ,   1 0 0 ) ; 
 } ) ;  
 