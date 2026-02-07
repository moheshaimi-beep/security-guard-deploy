# 📍 SYSTÈME DE TRACKING GPS EN TEMPS RÉEL

## Vue d'ensemble

Système complet de suivi des agents pendant les événements avec affichage en temps réel sur carte interactive, alertes automatiques, géofencing et historique des déplacements.

---

## 🎯 Fonctionnalités principales

### 1. ✅ Pointage & démarrage automatique du suivi

- **Au check-in**, le tracking GPS démarre automatiquement
- Service `GPSTrackingService` initialisé avec position initiale
- Enregistrement dans table `geotracking` + émission Socket.IO

### 2. 📡 Suivi de localisation en temps réel

- **Position GPS envoyée chaque seconde** par l'app mobile/web
- Hook React `useGPSTracking` utilise `navigator.geolocation.watchPosition()`
- Données transmises via:
  - **HTTP API**: `/api/tracking/update-position` (sauvegarde BDD)
  - **Socket.IO**: `tracking:update_position` (temps réel)

**Données transmises**:
```javascript
{
  latitude: number,
  longitude: number,
  accuracy: number,
  batteryLevel: number,
  isMoving: boolean,
  timestamp: Date,
  eventId: string
}
```

### 3. 🗺️ Visualisation sur carte interactive

**Page**: `/tracking` (RealTimeTrackingNew.jsx)

**Carte Leaflet avec**:
- Markers personnalisés pour chaque agent (icône + couleur selon statut)
- Cercle périmètre événement (géofencing)
- Popup détaillé (nom, CIN, batterie, statut, dernière MAJ)
- Polyline trajet pour historique
- Recentrage automatique sur événement sélectionné

**Agents représentés par**:
- **Nom / Matricule**: `{firstName} {lastName}` + `employeeId`
- **Statut**: `active` | `outside_geofence` | `completed`
- **Batterie**: Niveau + icône warning si < 20%
- **Mouvement**: 🚶 En déplacement | 🛑 Arrêté

### 4. 👥 Vues différenciées

#### Agents:
- Voient **uniquement leur propre position** (filtrage backend)
- Tracking démarre automatiquement au check-in
- Arrêt automatique au check-out

#### Responsables & Admins:
- Voient **tous les agents** d'un événement
- Filtres avancés (actifs, hors périmètre, batterie faible)
- Statistiques en temps réel
- Alertes visuelles + notifications toast

### 5. 🔋 État de la batterie

**Affichage**:
- Pourcentage batterie dans marker popup
- Badge rouge sur marker si batterie < 20%
- Stat "Batterie faible" dans dashboard

**Alertes automatiques** à:
- **20%** ⚡ Alerte orange
- **10%** ⚡ Alerte rouge
- **5%** 🚨 Alerte critique

**Système anti-spam**: Max 1 alerte toutes les 5 minutes

### 6. 🚧 Périmètre autorisé (Géofencing)

**Configuration**:
- Centre: `event.latitude`, `event.longitude`
- Rayon: `event.geoRadius` (mètres, défaut 100m)
- Visible sur carte (cercle bleu transparent)

**Vérification continue**:
- Calcul distance agent ↔ centre événement (formule Haversine)
- Comparaison avec `geoRadius`
- Mise à jour statut agent:
  - `active`: Dans le périmètre ✅
  - `outside_geofence`: Hors périmètre 🚨

### 7. 🚨 Alerte sortie de périmètre

**Déclenchement**:
- Agent passe de `active` → `outside_geofence`
- Avant la fin de l'événement

**Notification instantanée**:
- Message: *"⚠️ L'agent {Nom} ({Matricule}) a quitté le périmètre de l'événement "{Nom événement}" (XXm du centre, limite: XXm)"*
- **Socket.IO**: `tracking:geofence_alert` émis à tous les admins/superviseurs
- **Toast notification** rouge sur dashboard
- **Enregistrement BDD**: Table `notifications` (type: `geofence_alert`, priority: `high`)
- **Panneau alertes**: Affiché en haut à droite de la carte

**Retour dans périmètre**:
- Agent passe de `outside_geofence` → `active`
- Notification verte: *"✅ L'agent {Nom} est revenu dans le périmètre"*

**Anti-spam**: Max 1 alerte toutes les 5 minutes par agent

### 8. 📜 Historique des déplacements

**Données stockées**:
- Table `geotracking`: Chaque position GPS + timestamp
- Colonnes: `userId`, `eventId`, `latitude`, `longitude`, `accuracy`, `batteryLevel`, `recordedAt`, `isMoving`

**Visualisation**:
- Clic sur marker agent → Bouton "Voir l'historique"
- **Polyline bleue** affiche trajet complet sur carte
- Horodatage de chaque position visible dans logs

