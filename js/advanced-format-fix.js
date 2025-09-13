// Módulo avançado de correção de totais e formatação de valores
console.log("Módulo aprimorado de correção de totais e formatação carregado!");

// Sobrescrever a função original atualizarPrecoIngrediente para garantir que o total seja atualizado corretamente
const originalAtualizarPrecoIngrediente = window.atualizarPrecoIngrediente;

window.atualizarPrecoIngrediente = function(container) {
    // Chamar a função original
    originalAtualizarPrecoIngrediente(container);
    
    // Garantir que o total seja calculado corretamente
    calcularEAtualizarTotais();
    
    // Forçar a atualização visual do preço do insumo atual
    const precoDisplay = container.querySelector('.ingrediente-preco');
    if (precoDisplay) {
        // Extrair o valor numérico atual
        const valorTexto = precoDisplay.textContent.replace('R$', '').trim();
        const valorNumerico = parseFloat(valorTexto.replace('.', '').replace(',', '.')) || 0;
        
        // Atualizar com formatação brasileira
        precoDisplay.textContent = `R$ ${formatarNumero(valorNumerico)}`;
        
        console.log(`Preço do insumo atualizado: ${precoDisplay.textContent}`);
    }
};

// Função de formatação de número no padrão brasileiro (1.234,56)
function formatarNumero(valor) {
    // Garantir que é um número e formatar com duas casas decimais
    const numero = parseFloat(valor) || 0;
    // Formato brasileiro: vírgula como separador decimal
    return numero.toFixed(2).replace('.', ',');
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
        // Substituir ponto de milhar e vírgula decimal para o formato numérico
        const valorLimpo = valorTexto.replace(/\./g, '').replace(',', '.');
        const valor = parseFloat(valorLimpo) || 0;
        
        console.log(`Ingrediente ${index+1}: ${valorTexto} => ${valorLimpo} => ${valor}`);
        
        total += valor;
    });
    
    console.log(`Total calculado: R$ ${total.toFixed(2)}`);
    
    // Formatar o total para exibição (formato brasileiro: R$ 0,00)
    const totalFormatado = formatarNumero(total);
    
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
    
    // Adicionar evento para atualizar totais após carregar a página
    setTimeout(function() {
        // Percorrer todos os contêineres de ingredientes e reforçar o cálculo do preço
        const ingredienteContainers = document.querySelectorAll('#ingredientesList .ingrediente-container');
        ingredienteContainers.forEach(container => {
            // Forçar atualização do preço para cada ingrediente
            atualizarPrecoIngrediente(container);
        });
        
        // Calcular o total após todas as atualizações
        calcularEAtualizarTotais();
        
        console.log("Preços e totais atualizados após carregamento da página");
    }, 1000);
});

// Substituir a função calcularPrecoConvertido para garantir que não retorne zero
const originalCalcularPrecoConvertido = window.calcularPrecoConvertido;

window.calcularPrecoConvertido = function(insumo, quantidade, unidadeSelecionada, precoComTaxa) {
    // Validar os parâmetros para garantir valores não-nulos
    if (!insumo || typeof insumo !== 'object') {
        console.error("Insumo inválido:", insumo);
        return 0;
    }
    
    quantidade = parseFloat(quantidade) || 0;
    precoComTaxa = parseFloat(precoComTaxa) || 0;
    
    if (quantidade <= 0) {
        console.warn("Quantidade inválida:", quantidade);
        return 0;
    }
    
    if (precoComTaxa <= 0) {
        console.warn("Preço com taxa inválido para insumo", insumo.nome || insumo.id, ":", precoComTaxa);
        return 0;
    }
    
    // Usar a implementação original com validação adicional
    const resultado = originalCalcularPrecoConvertido(insumo, quantidade, unidadeSelecionada, precoComTaxa);
    
    if (isNaN(resultado) || resultado <= 0) {
        console.error("Cálculo resultou em valor inválido:", resultado);
        console.log("Parâmetros:", insumo, quantidade, unidadeSelecionada, precoComTaxa);
        // Retornar pelo menos o preço básico como fallback
        return precoComTaxa * quantidade;
    }
    
    return resultado;
};

// Função adicional para recarregar totais sempre que a janela for focada
// Isso ajuda quando a página é reaberta ou retornada de outra aba
window.addEventListener('focus', function() {
    setTimeout(calcularEAtualizarTotais, 500);
});

// Corrigir problemas com valores grandes exibidos incorretamente
// Por exemplo: "R$ 3234.00" deve ser "R$ 3.234,00"
function corrigirFormatoValores() {
    // Corrigir todos os elementos que possuem valores monetários
    const elementosMonetarios = document.querySelectorAll('*:not(script):not(style)');
    
    elementosMonetarios.forEach(elemento => {
        // Verificar se o conteúdo de texto contém padrão "R$ X.XX"
        if (elemento.childNodes.length === 1 && 
            elemento.firstChild.nodeType === Node.TEXT_NODE) {
            
            const texto = elemento.textContent;
            if (texto.includes('R$') && texto.includes('.')) {
                // Verificar se é um formato como R$ 3234.00 (sem separador de milhar e ponto como decimal)
                const match = texto.match(/R\$\s*(\d+)\.(\d+)/);
                if (match) {
                    const inteiro = match[1];
                    const decimal = match[2];
                    
                    // Formatar com separador de milhar e vírgula decimal
                    const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    const novoTexto = `R$ ${inteiroFormatado},${decimal}`;
                    
                    console.log(`Corrigindo formato: ${texto} -> ${novoTexto}`);
                    elemento.textContent = novoTexto;
                }
            }
        }
    });
}

// Chamar a função de correção de formatos periodicamente
setInterval(corrigirFormatoValores, 2000);