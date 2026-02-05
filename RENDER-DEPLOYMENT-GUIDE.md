# 🔧 GUIDE DÉTAILLÉ: DÉPLOIEMENT BACKEND SUR RENDER.COM

**Durée estimée: 10 minutes**

---

## 📋 PRÉREQUIS

✅ Dépôt GitHub créé: https://github.com/moheshaimi-beep/security-guard-management  
✅ Base de données Railway configurée  
✅ Variables Railway disponibles

---

## 🚀 ÉTAPE 1: CRÉER UN COMPTE RENDER.COM

### 1.1 Inscription
1. Allez sur **https://render.com**
2. Cliquez sur **"Get Started for Free"**
3. Sélectionnez **"Sign in with GitHub"**
4. Autorisez Render à accéder à votre GitHub

**✅ Vous êtes maintenant connecté!**

---

## 🔧 ÉTAPE 2: CRÉER LE SERVICE WEB

### 2.1 Nouveau service
1. Cliquez sur **"New +"** (en haut à droite)
2. Sélectionnez **"Web Service"**

### 2.2 Connecter le dépôt
1. Cherchez **"security-guard-management"** dans la liste
2. Cliquez sur **"Connect"** à côté du dépôt

### 2.3 Configuration du service

Remplissez ces champs EXACTEMENT:

```
Name: security-guard-backend
Region: Frankfurt (EU Central)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: node src/server.js
Instance Type: Free
```

**⚠️ IMPORTANT:**
- **Root Directory:** Doit être `backend` (pas de slash)
- **Start Command:** Doit être `node src/server.js`

**NE CLIQUEZ PAS ENCORE SUR "Create Web Service"**

---

## 🔐 ÉTAPE 3: RÉCUPÉRER LES VARIABLES RAILWAY

### 3.1 Ouvrir Railway Console
1. Allez sur **https://railway.app**
2. Sélectionnez votre projet **"respectful-connection"**
3. Cliquez sur **MySQL**
4. Cliquez sur l'onglet **"Variables"**

### 3.2 Copier les valeurs

Vous allez copier ces 3 variables:

| Variable Railway | À copier |
|------------------|----------|
| `MYSQLHOST` ou `RAILWAY_PRIVATE_DOMAIN` | Valeur complète |
| `MYSQL_ROOT_PASSWORD` | Valeur complète |
| `MYSQL_DATABASE` | Généralement "railway" |

**💡 ASTUCE:** Gardez cet onglet Railway ouvert pour copier facilement!

---

## 📝 ÉTAPE 4: CONFIGURER LES VARIABLES D'ENVIRONNEMENT

### 4.1 Dans Render.com

Faites défiler jusqu'à la section **"Environment Variables"**

### 4.2 Ajouter TOUTES ces variables

**Cliquez sur "Add Environment Variable" pour chaque ligne:**

#### Variables de base (copiez tel quel):
```
NODE_ENV = production
PORT = 5000
```

#### Variables de base de données (copiez depuis Railway):
```
DB_HOST = [COLLEZ_MYSQLHOST_DEPUIS_RAILWAY]
DB_USER = root
DB_PASSWORD = [COLLEZ_MYSQL_ROOT_PASSWORD_DEPUIS_RAILWAY]
DB_NAME = railway
DB_PORT = 3306
DB_SSL = false
```

#### Variables de sécurité (générez des clés fortes):

**Pour générer une clé forte, ouvrez PowerShell et exécutez:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

Exécutez cette commande DEUX FOIS pour obtenir 2 clés différentes:

```
JWT_SECRET = [COLLEZ_LA_PREMIERE_CLE_GENEREE]
SESSION_SECRET = [COLLEZ_LA_DEUXIEME_CLE_GENEREE]
```

#### Variables Frontend (temporaire - à mettre à jour après Vercel):
```
FRONTEND_URL = https://temporary.vercel.app
SOCKET_CORS_ORIGIN = https://temporary.vercel.app
```

**📝 NOTE:** Vous mettrez à jour ces valeurs après avoir déployé sur Vercel.

---

