// Versão melhorada da função createProfileForExistingUser com logs detalhados

async function createProfileForExistingUser() {
    try {
        console.log('🚀 === INÍCIO DA MIGRAÇÃO AUTOMÁTICA ===');
        console.log(`👤 Email do usuário: ${currentUser.email}`);
        console.log(`🆔 UID do usuário: ${currentUser.uid}`);
        console.log(`📅 Conta criada em: ${currentUser.metadata.creationTime}`);
        console.log(`🕒 Último login: ${currentUser.metadata.lastSignInTime}`);
        console.log(`📱 Provedor: ${currentUser.providerData[0]?.providerId || 'Não identificado'}`);
        
        // Mostrar mensagem na interface
        showAuthMessage('Preparando sua conta... Isso pode levar alguns segundos.', 'info');
        
        // Determinar nome do restaurante baseado no usuário
        let restaurantName = 'Meu Restaurante';
        
        if (currentUser.displayName) {
            restaurantName = currentUser.displayName;
            console.log(`🏷️ Nome do restaurante baseado no displayName: ${restaurantName}`);
        } else if (currentUser.email) {
            const emailPart = currentUser.email.split('@')[0];
            restaurantName = `Restaurante ${emailPart.charAt(0).toUpperCase() + emailPart.slice(1)}`;
            console.log(`🏷️ Nome do restaurante baseado no email: ${restaurantName}`);
        }
        
        console.log(`🏢 Criando restaurante: ${restaurantName}`);
        console.log(`👤 Definindo usuário como administrador`);
        
        // Verificar se Firebase Services estão disponíveis
        if (!firebaseServices) {
            throw new Error('Firebase Services não estão disponíveis');
        }
        
        console.log('✅ Firebase Services confirmados');
        
        // Criar restaurante e usuário admin
        console.log('🔄 Chamando createRestaurantAndUser()...');
        await createRestaurantAndUser(currentUser.uid, restaurantName, currentUser.email);
        console.log('✅ createRestaurantAndUser() concluída');
        
        console.log('⏳ Aguardando 2 segundos para garantir sincronização...');
        
        // Aguardar um momento para garantir que os dados foram salvos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔄 Recarregando perfil do usuário...');
        // Recarregar perfil
        await loadUserProfile();
        
        console.log('🎉 === MIGRAÇÃO CONCLUÍDA COM SUCESSO ===');
        
        // Remover mensagem de loading
        setTimeout(() => {
            console.log('🧹 Removendo mensagem de carregamento');
            hideAuthMessage();
        }, 2000);
        
    } catch (error) {
        console.error('❌ === ERRO NA MIGRAÇÃO ===');
        console.error('📋 Tipo do erro:', error.name);
        console.error('📋 Mensagem:', error.message);
        console.error('📋 Stack completo:', error.stack);
        console.error('📋 Firebase Services:', firebaseServices);
        console.error('📋 Current User:', currentUser);
        
        showAuthMessage('Erro ao configurar sua conta. Tente fazer login novamente.', 'error');
        throw error;
    }
}
