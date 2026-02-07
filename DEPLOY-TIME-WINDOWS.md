# 🚀 DÉPLOIEMENT - GESTION FENÊTRES DE TEMPS

## 📋 Modifications à déployer

Vous avez modifié 6 fichiers backend pour implémenter la gestion des fenêtres temporelles :

### Fichiers modifiés :
1. ✅ `backend/src/controllers/authController.js`
2. ✅ `backend/src/controllers/attendanceController.js`
3. ✅ `backend/src/services/socketIOService.js`
4. ✅ `backend/src/scheduler.js`
5. ✅ `backend/src/server.js`
6. ✅ `web-dashboard/src/pages/CheckInLogin.jsx`

---

## 🔄 ÉTAPE 1 : Push vers GitHub

```powershell
# 1. Vérifier les modifications
git status

# 2. Ajouter tous les fichiers modifiés
git add backend/src/controllers/authController.js
git add backend/src/controllers/attendanceController.js
git add backend/src/services/socketIOService.js
git add backend/src/scheduler.js
git add backend/src/server.js
git add web-dashboard/src/pages/CheckInLogin.jsx
git add TIME_WINDOW_RULES.md
git add IMPLEMENTATION_SUMMARY.md

# 3. Commit avec message descriptif
git commit -m "feat: Gestion fenêtres temporelles check-in/check-out et temps réel

- Blocage login CIN si hors fenêtre (2h avant → fin)
- Validation check-in (2h avant → fin événement)
- Validation check-out (5min avant fin → fin événement)
- Contrôle temps réel Socket.IO (2h avant → fin)
- CRON auto-déconnexion toutes les 10min
- Messages détaillés avec horaires
- Codes erreur: OUTSIDE_TIME_WINDOW, CHECKIN_NOT_ALLOWED, CHECKOUT_NOT_ALLOWED"

# 4. Push vers GitHub
git push origin main
```

---

## 🚀 ÉTAPE 2 : Render.com redéploie automatiquement

Une fois le push fait, **Render détecte automatiquement** les changements et redéploie :

### Vérifier le déploiement :

1. Allez sur https://dashboard.render.com/
2. Cliquez sur votre service backend
3. Onglet **"Events"** → Vous verrez "Deploy triggered by push..."
4. Attendez 2-5 minutes que le build se termine
5. Statut devient **"Live"** ✅

### Vérifier les logs :

Une fois déployé, vérifiez les logs Render :
```
✅ Socket.IO Service initialized
✅ Scheduler mis à jour avec Socket.IO pour la gestion automatique des fenêtres de temps
⏰ Scheduler démarré: vérification fenêtres de temps Socket.IO toutes les 10 minutes
```

---

## 🗄️ ÉTAPE 3 : Railway (Base de données)

**AUCUNE ACTION REQUISE** ✅

Les modifications n'impactent **pas le schéma de la base de données** :
- Pas de nouvelle table
- Pas de nouvelle colonne
- Juste de la logique métier backend

Railway reste inchangé.

---

## 🌐 ÉTAPE 4 : Frontend (Vercel probable)

Si votre frontend est sur **Vercel** :

```powershell
# Le push GitHub déclenche auto-déploiement Vercel
# Vérifier sur https://vercel.com/dashboard
```

Si frontend sur **Render** :
- Même processus : détection auto + redéploiement

---

## ✅ ÉTAPE 5 : Vérification post-déploiement

### Test 1 : Health check API
```powershell
curl https://VOTRE-BACKEND-RENDER.onrender.com/api/health
```

**Attendu :**
```json
{
  "success": true,
  "message": "API Security Guard Management is running",
  "version": "1.0.0"
}
```

### Test 2 : Login CIN avec événement hors fenêtre
```powershell
# Via Postman ou curl
curl -X POST https://VOTRE-BACKEND-RENDER.onrender.com/api/auth/login-cin \
  -H "Content-Type: application/json" \
  -d '{"cin": "BK517312", "userType": "agent"}'
```

