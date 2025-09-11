// 🔄 MIGRAÇÃO FIREBASE - ADICIONAR RESTAURANTID
// Execute este script no console do Firebase ou Node.js para migrar dados existentes

console.log('🚀 === MIGRAÇÃO FIREBASE - RESTAURANT ID ===');

// Função para migrar uma coleção
async function migrateCollection(collectionName, defaultRestaurantId) {
    console.log(`📦 Migrando coleção: ${collectionName}`);
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection(collectionName).get();
        
        console.log(`📊 Documentos encontrados: ${snapshot.size}`);
        
        const batch = db.batch();
        let updateCount = 0;
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Se não tem restaurantId, adicionar
            if (!data.restaurantId) {
                const docRef = db.collection(collectionName).doc(doc.id);
                batch.update(docRef, {
                    restaurantId: defaultRestaurantId,
                    updatedAt: new Date().toISOString(),
                    migratedAt: new Date().toISOString()
                });
                updateCount++;
            }
        });
        
        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ ${collectionName}: ${updateCount} documentos migrados`);
        } else {
            console.log(`✅ ${collectionName}: Nenhuma migração necessária`);
        }
        
        return updateCount;
        
    } catch (error) {
        console.error(`❌ Erro ao migrar ${collectionName}:`, error);
        return 0;
    }
}

// Função principal de migração
async function executeMigration() {
    // Verificar se usuário está logado
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('❌ Usuário não logado. Faça login primeiro.');
        return;
    }
    
    console.log(`👤 Usuário logado: ${user.email}`);
    
    // Obter ou criar restaurantId para o usuário atual
    let restaurantId;
    
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists()) {
            restaurantId = userDoc.data().restaurantId;
            console.log(`🏢 Restaurant ID encontrado: ${restaurantId}`);
        } else {
            // Criar restaurante para usuário sem perfil
            restaurantId = 'rest_' + Math.random().toString(36).substring(2, 15);
            console.log(`🏢 Criando novo restaurante: ${restaurantId}`);
            
            // Criar restaurante
            await db.collection('restaurants').doc(restaurantId).set({
                name: 'Meu Restaurante',
                accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                settings: {
                    currency: 'BRL',
                    timezone: 'America/Sao_Paulo',
                    features: {
                        multiUser: true,
                        reports: true,
                        inventory: true
                    }
                }
            });
            
            // Criar perfil do usuário
            await db.collection('users').doc(user.uid).set({
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                restaurantId: restaurantId,
                role: 'admin',
                permissions: ['all'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            });
            
            console.log(`✅ Restaurante e usuário criados`);
        }
    } catch (error) {
        console.error('❌ Erro ao obter/criar restaurante:', error);
        return;
    }
    
    if (!restaurantId) {
        console.error('❌ Não foi possível determinar o restaurantId');
        return;
    }
    
    // Lista de coleções para migrar
    const collections = [
        'insumos',
        'pratos', 
        'fichasTecnicas',
        'compras',
        'fornecedores',
        'configuracoes'
    ];
    
    console.log(`📋 Coleções a migrar: ${collections.join(', ')}`);
    
    let totalMigrated = 0;
    
    // Migrar cada coleção
    for (const collection of collections) {
        const migrated = await migrateCollection(collection, restaurantId);
        totalMigrated += migrated;
        
        // Pequena pausa entre migrações
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`🎉 === MIGRAÇÃO CONCLUÍDA ===`);
    console.log(`📊 Total de documentos migrados: ${totalMigrated}`);
    console.log(`🏢 Restaurant ID utilizado: ${restaurantId}`);
    
    // Recarregar a página para aplicar as novas regras
    if (totalMigrated > 0) {
        console.log(`🔄 Recarregando página em 3 segundos...`);
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
}

// Executar migração
executeMigration();

// Exportar funções para uso manual se necessário
window.migrateCollection = migrateCollection;
window.executeMigration = executeMigration;
