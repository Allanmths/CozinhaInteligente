// Função para atualizar o preço do ingrediente com base na quantidade e unidade selecionadas
function atualizarPrecoIngrediente(container) {
    const insumoSelect = container.querySelector('.ingrediente-insumo');
    const quantidadeInput = container.querySelector('.ingrediente-quantidade');
    const unidadeSelect = container.querySelector('.ingrediente-unidade');
    const precoDisplay = container.querySelector('.ingrediente-preco');
    const precoConvertidoDisplay = container.querySelector('.preco-convertido');
    
    // Garantir que os elementos foram encontrados
    if (!insumoSelect || !quantidadeInput || !unidadeSelect || !precoDisplay) {
        console.error("Elementos necessários não encontrados no container", container);
        return;
    }
    
    const insumoId = insumoSelect.value;
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const unidade = unidadeSelect.value;
    
    if (!insumoId || quantidade <= 0) {
        precoDisplay.textContent = 'R$ 0,00';
        if (precoConvertidoDisplay) precoConvertidoDisplay.textContent = '';
        // Atualizar o total
        atualizarTotalPrato();
        return;
    }
    
    // Obter o insumo e seu preço com taxa de correção
    const insumo = insumosDB.find(i => i.id === insumoId);
    if (!insumo) {
        precoDisplay.textContent = 'R$ 0,00';
        if (precoConvertidoDisplay) precoConvertidoDisplay.textContent = '';
        // Atualizar o total
        atualizarTotalPrato();
        return;
    }
    
    const precoComTaxa = getPrecoComTaxaCorrecao(insumoId);
    
    // Calcular o preço com base na quantidade e nas unidades
    const precoFinal = calcularPrecoConvertido(insumo, quantidade, unidade, precoComTaxa);
    
    // Atualizar o display do preço
    precoDisplay.textContent = `R$ ${precoFinal.toFixed(2)}`;
    
    // Atualizar o display de preço convertido
    if (precoConvertidoDisplay) {
        // Formatação e cálculos para o preço convertido
        if (quantidade > 0) {
            // Mostrar valor unitário
            const valorUnitario = precoFinal / quantidade;
            
            // Informações sobre a conversão
            let textoConversao = `R$ ${valorUnitario.toFixed(2)}/${unidade}`;
            
            // Se o insumo tem uma unidade diferente da selecionada, mostrar informações adicionais
            if (insumo.unidade.toLowerCase() !== unidade.toLowerCase()) {
                // Calcular o fator de conversão entre as unidades
                const fatorConversao = obterFatorConversao(insumo.unidade, unidade);
                
                // Informação sobre o preço original
                const precoOriginal = precoComTaxa;
                const precoOriginalExibicao = `${precoOriginal.toFixed(2)}/${insumo.unidade}`;
                
                textoConversao = `${quantidade} ${unidade} = ${(quantidade * fatorConversao).toFixed(2)} ${insumo.unidade} (R$ ${precoOriginalExibicao})`;
            }
            
            precoConvertidoDisplay.textContent = textoConversao;
        } else {
            precoConvertidoDisplay.textContent = '';
        }
    }
    
    // Atualizar o total do prato
    atualizarTotalPrato();
}

