# 🔧 Guide de résolution WebSocket Connection Failed

## 🔍 Diagnostic du problème

### Symptômes observés
```
WebSocket connection to 'wss://security-guard-backend.onrender.com/socket.io/?EIO=4&transport=websocket' failed: 
WebSocket is closed before the connection is established.
```

### Causes identifiées
1. **CORS Configuration** - Le backend n'inclut pas toutes les origines frontend nécessaires
2. **Timeout Settings** - Connexions trop courtes pour Render (free tier)
3. **SSL/TLS Issues** - Problèmes avec les certificats WebSocket sécurisés
4. **Render Free Tier Spin-down** - Le serveur s'endort après inactivité

## ✅ Corrections appliquées

### 1. Backend - Configuration Socket.IO améliorée

**Fichier**: `backend/src/server.js`

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://security-guard-web.onrender.com',
      'https://security-guard-frontend.onrender.com',
      'https://security-guard-web.vercel.app',
      /\.onrender\.com$/,
      /\.vercel\.app$/
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,      // ⏱️ 60 secondes
  pingInterval: 25000,     // ⏱️ 25 secondes
  connectTimeout: 60000,   // ⏱️ 60 secondes
  maxHttpBufferSize: 1e8,
  allowUpgrades: true,
  perMessageDeflate: false
});
```

**Améliorations**:
- ✅ CORS wildcard pour `.onrender.com` et `.vercel.app`
- ✅ Timeouts augmentés pour gérer le spin-down de Render
- ✅ Tous les headers CORS nécessaires
- ✅ Support WebSocket + Polling fallback

### 2. Frontend - Configuration client Socket.IO améliorée

**Fichier**: `web-dashboard/src/pages/RealTimeTracking.jsx`

```javascript
const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,  // ♾️ Tentatives infinies
  timeout: 20000,                  // ⏱️ 20 secondes timeout
  autoConnect: true,
  forceNew: false,
  multiplex: true,
  upgrade: true,
  rememberUpgrade: true,
  withCredentials: true
});
```

**Événements de reconnexion ajoutés**:
```javascript
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Tentative de reconnexion ${attemptNumber}`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`✅ Reconnecté après ${attemptNumber} tentatives`);
  // Re-authentification automatique
  if (user) {
    socket.emit('auth', {
      userId: user.id,
      role: user.role,
      eventId: selectedEvent?.id
    });
  }
});
```

### 3. Interface - Bouton de reconnexion manuelle

Ajout d'un bouton de reconnexion visible quand déconnecté:
```jsx
{!connected && (
  <button onClick={() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    connectSocketIO();
  }}>
    🔄 Reconnecter
  </button>
)}
```

## 🚀 Déploiement sur Render

### Variables d'environnement requises

**Backend** (Render):
```env
NODE_ENV=production
FRONTEND_URL=https://security-guard-web.onrender.com
WEB_URL=https://security-guard-web.onrender.com
CORS_ORIGINS=https://security-guard-web.onrender.com,https://security-guard-frontend.onrender.com,https://security-guard-web.vercel.app
```

**Frontend** (Render/Vercel):
```env
REACT_APP_API_URL=https://security-guard-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://security-guard-backend.onrender.com
```

### Render.com - Configuration spécifique

1. **Auto-Deploy**: Activé sur `main` branch
2. **Health Check Path**: `/api/health`
3. **HTTP/2**: Activé (pour WebSocket)
4. **Connection Keep-Alive**: Activé

#### Pour éviter le spin-down (Render Free Tier)

Option 1: **Ping externe** (recommandé)
```bash
# Créer un cron job externe (cron-job.org, UptimeRobot)
GET https://security-guard-backend.onrender.com/api/health
Intervalle: 10 minutes
```

Option 2: **Self-ping** (ajouter au backend)
```javascript
// backend/src/scheduler.js
setInterval(async () => {
  try {
    await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/health`);
    console.log('🏓 Self-ping keepalive');
  } catch (error) {
    console.error('❌ Self-ping failed:', error.message);
  }
}, 10 * 60 * 1000); // Toutes les 10 minutes
```

## 🧪 Tests

### 1. Test local
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd web-dashboard
npm start
```

Vérifier:
- ✅ Console affiche "✅ Socket.IO Tracking connecté"
- ✅ Positions GPS reçues en temps réel
- ✅ Indicateur "🟢 Temps réel actif"

