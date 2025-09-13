// Módulo avançado de correção de totais e formatação de valores
console.log("Módulo aprimorado de correção de totais e formatação carregado!");

// NOTA: As funções de cálculo proporcional foram implementadas diretamente no main.js
// Este arquivo agora contém apenas funções auxiliares de formatação

// Função de formatação de número no padrão brasileiro (1.234,56)
function formatarNumero(valor) {
    // Garantir que é um número e formatar com duas casas decimais
    const numero = parseFloat(valor) || 0;
    // Formato brasileiro: vírgula como separador decimal
    return numero.toFixed(2).replace('.', ',');
}

// As funções de cálculo de totais foram implementadas no main.js
// Manter apenas as funções de formatação aqui

// Observadores e eventos foram implementados no main.js

// Função para recarregar totais quando a janela for focada
window.addEventListener('focus', function() {
    // Usar as funções implementadas no main.js
    if (typeof atualizarTotalInsumos === 'function') {
        setTimeout(atualizarTotalInsumos, 500);
    }
    if (typeof atualizarTotalFichaTecnica === 'function') {
        setTimeout(atualizarTotalFichaTecnica, 500);
    }
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