**API**:
```
GET /api/tracking/history/:userId/:eventId?startDate=...&endDate=...
```

**Permissions**:
- Admin/Supervisor: Tous les agents
- Agent: Uniquement son propre historique

### 9. ⏹️ Fin d'événement

**Arrêt automatique du suivi**:

1. **Au check-out**:
   - `gpsTrackingService.stopTracking(userId)` appelé
   - Position finale enregistrée
   - Statut agent → `completed`
   - Socket.IO: `tracking:agent_stopped` émis
   - Agent retiré de la carte

2. **Fin automatique événement**:
   - Vérification chaque seconde dans `updatePosition()`
   - Si `new Date() > event.endDate` → arrêt tracking
   - Nettoyage des trackers actifs

3. **Au redémarrage serveur**:
   - `gpsTrackingService.cleanup()` appelé
   - Tous les trackers réinitialisés

---

## 🏗️ Architecture technique

### Backend

#### Services

**1. GPSTrackingService** (`backend/src/services/gpsTrackingService.js`)

Gère le tracking en temps réel:

**Méthodes principales**:
- `startTracking(userId, eventId, initialPosition)`: Démarrer tracking au check-in
- `updatePosition(userId, positionData)`: Mise à jour position (appelée chaque seconde)
- `stopTracking(userId)`: Arrêter tracking au check-out
- `checkGeofence(userId, position, agentStatus)`: Vérifier périmètre
- `checkBatteryLevel(userId, batteryLevel)`: Vérifier batterie
- `sendGeofenceAlert(userId, distance, radius)`: Envoyer alerte sortie périmètre
- `sendBatteryAlert(userId, batteryLevel)`: Envoyer alerte batterie
- `getAgentTrackingHistory(userId, eventId, startDate, endDate)`: Récupérer historique
- `getActiveAgents(eventId)`: Agents actuellement en tracking
- `calculateDistance(lat1, lon1, lat2, lon2)`: Distance Haversine (mètres)

**Stockage en mémoire**:
```javascript
this.agentStatuses = new Map(); // userId → {status, lastPosition, battery, eventId, event}
this.geofenceAlerts = new Map(); // userId → lastAlertTime (anti-spam)
```

#### Contrôleurs

**attendanceController.js**:
- **Check-in**: Appelle `gpsTrackingService.startTracking()`
- **Check-out**: Appelle `gpsTrackingService.stopTracking()`

#### Routes

**tracking.js**:
```javascript
POST   /api/tracking/update-position           // Mise à jour position (chaque seconde)
GET    /api/tracking/active-agents/:eventId    // Agents en tracking
GET    /api/tracking/history/:userId/:eventId  // Historique trajets
```

#### Socket.IO Events

**Émis par le serveur**:
- `tracking:position_update`: Nouvelle position agent
- `tracking:agent_stopped`: Agent a terminé tracking
- `tracking:geofence_alert`: Alerte sortie/retour périmètre
- `tracking:battery_alert`: Alerte batterie faible

**Reçus du client**:
- `tracking:subscribe`: S'abonner aux mises à jour d'un événement
- `tracking:update_position`: Mise à jour position (temps réel)

### Frontend

#### Pages

**RealTimeTrackingNew.jsx** (`web-dashboard/src/pages/RealTimeTrackingNew.jsx`)

Carte interactive complète avec:
- **Sélection événement**: Dropdown + recentrage automatique
- **Statistiques**: Total, Actifs, Hors périmètre, Batterie faible
- **Filtres**: Boutons toggle pour filtrer agents
- **Carte Leaflet**:
  - Markers agents (icône personnalisée selon statut)
  - Cercle périmètre événement
  - Polyline historique trajet
- **Panneau alertes**: Top-right avec historique alertes
- **Mode plein écran**: Bouton fullscreen

#### Hooks

**useGPSTracking.js** (`web-dashboard/src/hooks/useGPSTracking.js`)

Hook personnalisé pour envoyer position GPS chaque seconde:

**Utilisation**:
```javascript
const { isTracking, lastPosition, error } = useGPSTracking(isCheckedIn, eventId);
```

**Fonctionnement**:
1. `navigator.geolocation.watchPosition()`: Surveillance GPS continue
2. `setInterval(sendPosition, 1000)`: Envoi chaque seconde
3. `sendPosition()`: Appelle API HTTP + Socket.IO
4. Auto-démarrage si `isCheckedIn === true`
5. Auto-arrêt si `isCheckedIn === false`

**Récupération batterie**:
```javascript
const battery = await navigator.getBattery();
batteryLevel = Math.round(battery.level * 100);
```

---

## 📊 Modèle de données

### Table `geotracking`