// Função para atualizar o preço do ingrediente em fichas técnicas
function atualizarPrecoIngredienteFicha(container) {
    const insumoSelect = container.querySelector('.ingrediente-ficha-insumo');
    const quantidadeInput = container.querySelector('.ingrediente-ficha-quantidade');
    const unidadeSelect = container.querySelector('.ingrediente-ficha-unidade');
    const precoDisplay = container.querySelector('.ingrediente-ficha-preco');
    const precoConvertidoDisplay = container.querySelector('.preco-ficha-convertido');
    
    const insumoId = insumoSelect.value;
    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const unidade = unidadeSelect.value;
    
    if (!insumoId || quantidade <= 0) {
        precoDisplay.textContent = 'R$ 0,00';
        if (precoConvertidoDisplay) precoConvertidoDisplay.textContent = '';
        // Atualizar o total
        atualizarTotalFichaTecnica();
        return;
    }
    
    // Obter o insumo e seu preço com taxa de correção
    const insumo = insumosDB.find(i => i.id === insumoId);
    if (!insumo) {
        precoDisplay.textContent = 'R$ 0,00';
        if (precoConvertidoDisplay) precoConvertidoDisplay.textContent = '';
        // Atualizar o total
        atualizarTotalFichaTecnica();
        return;
    }
    
    const precoComTaxa = getPrecoComTaxaCorrecao(insumoId);
    
    // Calcular o preço com base na quantidade e nas unidades
    const precoFinal = calcularPrecoConvertido(insumo, quantidade, unidade, precoComTaxa);
    
    // Atualizar o display do preço
    precoDisplay.textContent = `R$ ${precoFinal.toFixed(2)}`;
    
    // Atualizar o display de preço convertido
    if (precoConvertidoDisplay) {
        // Formatação e cálculos para o preço convertido
        if (quantidade > 0) {
            // Mostrar valor unitário
            const valorUnitario = precoFinal / quantidade;
            
            // Informações sobre a conversão
            let textoConversao = `R$ ${valorUnitario.toFixed(2)}/${unidade}`;
            
            // Se o insumo tem uma unidade diferente da selecionada, mostrar informações adicionais
            if (insumo.unidade.toLowerCase() !== unidade.toLowerCase()) {
                // Calcular o fator de conversão entre as unidades
                const fatorConversao = obterFatorConversao(insumo.unidade, unidade);
                
                // Informação sobre o preço original
                const precoOriginal = precoComTaxa;
                const precoOriginalExibicao = `${precoOriginal.toFixed(2)}/${insumo.unidade}`;
                
                textoConversao = `${quantidade} ${unidade} = ${(quantidade * fatorConversao).toFixed(2)} ${insumo.unidade} (R$ ${precoOriginalExibicao})`;
            }
            
            precoConvertidoDisplay.textContent = textoConversao;
        } else {
            precoConvertidoDisplay.textContent = '';
        }
    }
    
    // Atualizar o total da ficha técnica
    atualizarTotalFichaTecnica();
}

// Função para atualizar o total da ficha técnica
function atualizarTotalFichaTecnica() {
    // Obter todos os elementos de preço de ingredientes da ficha
    const precoElements = document.querySelectorAll('#fichaIngredientesList .ingrediente-ficha-preco');
    const totalElement = document.querySelector('#totalFichaInsumos');
    
    if (!totalElement) return;
    
    // Calcular o total somando os valores de todos os ingredientes
    let total = 0;
    precoElements.forEach(element => {
        // Extrair o valor numérico do formato "R$ XX,XX"
        const valorTexto = element.textContent.replace('R$', '').trim();
        // Lidar com formatos brasileiros (1.000,00) e internacionais (1,000.00)
        const valorLimpo = valorTexto.replace('.', '').replace(',', '.');
        const valor = parseFloat(valorLimpo) || 0;
        total += valor;
        
        console.log(`Ficha - Valor lido: ${valorTexto} => ${valor} => Total atual: ${total.toFixed(2)}`);
    });
    
    // Atualizar o elemento de total com formato brasileiro
    totalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    
    // Debug
    console.log(`Ficha - Total final: ${total.toFixed(2)}`);
    
}

// Função para calcular o preço convertido com base na quantidade e unidades
function calcularPrecoConvertido(insumo, quantidade, unidadeSelecionada, precoComTaxa) {
    const unidadeInsumo = insumo.unidade.toLowerCase();
    const unidadeSelecionadaLower = unidadeSelecionada.toLowerCase();
    
    // Se as unidades são as mesmas, não precisamos converter
    if (unidadeInsumo === unidadeSelecionadaLower) {
        return precoComTaxa * quantidade;
    }
    
    // Obter o fator de conversão para ajustar o preço
    const fatorConversao = obterFatorConversao(unidadeInsumo, unidadeSelecionadaLower);
    
    // Calculamos o preço final aplicando o fator de conversão e multiplicando pela quantidade
    return precoComTaxa * fatorConversao * quantidade;
}

