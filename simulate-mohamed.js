const io = require('socket.io-client');
const axios = require('axios');

const API_URL = 'https://security-guard-backend.onrender.com/api';
const SOCKET_URL = 'https://security-guard-backend.onrender.com';

// Credentials de Mohamed (login par CIN)
const AGENT_CIN = 'A303730';

// Position de test (Casablanca par exemple)
const position = {
  latitude: 33.5731,
  longitude: -7.5898
};

async function simulateAgent() {
  console.log('🔐 Connexion de Mohamed avec CIN:', AGENT_CIN);
  
  try {
    // 1. Login par CIN
    const loginRes = await axios.post(`${API_URL}/auth/login-cin`, {
      cin: AGENT_CIN,
      userType: 'agent'
    });
    
    console.log('📦 Réponse login:', JSON.stringify(loginRes.data, null, 2));
    
    const responseData = loginRes.data.data || loginRes.data;
    const { token, user, accessToken } = responseData;
    const authToken = token || accessToken;
    
    if (!user) {
      console.error('❌ Pas de données utilisateur dans la réponse');
      return;
    }
    console.log(`✅ Connecté: ${user.firstName} ${user.lastName}`);
    console.log(`🆔 ID: ${user.id}`);
    
    // Récupérer l'événement auquel l'agent est assigné via assignments
    const assignmentsRes = await axios.get(`${API_URL}/assignments/my-assignments`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('📋 Mes assignments:', assignmentsRes.data.assignments?.length || 0);
    
    const assignment = assignmentsRes.data.assignments?.[0];
    if (!assignment || !assignment.eventId) {
      console.error('❌ Aucune assignation trouvée pour cet agent');
      console.log('Utilisation de l\'eventId de "raja vs wac" pour test...');
      var eventId = '80c8707d-1a0f-4c5e-94ad-7cfda0815011'; // raja vs wac
    } else {
      console.log(`🎯 Événement assigné: ${assignment.event?.name || assignment.eventId}`);
      var eventId = assignment.eventId;
    }
    
    console.log(`🎯 EventID utilisé: ${eventId}`);
    
    // 2. Connexion Socket.IO
    const socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket.IO connecté');
      
      // Authentification Socket.IO AVEC eventId
      socket.emit('auth', {
        userId: user.id,
        role: user.role,
        eventId: eventId,
        token: authToken
      });
    });
    
    socket.on('auth:success', (data) => {
      console.log('✅ Authentifié Socket.IO:', data);
      
      // Envoyer la position toutes les 3 secondes
      setInterval(() => {
        const gpsData = {
          userId: user.id,
          latitude: position.latitude + (Math.random() - 0.5) * 0.001,
          longitude: position.longitude + (Math.random() - 0.5) * 0.001,
          accuracy: 10,
          speed: Math.random() * 5,
          heading: Math.random() * 360,
          batteryLevel: 85,
          isMoving: true,
          timestamp: new Date().toISOString()
        };
        
        socket.emit('tracking:position', gpsData);
        console.log(`📍 Position envoyée: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
      }, 3000);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Erreur Socket.IO:', error);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

simulateAgent();
console.log('\n🚀 Simulation démarrée! Appuyez sur Ctrl+C pour arrêter.\n');