## 🎯 ÉTAPE 5: VÉRIFICATION FINALE

### 5.1 Checklist avant déploiement

Vérifiez que vous avez bien:

- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000`
- [ ] `DB_HOST` = Valeur depuis Railway
- [ ] `DB_PASSWORD` = Valeur depuis Railway
- [ ] `DB_NAME = railway`
- [ ] `JWT_SECRET` = Clé générée (64 caractères)
- [ ] `SESSION_SECRET` = Clé générée différente (64 caractères)
- [ ] `FRONTEND_URL` = URL temporaire
- [ ] `SOCKET_CORS_ORIGIN` = URL temporaire

**✅ Tout est bon? Continuez!**

---

## 🚀 ÉTAPE 6: DÉPLOYER!

### 6.1 Lancer le déploiement
1. Faites défiler tout en bas
2. Cliquez sur **"Create Web Service"**

### 6.2 Attendre le déploiement

Vous allez voir:
- ⏳ **"Building..."** (1-2 minutes)
- ⏳ **"Deploying..."** (30 secondes)
- ✅ **"Live"** (Success!)

**Durée totale: ~2-3 minutes**

### 6.3 Récupérer l'URL

Une fois le déploiement réussi:

1. En haut de la page, vous verrez:
   ```
   https://security-guard-backend-XXXXX.onrender.com
   ```
2. **COPIEZ CETTE URL!** Vous en aurez besoin pour Vercel

---

## ✅ VÉRIFICATION

### Tester le backend

1. Ouvrez votre URL backend dans le navigateur:
   ```
   https://security-guard-backend-XXXXX.onrender.com
   ```

2. Vous devriez voir quelque chose comme:
   ```json
   {"message":"API is running"}
   ```
   OU une page d'erreur (normal si pas de route `/`)

3. Testez la route API:
   ```
   https://security-guard-backend-XXXXX.onrender.com/api
   ```

**✅ Si vous voyez une réponse JSON = SUCCESS!**

---

## 🔧 DÉPANNAGE

### ❌ Le déploiement échoue

**Vérifiez les logs:**
1. Dans Render, cliquez sur **"Logs"** (à gauche)
2. Cherchez les erreurs rouges

**Erreurs courantes:**

#### "Cannot find module"
- ✅ Vérifiez `Root Directory: backend`
- ✅ Vérifiez `Build Command: npm install`

#### "Connection refused" / "Database error"
- ✅ Vérifiez que `DB_HOST` est correct
- ✅ Vérifiez que `DB_PASSWORD` est correct
- ✅ Testez la connexion depuis Railway Console

#### "Port already in use"
- ✅ Vérifiez `PORT = 5000`
- ✅ Vérifiez que `Start Command: node src/server.js`

---

## 📋 RÉCAPITULATIF

**Ce que vous avez maintenant:**

✅ Backend déployé sur Render.com  
✅ URL backend disponible  
✅ Connexion à la base de données Railway  
✅ Variables d'environnement configurées  

**URL de votre backend:**
```
https://security-guard-backend-XXXXX.onrender.com
```

---

## 🎯 PROCHAINE ÉTAPE

**Déployer le frontend sur Vercel!**

Consultez: [VERCEL-DEPLOYMENT-GUIDE.md](VERCEL-DEPLOYMENT-GUIDE.md)

Vous aurez besoin de:
- ✅ L'URL de votre backend (que vous venez d'obtenir)
- ✅ Votre dépôt GitHub (déjà prêt)

**Durée estimée: 5 minutes**

---

## 💡 ASTUCES

### Éviter la mise en veille (Gratuit)

Render.com met le service en veille après 15 minutes d'inactivité.

**Solution gratuite: UptimeRobot**
1. Allez sur **https://uptimerobot.com**
2. Créez un moniteur HTTP
3. URL: Votre URL backend
4. Interval: 5 minutes

**Le service restera actif 24/7!**

### Voir les logs en temps réel

Dans Render.com:
1. Cliquez sur votre service
2. Cliquez sur **"Logs"**
3. Les logs s'actualisent automatiquement

---

**© 2026 SGM – Security Guard Management System**