### 2. Test production

1. Ouvrir https://security-guard-web.onrender.com/tracking
2. Ouvrir la console développeur (F12)
3. Vérifier les logs:
```
✅ Socket.IO Tracking connecté
🔐 Authentification Socket.IO avec: {...}
✅ Authentifié Socket.IO: {...}
```

### 3. Test de reconnexion

1. Couper le WiFi/réseau pendant 30 secondes
2. Vérifier: indicateur passe à "🔴 Temps réel inactif"
3. Rétablir le réseau
4. Vérifier: reconnexion automatique en ~5-10 secondes
5. Console affiche: "✅ Reconnecté Socket.IO après X tentatives"

## 🔧 Troubleshooting avancé

### Problème: "connect_error" persistant

**Solution**:
```javascript
// Ajouter dans RealTimeTracking.jsx
socket.on('connect_error', (error) => {
  console.error('❌ Erreur:', error.message);
  console.error('📋 Details:', error);
  // Si CORS error
  if (error.message.includes('CORS')) {
    console.error('🚫 Vérifier CORS backend:', SOCKET_URL);
  }
  // Si timeout
  if (error.message.includes('timeout')) {
    console.error('⏱️ Timeout - serveur peut-être en spin-down');
  }
});
```

### Problème: Reconnexion en boucle

**Cause**: Backend rejette l'authentification

**Solution**:
```javascript
// Vérifier dans console backend
console.log('🔐 Auth data received:', data);
console.log('👤 User found:', user ? 'YES' : 'NO');
```

### Problème: Position non reçue

**Diagnostic**:
```javascript
// Frontend - vérifier émission
socket.on('connect', () => {
  console.log('🔗 Connected, subscribing to event:', selectedEvent?.id);
  socket.emit('tracking:subscribe', selectedEvent?.id);
});

// Backend - vérifier réception
socket.on('tracking:position', (data) => {
  console.log('📍 Position received from:', data.userId);
});
```

## 📊 Monitoring

### Logs à surveiller

**Frontend Console**:
- ✅ "Socket.IO Tracking connecté"
- ❌ "connect_error" (mauvais)
- 🔄 "Tentative de reconnexion" (normal après déconnexion)

**Backend Logs** (Render Dashboard):
```
✅ Socket.IO Service initialisé
✅ Client Socket.IO connecté: xxx
🔐 Authentification Socket.IO: {...}
✅ Client authentifié: admin/supervisor/agent
📍 Position received from: xxx
```

### Métriques Render

1. **Response Time**: < 200ms (normal)
2. **CPU Usage**: < 50% (normal)
3. **Memory**: < 512MB (free tier limit)
4. **Requests/min**: Surveiller les pics

## 🎯 Checklist de déploiement

Avant le déploiement production:

- [ ] Variables d'environnement configurées sur Render
- [ ] CORS origins incluent le domaine frontend
- [ ] Socket.IO pingTimeout ≥ 60000
- [ ] Frontend REACT_APP_SOCKET_URL pointe vers backend Render
- [ ] Health check path configuré sur Render
- [ ] Test reconnexion automatique fonctionnel
- [ ] Logs backend activés (morgan)
- [ ] Monitoring externe configuré (UptimeRobot)

## 📞 Support

En cas de problème persistant:

1. Vérifier les logs Render: `https://dashboard.render.com`
2. Tester avec curl:
```bash
curl -I https://security-guard-backend.onrender.com/api/health
```

3. Tester WebSocket avec wscat:
```bash
npm install -g wscat
wscat -c wss://security-guard-backend.onrender.com/socket.io/?EIO=4&transport=websocket
```

## 🔄 Prochaines étapes

### Optimisations recommandées

1. **Upgrade Render Plan** - Éliminer le spin-down
2. **Redis pour Socket.IO** - Multi-instance scaling
3. **CDN pour frontend** - Vercel/Cloudflare
4. **Compression WebSocket** - Réduire bandwidth
5. **Rate limiting Socket.IO** - Sécurité

### Monitoring avancé

1. **Sentry** - Error tracking
2. **Datadog** - Performance monitoring
3. **LogRocket** - Session replay
4. **New Relic** - APM

---

**Dernière mise à jour**: 6 février 2026
**Version**: 1.0.0
**Auteur**: Security Guard Management Team