// Função para obter o fator de conversão entre duas unidades
// Retorna um fator que deve ser multiplicado pelo preço unitário 
// para converter de uma unidade para outra
function obterFatorConversao(unidadeOrigem, unidadeDestino) {
    unidadeOrigem = unidadeOrigem.toLowerCase();
    unidadeDestino = unidadeDestino.toLowerCase();
    
    console.log(`Convertendo de ${unidadeOrigem} para ${unidadeDestino}`);
    
    // Se as unidades são as mesmas, o fator é 1
    if (unidadeOrigem === unidadeDestino) {
        return 1;
    }
    
    // Conversões de peso (kg, g)
    if ((unidadeOrigem === 'kg' && unidadeDestino === 'g') || 
        (unidadeOrigem === 'g' && unidadeDestino === 'kg')) {
        
        if (unidadeOrigem === 'kg' && unidadeDestino === 'g') {
            // De kg para g (dividimos o preço por 1000)
            return 1/1000; // Exemplo: 1kg=R$10, então 1g=R$0,01
        } else if (unidadeOrigem === 'g' && unidadeDestino === 'kg') {
            // De g para kg (multiplicamos o preço por 1000)
            return 1000; // Exemplo: 1g=R$0,01, então 1kg=R$10
        }
    }
    // Conversões de volume (l, ml)
    else if ((unidadeOrigem === 'l' && unidadeDestino === 'ml') || 
             (unidadeOrigem === 'ml' && unidadeDestino === 'l')) {
        
        if (unidadeOrigem === 'l' && unidadeDestino === 'ml') {
            // De l para ml (dividimos o preço por 1000)
            return 1/1000; // Exemplo: 1L=R$5, então 1ml=R$0,005
        } else if (unidadeOrigem === 'ml' && unidadeDestino === 'l') {
            // De ml para l (multiplicamos o preço por 1000)
            return 1000; // Exemplo: 1ml=R$0,005, então 1L=R$5
        }
    }
    // Conversões para dúzias (dz, un)
    else if ((unidadeOrigem === 'dz' && unidadeDestino === 'un') || 
             (unidadeOrigem === 'un' && unidadeDestino === 'dz') ||
             (unidadeOrigem === 'duzia' && unidadeDestino === 'un') || 
             (unidadeOrigem === 'unidade' && unidadeDestino === 'dz')) {
        
        if ((unidadeOrigem === 'dz' || unidadeOrigem === 'duzia') && unidadeDestino === 'un') {
            // De dz para un (dividimos o preço por 12)
            return 1/12; // Exemplo: 1dz=R$12, então 1un=R$1
        } else if ((unidadeOrigem === 'un' || unidadeOrigem === 'unidade') && 
                  (unidadeDestino === 'dz' || unidadeDestino === 'duzia')) {
            // De un para dz (multiplicamos o preço por 12)
            return 12; // Exemplo: 1un=R$1, então 1dz=R$12
        }
    }
    
    // Se não encontramos uma conversão, retornamos 1 (sem conversão)
    console.warn(`Não foi possível encontrar conversão de ${unidadeOrigem} para ${unidadeDestino}. Usando fator 1.`);
    return 1;
}

// Função para atualizar o total do prato somando todos os ingredientes
function atualizarTotalPrato() {
    // Obter todos os elementos de preço de ingredientes
    const precoElements = document.querySelectorAll('#ingredientesList .ingrediente-preco');
    const totalElement = document.querySelector('#totalInsumos');
    
    if (!totalElement) return;
    
    // Calcular o total somando os valores de todos os ingredientes
    let total = 0;
    precoElements.forEach(element => {
        // Extrair o valor numérico do formato "R$ XX,XX"
        const valorTexto = element.textContent.replace('R$', '').trim();
        // Lidar com formatos brasileiros (1.000,00) e internacionais (1,000.00)
        const valorLimpo = valorTexto.replace('.', '').replace(',', '.');
        const valor = parseFloat(valorLimpo) || 0;
        total += valor;
        
        console.log(`Valor lido: ${valorTexto} => ${valor} => Total atual: ${total.toFixed(2)}`);
    });
    
    // Atualizar o elemento de total com formato brasileiro
    totalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    
    // Debug
    console.log(`Total final: ${total.toFixed(2)}`);
    
    
    // Também podemos atualizar o preço do prato se existir um campo para isso
    const precoPratoInput = document.querySelector('#precoPrato');
    if (precoPratoInput) {
        // Se estiver usando uma margem automática, podemos calcular aqui
        const custoFinalizacao = parseFloat(document.querySelector('#custoFinalizacao')?.value || 0);
        const margemLucro = parseFloat(document.querySelector('#margemLucro')?.value || 0);
        
        if (margemLucro > 0) {
            // Calcular preço com base na margem (CM = 100 - ML)
            // Preço = Custo / (1 - ML/100)
            const custoTotal = total * (1 + custoFinalizacao/100);
            const preco = custoTotal / (1 - margemLucro/100);
            precoPratoInput.value = preco.toFixed(2);
        }
    }
}
