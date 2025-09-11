// 🔧 TESTE MANUAL - CÓDIGO DO RESTAURANTE
// Cole este código no console do navegador para testar

console.log('🧪 === TESTE DO CÓDIGO DO RESTAURANTE ===');

// 1. Verificar se usuário está logado
if (!currentUser) {
    console.error('❌ Usuário não logado');
} else {
    console.log('✅ Usuário logado:', currentUser.email);
}

// 2. Verificar restaurante atual
if (!currentRestaurant) {
    console.error('❌ Restaurante não carregado');
} else {
    console.log('✅ Restaurante atual:', currentRestaurant);
}

// 3. Verificar Firebase Services
if (!firebaseServices) {
    console.error('❌ Firebase services não disponível');
} else {
    console.log('✅ Firebase services disponível');
}

// 4. Verificar se elementos existem na página
const codeInput = document.getElementById('restaurantCode');
const nameInput = document.getElementById('restaurantName');

console.log('🔍 Elementos da interface:');
console.log('  - restaurantCode:', codeInput ? 'Existe' : 'NÃO EXISTE');
console.log('  - restaurantName:', nameInput ? 'Existe' : 'NÃO EXISTE');

// 5. Tentar carregar código manualmente
if (window.carregarCodigoRestaurante) {
    console.log('🔄 Executando carregarCodigoRestaurante()...');
    carregarCodigoRestaurante().then(() => {
        console.log('✅ Função executada');
        
        // Verificar se campo foi preenchido
        const codeInput = document.getElementById('restaurantCode');
        if (codeInput) {
            console.log(`📋 Valor atual do campo: "${codeInput.value}"`);
        }
    }).catch(error => {
        console.error('❌ Erro na função:', error);
    });
} else {
    console.error('❌ Função carregarCodigoRestaurante não encontrada');
}

// 6. Gerar código manualmente se necessário
function testarGeracaoCodigo() {
    if (window.generateRestaurantCode) {
        const novoCodigo = generateRestaurantCode();
        console.log('🎲 Código gerado:', novoCodigo);
        
        const codeInput = document.getElementById('restaurantCode');
        if (codeInput) {
            codeInput.value = novoCodigo;
            console.log('✅ Código definido manualmente');
        }
        
        return novoCodigo;
    } else {
        console.error('❌ Função generateRestaurantCode não encontrada');
    }
}

console.log('📝 Para testar geração manual: testarGeracaoCodigo()');