**Attendu si événement dans > 2h :**
```json
{
  "success": false,
  "message": "Le check-in pour l'événement \"XXX\" sera disponible 2 heures avant le début...",
  "code": "OUTSIDE_TIME_WINDOW",
  "data": {
    "nextEvent": {
      "eventName": "...",
      "hoursRemaining": 5,
      "minutesRemaining": 30
    }
  }
}
```

### Test 3 : Vérifier CRON dans logs Render
Attendez 10 minutes après déploiement, puis regardez les logs :
```
🔄 [CRON] Vérification des fenêtres de temps pour Socket.IO...
✅ [CRON] Toutes les connexions Socket.IO sont dans les fenêtres de temps autorisées
```

---

## 🔧 Variables d'environnement Render

Vérifiez que vous avez bien :

```env
# Database (Railway)
DB_HOST=roundhouse.proxy.rlwy.net
DB_PORT=12345
DB_NAME=railway
DB_USER=root
DB_PASSWORD=xxxxx

# JWT
JWT_SECRET=votre-secret-jwt
JWT_EXPIRES_IN=7d

# Node
NODE_ENV=production
PORT=5000

# Frontend URL (pour CORS)
FRONTEND_URL=https://security-guard-web.vercel.app
WEB_URL=https://security-guard-web.onrender.com
```

---

## 🐛 Dépannage

### Problème : Build échoue sur Render
**Solution :** Vérifiez les logs de build
```
npm install
npm run build  # Si vous avez un script de build
```

### Problème : CRON ne se lance pas
**Solution :** Vérifiez que le scheduler démarre
```javascript
// Dans server.js, ligne ~440
startScheduler(io);  // ✅ Doit être présent
```

### Problème : Socket.IO ne fonctionne plus
**Solution :** Vérifiez CORS dans `server.js`
```javascript
cors: {
  origin: [
    'https://security-guard-web.onrender.com',
    'https://security-guard-web.vercel.app',
    process.env.FRONTEND_URL
  ]
}
```

---

## 📊 Monitoring

### Logs à surveiller :

**Au démarrage :**
```
✅ Socket.IO Service initialized
✅ Scheduler mis à jour avec Socket.IO
⏰ Scheduler démarré: vérification fenêtres de temps Socket.IO toutes les 10 minutes
```

**Toutes les 10 minutes :**
```
🔄 [CRON] Vérification des fenêtres de temps pour Socket.IO...
✅ [CRON] X connexion(s) Socket.IO désactivée(s) (hors fenêtre de temps)
```

**Lors de tentatives de login :**
```
🔐 Connexion CIN refusée - Hors fenêtre de temps: Le check-in pour...
⏸️ Tracking refusé pour BK517312: Tracking pas encore disponible
```

---

## 🎯 Checklist finale

- [ ] Push vers GitHub (`git push origin main`)
- [ ] Render redéploie automatiquement (attendre ~3min)
- [ ] Logs Render montrent "Scheduler mis à jour avec Socket.IO"
- [ ] Test login CIN avec événement futur → Bloqué avec message
- [ ] Test check-in hors fenêtre → Code 403 + message
- [ ] Vérifier CRON toutes les 10min dans logs
- [ ] Frontend mis à jour (Vercel auto-deploy)
- [ ] Test complet sur https://security-guard-web.onrender.com/login

---

## 📝 Notes importantes

### ✅ Avantages production :
- **0 downtime** : Render fait un rolling deployment
- **Auto-scaling** : Si charge augmente, Render gère
- **CRON intégré** : Pas besoin de service externe
- **Logs persistants** : 7 jours gratuits sur Render

### ⚠️ Limitations Render gratuit :
- Service sleep après 15min inactivité
- Premier requête peut prendre 30-60s (cold start)
- **Solution :** Utiliser un ping service (UptimeRobot, cron-job.org)

---

**Prêt à déployer ?** Suivez les étapes ci-dessus ! 🚀
