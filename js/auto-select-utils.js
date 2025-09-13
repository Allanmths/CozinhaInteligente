// Esta função é chamada quando um insumo é selecionado
function selecionarInsumo(selectElement) {
    const container = selectElement.closest('.ingrediente-item');
    const insumoId = selectElement.value;
    
    // Se um insumo válido foi selecionado
    if (insumoId) {
        // Encontrar o insumo selecionado
        const insumo = insumosDB.find(i => i.id === insumoId);
        
        if (insumo) {
            // Selecionar a unidade padrão do insumo
            const unidadeSelect = container.querySelector('.ingrediente-unidade');
            unidadeSelect.value = insumo.unidade || '';
            
            // Definir valor padrão para quantidade
            const quantidadeInput = container.querySelector('.ingrediente-quantidade');
            if (!quantidadeInput.value || parseFloat(quantidadeInput.value) <= 0) {
                quantidadeInput.value = "1"; // Valor padrão de quantidade
            }
        }
    }
    
    // Atualizar o preço após configurar a unidade e quantidade
    atualizarPrecoIngrediente(container);
}

// Esta função é chamada quando um insumo é selecionado na ficha técnica
function selecionarInsumoFicha(selectElement) {
    const container = selectElement.closest('.ingrediente-ficha-item');
    const insumoId = selectElement.value;
    
    // Se um insumo válido foi selecionado
    if (insumoId) {
        // Encontrar o insumo selecionado
        const insumo = insumosDB.find(i => i.id === insumoId);
        
        if (insumo) {
            // Selecionar a unidade padrão do insumo
            const unidadeSelect = container.querySelector('.ingrediente-ficha-unidade');
            unidadeSelect.value = insumo.unidade || '';
            
            // Definir valor padrão para quantidade
            const quantidadeInput = container.querySelector('.ingrediente-ficha-quantidade');
            if (!quantidadeInput.value || parseFloat(quantidadeInput.value) <= 0) {
                quantidadeInput.value = "1"; // Valor padrão de quantidade
            }
        }
    }
    
    // Atualizar o preço após configurar a unidade e quantidade
    atualizarPrecoIngredienteFicha(container);
}