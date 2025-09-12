// 🔄 MIGRAÇÃO DE EMERGÊNCIA - CORRIGIR PROBLEMAS DE PERMISSÃO
// Execute este código no console do navegador após fazer login

console.log('🚀 === MIGRAÇÃO DE EMERGÊNCIA - COZINHA INTELIGENTE ===');

async function emergencyMigration() {
    try {
        // Verificar autenticação
        if (!window.currentUser) {
            console.error('❌ Usuário não logado. Faça login primeiro.');
            return;
        }
        
        console.log('✅ Usuário logado:', window.currentUser.email);
        
        // Verificar Firebase Services
        if (!window.firebaseServices) {
            console.error('❌ Firebase services não disponível');
            return;
        }
        
        const { db, collection, getDocs, doc: fbDoc, setDoc, updateDoc, getDoc } = window.firebaseServices;
        
        // 1. CRIAR/VERIFICAR PERFIL DO USUÁRIO
        console.log('📋 1. Verificando perfil do usuário...');
        
        const userRef = fbDoc(db, 'users', window.currentUser.uid);
        let userDoc;
        
        try {
            userDoc = await getDoc(userRef);
        } catch (error) {
            console.log('⚠️ Erro ao buscar usuário:', error.message);
        }
        
        let restaurantId;
        
        if (!userDoc || !userDoc.exists()) {
            // Criar novo usuário
            restaurantId = 'rest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            
            console.log('🏢 Criando restaurante:', restaurantId);
            
            // Criar restaurante
            await setDoc(fbDoc(db, 'restaurants', restaurantId), {
                name: 'Meu Restaurante',
                accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                ownerId: window.currentUser.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                settings: {
                    currency: 'BRL',
                    timezone: 'America/Sao_Paulo'
                }
            });
            
            console.log('👤 Criando usuário...');
            
            // Criar usuário
            await setDoc(fbDoc(db, 'users', window.currentUser.uid), {
                name: window.currentUser.displayName || window.currentUser.email.split('@')[0],
                email: window.currentUser.email,
                restaurantId: restaurantId,
                role: 'admin',
                permissions: ['all'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            });
            
            console.log('✅ Perfil criado com sucesso');
        } else {
            const userData = userDoc.data();
            restaurantId = userData.restaurantId;
            console.log('✅ Perfil existente encontrado. Restaurant ID:', restaurantId);
            
            if (!restaurantId) {
                // Gerar restaurantId se não tiver
                restaurantId = 'rest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
                await updateDoc(userRef, {
                    restaurantId: restaurantId,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Restaurant ID adicionado ao usuário:', restaurantId);
            }
        }
        
        // 2. MIGRAR DADOS SEM RESTAURANTID
        const collections = ['insumos', 'pratos', 'fichasTecnicas', 'compras', 'fornecedores'];
        
        for (const collectionName of collections) {
            console.log(`📦 2. Migrando ${collectionName}...`);
            
            try {
                // Buscar documentos sem restaurantId
                const snapshot = await getDocs(collection(db, collectionName));
                
                if (snapshot.empty) {
                    console.log(`   ✅ ${collectionName}: Nenhum documento encontrado`);
                    continue;
                }
                
                let updatedCount = 0;
                
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (!data.restaurantId) {
                        try {
                            await updateDoc(fbDoc(db, collectionName, doc.id), {
                                restaurantId: restaurantId,
                                updatedAt: new Date().toISOString(),
                                migratedAt: new Date().toISOString()
                            });
                            updatedCount++;
                        } catch (error) {
                            console.warn(`   ⚠️ Erro ao atualizar documento ${doc.id}:`, error.message);
                        }
                    }
                }
                
                console.log(`   ✅ ${collectionName}: ${updatedCount} documentos migrados`);
                
            } catch (error) {
                console.error(`   ❌ Erro na migração de ${collectionName}:`, error.message);
            }
        }
        
        // 3. ATUALIZAR ESTADO GLOBAL
        console.log('🔄 3. Atualizando estado da aplicação...');
        
        if (window.currentRestaurant) {
            window.currentRestaurant.id = restaurantId;
        } else {
            window.currentRestaurant = { id: restaurantId };
        }
        
        console.log('🎉 === MIGRAÇÃO CONCLUÍDA ===');
        console.log('📊 Restaurant ID:', restaurantId);
        
        // Recarregar dados
        if (window.loadUserProfile) {
            console.log('🔄 Recarregando perfil do usuário...');
            try {
                await window.loadUserProfile();
            } catch (error) {
                console.log('⚠️ Erro ao recarregar perfil:', error.message);
            }
        }
        
        console.log('✅ Sistema pronto para uso!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro na migração de emergência:', error);
        return false;
    }
}

// Função para corrigir especificamente o problema de usuários
async function fixUserPermissions() {
    try {
        console.log('🔧 === CORREÇÃO DE PERMISSÕES DE USUÁRIOS ===');
        
        if (!window.firebaseServices || !window.currentUser) {
            console.error('❌ Pré-requisitos não atendidos');
            return;
        }
        
        const { db, collection, getDocs, doc: fbDoc, updateDoc } = window.firebaseServices;
        
        // Buscar todos os usuários e adicionar restaurantId se necessário
        console.log('👥 Carregando usuários...');
        
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                
                if (!userData.restaurantId) {
                    const restaurantId = 'rest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
                    
                    await updateDoc(fbDoc(db, 'users', userDoc.id), {
                        restaurantId: restaurantId,
                        role: userData.role || 'admin',
                        updatedAt: new Date().toISOString()
                    });
                    
                    console.log(`✅ Usuário ${userData.email} atualizado com restaurante ${restaurantId}`);
                }
            }
            
            console.log('✅ Correção de usuários concluída');
            
        } catch (error) {
            console.log('⚠️ Erro na correção, mas isso é esperado com as regras atuais:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erro na correção de permissões:', error);
    }
}

// Executar automaticamente
emergencyMigration();

// Funções disponíveis para uso manual
window.emergencyMigration = emergencyMigration;
window.fixUserPermissions = fixUserPermissions;