```sql
CREATE TABLE geotracking (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  eventId UUID NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  batteryLevel INTEGER,
  isMoving BOOLEAN DEFAULT false,
  isWithinGeofence BOOLEAN DEFAULT true,
  distanceFromEvent DECIMAL(10, 2),
  recordedAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Table `events` (colonnes tracking)

```sql
ALTER TABLE events ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE events ADD COLUMN geoRadius INTEGER DEFAULT 100 COMMENT 'Radius in meters for geofencing';
```

### Table `notifications` (alertes tracking)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  userId UUID,
  type VARCHAR(50) NOT NULL, -- 'geofence_alert', 'low_battery'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON,
  priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'high', 'critical'
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Configuration

### Variables d'environnement

Aucune variable supplémentaire requise. Utilise la config existante:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL`

### Initialisation serveur

Dans `backend/src/server.js`:

```javascript
// Initialiser GPS Tracking Service
const GPSTrackingService = require('./services/gpsTrackingService');
const gpsTrackingService = new GPSTrackingService(io);
await gpsTrackingService.cleanup();
app.set('gpsTrackingService', gpsTrackingService);
```

---

## 📱 Utilisation

### Pour un Agent

1. **Check-in** sur `/checkin` avec GPS activé
2. Tracking GPS démarre automatiquement
3. Position envoyée chaque seconde en arrière-plan
4. Visible sur carte par responsables/admins
5. **Check-out** pour arrêter le tracking

### Pour un Responsable/Admin

1. Ouvrir `/tracking`
2. Sélectionner événement dans dropdown
3. Voir agents en temps réel sur carte
4. Filtrer par statut (actifs, hors périmètre, etc.)
5. Cliquer sur marker pour voir détails
6. Cliquer "Voir l'historique" pour trajet complet
7. Recevoir alertes automatiques (géofencing, batterie)

---

## 🚨 Alertes disponibles

### 1. Sortie de périmètre

**Déclenchement**: Agent quitte périmètre avant fin événement

**Notification**:
- 🚨 Toast rouge
- Panneau alertes (top-right carte)
- Enregistrement BDD

**Contenu**:
- Nom agent + matricule
- Nom événement
- Distance du centre (m)
- Limite autorisée (m)
- Timestamp

### 2. Retour dans périmètre

**Déclenchement**: Agent revient dans périmètre

**Notification**:
- ✅ Toast vert
- Panneau alertes

### 3. Batterie faible

**Déclenchement**: Batterie passe sous seuils (20%, 10%, 5%)

**Notification**:
- 🔋 Toast orange
- Panneau alertes
- Badge rouge sur marker carte

**Contenu**:
- Nom agent
- Niveau batterie (%)
- Nom événement

---

## 🔒 Sécurité & Permissions

### Vérifications backend

1. **Authentification** requise (middleware `protect`)
2. **Autorisation par rôle**:
   - `tracking/active-agents/:eventId`: Admin/Supervisor uniquement
   - `tracking/history/:userId/:eventId`: Admin/Supervisor ou données propres
3. **Validation données GPS**:
   - `latitude`/`longitude` requis
   - Conversion `parseFloat()` + vérification `isNaN()`
4. **Anti-spam alertes**: Max 1 alerte / 5 min par agent

### Permissions frontend

- Route `/tracking`: Accessible Admin/Supervisor uniquement (vérification dans App routing)
- Filtrage agents par événement assigné
- Socket.IO rooms: `event:{eventId}`, `tracking:admin`

---

## 📈 Performance & Optimisation

### Fréquence envoi GPS

- **1 seconde**: Tracking précis en temps réel
- **Alternative**: Configurable dans `useGPSTracking.js` (ligne `setInterval(sendPosition, 1000)`)

### Stockage mémoire

- `Map()` pour trackers actifs (rapide, O(1))
- Nettoyage automatique au check-out/fin événement
- `cleanup()` au redémarrage serveur

### Base de données

- **Index recommandés**:
  ```sql
  CREATE INDEX idx_geotracking_user_event ON geotracking(userId, eventId);
  CREATE INDEX idx_geotracking_recorded_at ON geotracking(recordedAt DESC);
  ```

### Socket.IO

- **Rooms**: Émission ciblée (évite broadcast global)
- **Transports**: WebSocket (fallback polling)
- **Reconnexion automatique**: Activée par défaut

---

## 🧪 Tests

### Test tracking complet

1. **Setup**:
   - Créer événement avec `latitude`, `longitude`, `geoRadius`
   - Assigner agent à événement

2. **Check-in**:
   ```bash
   POST /api/attendance/check-in
   {
     "eventId": "...",
     "latitude": 33.5731,
     "longitude": -7.5898,
     "checkInMethod": "gps"
   }
   ```
   - ✅ Vérifier tracking démarré (logs backend)
   - ✅ Voir agent sur `/tracking`

