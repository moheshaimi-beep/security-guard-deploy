#!/usr/bin/env node
/**
 * 🔍 Vérifier les données dans la base PRODUCTION Railway
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkProduction() {
  // Lire les variables d'environnement Railway
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST_PROD || process.env.MYSQL_HOST,
    user: process.env.DB_USER_PROD || process.env.MYSQL_USER,
    password: process.env.DB_PASS_PROD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME_PROD || process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT_PROD || process.env.MYSQL_PORT || 3306
  });
  
  console.log('✅ Connecté à Railway Production');
  console.log('');
  
  // 1. Trouver Youssef
  const [youssefs] = await connection.query(
    "SELECT id, cin, firstName, lastName, role FROM users WHERE cin = 'BK517312' AND deletedAt IS NULL"
  );
  
  console.log('👤 YOUSSEF en production:');
  if (youssefs.length > 0) {
    const y = youssefs[0];
    console.log('   UUID:', y.id);
    console.log('   Nom:', y.firstName, y.lastName);
    console.log('   Role:', y.role);
  } else {
    console.log('   ❌ Non trouvé');
  }
  console.log('');
  
  // 2. Trouver événement raja vs wac
  const [events] = await connection.query(
    "SELECT id, name, status, startDate, endDate FROM events WHERE id = '80c8707d-1a0f-4c5e-94ad-7cfda0815011' AND deletedAt IS NULL"
  );
  
  console.log('🎯 ÉVÉNEMENT raja vs wac:');
  if (events.length > 0) {
    const e = events[0];
    console.log('   ID:', e.id);
    console.log('   Nom:', e.name);
    console.log('   Status:', e.status);
  } else {
    console.log('   ❌ Non trouvé');
  }
  console.log('');
  
  // 3. Vérifier assignments
  const [assignments] = await connection.query(
    `SELECT a.id, a.agentId, a.status, a.role, u.firstName, u.lastName, u.cin
     FROM assignments a
     LEFT JOIN users u ON a.agentId = u.id
     WHERE a.eventId = '80c8707d-1a0f-4c5e-94ad-7cfda0815011' AND a.deletedAt IS NULL`
  );
  
  console.log('👥 ASSIGNMENTS:', assignments.length);
  assignments.forEach((a, i) => {
    console.log((i+1) + ')', a.firstName, a.lastName, '(', a.cin, ')');
    console.log('   UUID:', a.agentId);
    console.log('   Status:', a.status);
    console.log('   Role:', a.role);
    console.log('');
  });
  
  // 4. Si Youssef n'est pas assigné, proposer de l'assigner
  if (youssefs.length > 0 && events.length > 0) {
    const youssef = youssefs[0];
    const event = events[0];
    
    const isAssigned = assignments.some(a => a.agentId === youssef.id);
    
    if (!isAssigned) {
      console.log('⚠️  Youssef N\'EST PAS assigné à cet événement!');
      console.log('');
      console.log('💡 Pour l\'assigner, exécutez:');
      console.log(`   INSERT INTO assignments (id, eventId, agentId, assignedBy, role, status, confirmedAt, createdAt, updatedAt)`);
      console.log(`   VALUES (UUID(), '${event.id}', '${youssef.id}', '${youssef.id}', 'primary', 'confirmed', NOW(), NOW(), NOW());`);
    } else {
      console.log('✅ Youssef est DÉJÀ assigné!');
    }
  }
  
  await connection.end();
}

checkProduction().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
