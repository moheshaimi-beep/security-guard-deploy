#!/usr/bin/env node
/**
 * 🎯 Assigner Youssef à l'événement raja vs wac
 */

const { User, Event, Assignment } = require('./backend/src/models');
const db = require('./backend/src/models');

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Connecté à:', process.env.DB_NAME || 'Base locale');
    console.log('');
    
    // Trouver Youssef
    const youssef = await User.findOne({
      where: { cin: 'BK517312' }
    });
    
    if (!youssef) {
      console.error('❌ Youssef (BK517312) non trouvé');
      process.exit(1);
    }
    
    console.log('👤 YOUSSEF:');
    console.log('   UUID:', youssef.id);
    console.log('   Nom:', youssef.firstName, youssef.lastName);
    console.log('   Role:', youssef.role);
    console.log('');
    
    // Trouver l'événement raja vs wac
    const event = await Event.findOne({
      where: { id: '80c8707d-1a0f-4c5e-94ad-7cfda0815011' }
    });
    
    if (!event) {
      console.error('❌ Événement raja vs wac non trouvé');
      process.exit(1);
    }
    
    console.log('🎯 ÉVÉNEMENT:');
    console.log('   ID:', event.id);
    console.log('   Nom:', event.name);
    console.log('   Status:', event.status);
    console.log('');
    
    // Vérifier si Youssef est déjà assigné
    const existing = await Assignment.findOne({
      where: {
        eventId: event.id,
        agentId: youssef.id
      }
    });
    
    if (existing) {
      console.log('✅ Youssef est déjà assigné à cet événement');
      console.log('   Status:', existing.status);
      console.log('   Role:', existing.role);
      process.exit(0);
    }
    
    // Créer l'assignment
    const assignment = await Assignment.create({
      eventId: event.id,
      agentId: youssef.id,
      assignedBy: youssef.id, // Auto-assignation
      role: 'primary',
      status: 'confirmed',
      confirmedAt: new Date(),
      notificationSent: true,
      notificationSentAt: new Date()
    });
    
    console.log('✅ Assignment créé avec succès!');
    console.log('   ID:', assignment.id);
    console.log('   Agent:', youssef.firstName, youssef.lastName);
    console.log('   Event:', event.name);
    console.log('   Status:', assignment.status);
    console.log('');
    console.log('🎉 Youssef est maintenant assigné à raja vs wac!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
