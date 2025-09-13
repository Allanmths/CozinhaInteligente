// Extensão da função para corrigir o cálculo de totais
console.log("Módulo de correção de totais carregado!");

// Sobrescrever a função original atualizarPrecoIngrediente para garantir que o total seja atualizado corretamente
const originalAtualizarPrecoIngrediente = window.atualizarPrecoIngrediente;

window.atualizarPrecoIngrediente = function(container) {
    // Chamar a função original
    originalAtualizarPrecoIngrediente(container);
    
    // Garantir que o total seja calculado corretamente
    calcularEAtualizarTotais();
}

// Função unificada para calcular e atualizar todos os totais
function calcularEAtualizarTotais() {
    console.log("Recalculando todos os totais...");
    
    // 1. Total de insumos individuais
    atualizarTotalInsumos();
    
    // 2. Total da ficha técnica (se existir)
    if (typeof atualizarTotalFichaTecnica === 'function') {
        atualizarTotalFichaTecnica();
    }
}

// Função específica para atualizar o total dos insumos individuais
function atualizarTotalInsumos() {
    console.log("Atualizando total de insumos individuais");
    
    // Obter todos os elementos de preço de ingredientes
    const precoElements = document.querySelectorAll('#ingredientesList .ingrediente-preco');
    const totalElement = document.querySelector('#totalInsumos');
    
    if (!totalElement) {
        console.warn("Elemento de total não encontrado!");
        return;
    }
    
    // Calcular o total somando os valores de todos os ingredientes
    let total = 0;
    
    precoElements.forEach((element, index) => {
        // Extrair o valor numérico do formato "R$ XX,XX"
        const valorTexto = element.textContent.replace('R$', '').trim();
        const valorLimpo = valorTexto.replace('.', '').replace(',', '.'); // Corrige formatação brasileira
        const valor = parseFloat(valorLimpo) || 0;
        
        console.log(`Ingrediente ${index+1}: ${valorTexto} => ${valor}`);
        
        total += valor;
    });
    
    console.log(`Total calculado: R$ ${total.toFixed(2)}`);
    
    // Formatar o total para exibição (formato brasileiro: R$ 0,00)
    const totalFormatado = total.toFixed(2).replace('.', ',');
    
    // Atualizar o elemento de total
    totalElement.textContent = `R$ ${totalFormatado}`;
}

// Adicionar evento para calcular o total quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado - Configurando eventos para totais");
    
    // Observar mudanças na lista de ingredientes
    const ingredientesList = document.getElementById('ingredientesList');
    
    if (ingredientesList) {
        // Criar um observador para detectar quando novos ingredientes são adicionados
        const observer = new MutationObserver(function(mutations) {
            calcularEAtualizarTotais();
        });
        
        // Configurar o observador para monitorar mudanças no conteúdo
        observer.observe(ingredientesList, { childList: true, subtree: true });
        
        console.log("Observador de ingredientes configurado");
    }
    
    // Calcular o total inicial
    setTimeout(calcularEAtualizarTotais, 1000);
});