3. **Mise à jour position** (simuler déplacement):
   ```bash
   POST /api/tracking/update-position
   {
     "latitude": 33.5732,
     "longitude": -7.5899,
     "accuracy": 10,
     "batteryLevel": 85,
     "isMoving": true
   }
   ```
   - ✅ Marker bouge sur carte
   - ✅ Popup mis à jour

4. **Sortie périmètre**:
   ```bash
   POST /api/tracking/update-position
   {
     "latitude": 33.6000, // Hors périmètre
     "longitude": -7.6000,
     "batteryLevel": 80
   }
   ```
   - ✅ Alerte géofencing reçue
   - ✅ Marker devient rouge
   - ✅ Toast affiché

5. **Batterie faible**:
   ```bash
   POST /api/tracking/update-position
   {
     "batteryLevel": 15 // < 20%
   }
   ```
   - ✅ Alerte batterie reçue
   - ✅ Badge rouge sur marker

6. **Check-out**:
   ```bash
   POST /api/attendance/check-out
   ```
   - ✅ Tracking arrêté
   - ✅ Agent retiré de carte

### Test historique

```bash
GET /api/tracking/history/{userId}/{eventId}
```
- ✅ Retourne array positions avec timestamps
- ✅ Polyline affichée sur carte

---

## 🐛 Dépannage

### Agent n'apparaît pas sur carte

**Causes**:
- Check-in sans GPS (`latitude`/`longitude` manquants)
- Événement sans coordonnées (pas de `selectedEvent`)
- Socket.IO non connecté

**Solutions**:
- Vérifier logs backend: `📡 Position GPS émise via Socket.IO`
- Vérifier console frontend: `📍 Position mise à jour`
- Vérifier connexion Socket.IO: `✅ Socket.IO connecté`

### Tracking ne démarre pas

**Causes**:
- `gpsTrackingService` non initialisé
- Permission géolocalisation refusée
- Check-in échoué

**Solutions**:
- Vérifier logs: `🚀 Démarrage tracking GPS pour user`
- Vérifier `app.get('gpsTrackingService')` dans `attendanceController`
- Activer géolocalisation dans navigateur/app mobile

### Alertes géofencing ne s'affichent pas

**Causes**:
- Socket.IO non connecté côté frontend
- Room `event:{eventId}` non jointe
- Anti-spam actif (5 min)

**Solutions**:
- Vérifier `socket.on('tracking:geofence_alert')` dans composant
- Vérifier logs backend: `🚨 Alerte géofencing envoyée`
- Attendre 5 minutes entre alertes

### Historique vide

**Causes**:
- Aucune position enregistrée
- `userId`/`eventId` incorrect
- Permissions insuffisantes

**Solutions**:
- Vérifier table `geotracking` dans BDD
- Tester endpoint: `GET /api/tracking/history/{userId}/{eventId}`
- Vérifier role utilisateur (admin/supervisor/own data)

---

## 🚀 Déploiement

### Backend (Render)

1. Commit + push modifications
2. Render auto-redéploie
3. Vérifier logs:
   ```
   ✅ GPS Tracking Service initialized - Real-time agent tracking enabled
   ```

### Frontend (Render/Vercel)

1. Commit + push modifications
2. Auto-redéploie
3. Tester `/tracking` en production

### Migration BDD (Railway)

**Aucune migration requise** - Utilise table `geotracking` existante

---

## 📝 Logs à surveiller

### Backend

**Démarrage**:
```
✅ GPS Tracking Service initialized - Real-time agent tracking enabled
```

**Check-in**:
```
🚀 Démarrage tracking GPS pour user {userId} sur événement {eventId}
```

**Mise à jour position**:
```
📍 Position GPS mise à jour pour {userId}
```

**Géofencing**:
```
🚨 Alerte géofencing envoyée pour {firstName} {lastName}
✅ Retour géofencing pour {firstName} {lastName}
```

**Batterie**:
```
🔋 Alerte batterie faible pour {firstName} {lastName}: {batteryLevel}%
```

**Check-out**:
```
⏹️ Arrêt tracking GPS pour user {userId}
```

### Frontend

**Socket.IO**:
```
✅ Socket.IO connecté pour tracking
📍 Position mise à jour: {data}
```

**Alertes**:
```
🚨 Alerte géofencing: {data}
🔋 Alerte batterie: {data}
```

---

## ✅ Checklist déploiement

- [x] Service `GPSTrackingService` créé
- [x] Routes tracking ajoutées
- [x] Intégration dans `attendanceController` (check-in/check-out)
- [x] Initialisation dans `server.js`
- [x] Page frontend `RealTimeTrackingNew.jsx` créée
- [x] Hook `useGPSTracking.js` créé
- [x] Socket.IO events configurés
- [x] Alertes géofencing + batterie implémentées
- [x] Historique trajets fonctionnel
- [x] Documentation complète

**Prêt pour déploiement** 🚀
