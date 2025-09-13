// Módulo de debugging para problemas de preços zerados
console.log("Módulo de debugging de preços carregado!");

// Função para debugar insumos e seus preços
function debugInsumoPrecos() {
    console.log("=== DEBUG INSUMOS E PREÇOS ===");
    console.log("Total de insumos no banco:", insumosDB.length);
    console.log("Total de compras no banco:", comprasDB.length);
    
    insumosDB.forEach((insumo, index) => {
        console.log(`\n--- Insumo ${index + 1}: ${insumo.nome} ---`);
        console.log("ID:", insumo.id);
        console.log("Unidade:", insumo.unidade);
        console.log("ValorUnitario:", insumo.valorUnitario);
        console.log("TaxaCorrecao:", insumo.taxaCorrecao);
        
        // Verificar compras para este insumo
        const comprasInsumo = comprasDB.filter(c => c.insumoMestreId === insumo.id);
        console.log("Compras registradas:", comprasInsumo.length);
        
        if (comprasInsumo.length > 0) {
            const ultimaCompra = comprasInsumo.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
            console.log("Última compra - preço:", ultimaCompra.preco, "data:", ultimaCompra.data);
        }
        
        // Testar getPrecoComTaxaCorrecao
        const precoCalculado = getPrecoComTaxaCorrecao(insumo.id);
        console.log("Preço calculado:", precoCalculado);
        
        if (precoCalculado === 0) {
            console.warn("⚠️ PREÇO ZERADO!");
        }
    });
    
    console.log("=== FIM DEBUG INSUMOS ===");
}

// Função para corrigir insumos sem preço
function corrigirInsumosSemPreco() {
    console.log("Corrigindo insumos sem preço...");
    
    let insumosCorrigidos = 0;
    
    insumosDB.forEach(insumo => {
        // Se o insumo não tem valorUnitario ou está zerado
        if (!insumo.valorUnitario || insumo.valorUnitario <= 0) {
            // Verificar se há compras para este insumo
            const ultimaCompra = getUltimaCompra(insumo.id);
            
            if (ultimaCompra && ultimaCompra.preco > 0) {
                // Usar o preço da última compra como valorUnitario
                insumo.valorUnitario = ultimaCompra.preco;
                console.log(`✅ Corrigido ${insumo.nome}: valorUnitario = ${insumo.valorUnitario}`);
                insumosCorrigidos++;
            } else {
                // Atribuir um preço padrão baseado no tipo de produto
                const precosPadrao = {
                    'kg': 10.00,
                    'g': 0.01,
                    'l': 5.00,
                    'ml': 0.005,
                    'un': 1.00,
                    'dz': 12.00,
                    'duzia': 12.00,
                    'unidade': 1.00,
                    'maço': 2.00,
                    'pacote': 3.00,
                    'lata': 4.00,
                    'garrafa': 8.00
                };
                
                const unidade = insumo.unidade.toLowerCase();
                const precoSugerido = precosPadrao[unidade] || 1.00;
                
                insumo.valorUnitario = precoSugerido;
                console.log(`🔧 Atribuído preço padrão para ${insumo.nome}: R$ ${precoSugerido} por ${insumo.unidade}`);
                insumosCorrigidos++;
            }
        }
    });
    
    if (insumosCorrigidos > 0) {
        console.log(`Corrigidos ${insumosCorrigidos} insumos. Salvando dados...`);
        saveData(); // Salvar as correções
    } else {
        console.log("Nenhum insumo precisou de correção.");
    }
}

// Sobrescrever a função atualizarPrecoIngrediente para incluir debug
const originalAtualizarPrecoIngredienteDebug = window.atualizarPrecoIngrediente;

window.atualizarPrecoIngrediente = function(container) {
    console.log("🔍 DEBUG atualizarPrecoIngrediente iniciado");
    
    const insumoSelect = container.querySelector('.ingrediente-insumo');
    const quantidadeInput = container.querySelector('.ingrediente-quantidade');
    const unidadeSelect = container.querySelector('.ingrediente-unidade');
    const precoDisplay = container.querySelector('.ingrediente-preco');
    
    if (insumoSelect && quantidadeInput && unidadeSelect) {
        const insumoId = insumoSelect.value;
        const quantidade = parseFloat(quantidadeInput.value) || 0;
        const unidade = unidadeSelect.value;
        
        console.log(`Ingrediente: ID=${insumoId}, Quantidade=${quantidade}, Unidade=${unidade}`);
        
        if (insumoId) {
            const insumo = insumosDB.find(i => i.id === insumoId);
            if (insumo) {
                console.log(`Insumo encontrado: ${insumo.nome}, valorUnitario: ${insumo.valorUnitario}`);
                const precoComTaxa = getPrecoComTaxaCorrecao(insumoId);
                console.log(`Preço com taxa: ${precoComTaxa}`);
                
                if (precoComTaxa === 0) {
                    console.error("❌ PREÇO ZERADO DETECTADO!");
                    console.log("Dados do insumo:", insumo);
                    console.log("Compras do insumo:", comprasDB.filter(c => c.insumoMestreId === insumoId));
                }
            } else {
                console.error(`❌ Insumo não encontrado: ${insumoId}`);
            }
        }
    }
    
    // Chamar a função original
    const resultado = originalAtualizarPrecoIngredienteDebug(container);
    
    // Log do resultado
    if (precoDisplay) {
        console.log(`Preço final exibido: ${precoDisplay.textContent}`);
    }
    
    return resultado;
};

// Executar debug quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        console.log("🚀 Iniciando debug automático de preços...");
        debugInsumoPrecos();
        corrigirInsumosSemPreco();
    }, 2000); // Aguardar carregamento completo dos dados
});

// Função para ser chamada manualmente no console
window.debugPrecos = debugInsumoPrecos;
window.corrigirPrecos = corrigirInsumosSemPreco;