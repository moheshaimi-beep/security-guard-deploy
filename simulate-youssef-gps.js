#!/usr/bin/env node
/**
 * 🧪 Script de simulation GPS pour Youssef (BK517312)
 * Simule un téléphone envoyant des positions GPS au serveur
 */

const io = require('socket.io-client');

// Configuration
const SOCKET_URL = 'https://security-guard-backend.onrender.com';
const USER_ID = '3ae0b39b-81aa-4ed6-99e7-4a49814942fd'; // Youssef UUID
const USER_CIN = 'BK517312';
const EVENT_ID = '80c8707d-1a0f-4c5e-94ad-7cfda0815011'; // raja vs wac (EVENT ACTIF)
const EVENT_NAME = 'raja vs wac';

// Position de départ (Casablanca)
let latitude = 33.5731;
let longitude = -7.5898;

console.log('═══════════════════════════════════════════════════════');
console.log('  📱 SIMULATION GPS - YOUSSEF IBENBOUBKEUR');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('🔗 Connexion à:', SOCKET_URL);
console.log('👤 Utilisateur: Youssef (BK517312)');
console.log('🎯 Événement:', EVENT_NAME);
console.log('📍 Position départ:', latitude, longitude);
console.log('');

const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  timeout: 20000
});

socket.on('connect', () => {
  console.log('✅ Connecté au serveur!');
  console.log('   Socket ID:', socket.id);
  
  // Authentification
  console.log('🔐 Authentification en cours...');
  socket.emit('auth', {
    userId: USER_CIN, // Utiliser CIN au lieu de l'UUID
    role: 'supervisor',
    eventId: EVENT_ID
  });
});

socket.on('auth:success', (data) => {
  console.log('✅ Authentifié avec succès!');
  console.log('   User ID:', data.userId);
  console.log('   Role:', data.role);
  console.log('');
  console.log('📡 Démarrage envoi positions GPS...');
  console.log('   Intervalle: 3 secondes');
  console.log('   Mouvement: aléatoire autour de Casa');
  console.log('');
  
  const authenticatedUserId = data.userId; // UUID réel retourné par le serveur
  
  // Envoyer position toutes les 3 secondes
  let count = 0;
  setInterval(() => {
    count++;
    
    // Simuler mouvement (variations aléatoires)
    latitude += (Math.random() - 0.5) * 0.001; // ±50m
    longitude += (Math.random() - 0.5) * 0.001;
    
    const position = {
      userId: authenticatedUserId, // ✅ Utiliser l'UUID réel du serveur
      latitude,
      longitude,
      accuracy: 10,
      speed: Math.random() * 5, // 0-5 m/s
      heading: Math.random() * 360,
      batteryLevel: Math.max(20, 100 - count), // Décharge progressive
      isMoving: Math.random() > 0.3, // 70% en mouvement
      timestamp: Date.now()
    };
    
    socket.emit('tracking:position', position);
    
    console.log(`📍 [${count}] Position envoyée:`, 
      latitude.toFixed(6), longitude.toFixed(6),
      '| UUID:', authenticatedUserId,
      '| Speed:', position.speed.toFixed(1) + 'm/s',
      '| Battery:', position.batteryLevel + '%',
      '| Moving:', position.isMoving ? '🏃' : '🛑'
    );
  }, 3000);
});

socket.on('auth:error', (error) => {
  console.error('❌ Erreur authentification:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔴 Déconnecté:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erreur connexion:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`✅ Reconnecté après ${attemptNumber} tentatives`);
});

// Gestion arrêt propre
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt du simulateur...');
  socket.disconnect();
  process.exit(0);
});

console.log('💡 Appuyez sur Ctrl+C pour arrêter\n');
