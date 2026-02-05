# 🚀 GUIDE: DÉPLOIEMENT BACKEND SUR RAILWAY

**Durée: 5 minutes | 100% GRATUIT | AUCUNE carte requise**

---

## ✅ POURQUOI RAILWAY?

- ✅ **GRATUIT** - 500h/mois (largement suffisant)
- ✅ **AUCUNE carte bancaire** requise
- ✅ **Database + Backend** au même endroit
- ✅ **Connection directe** - Pas de problème de domaine
- ✅ **Déjà connecté** avec GitHub
- ✅ **Plus simple** que Render

---

## 📋 ÉTAPE 1: OUVRIR RAILWAY

1. Allez sur **https://railway.app**
2. Vous êtes déjà connecté!
3. Sélectionnez votre projet: **respectful-connection**

---

## ➕ ÉTAPE 2: AJOUTER LE SERVICE BACKEND

### 2.1 Créer un nouveau service

1. Dans le projet, cliquez sur **"+ New"**
2. Sélectionnez **"GitHub Repo"**
3. Cherchez et sélectionnez: **security-guard-management**
4. Cliquez sur **"Deploy Now"**

### 2.2 Configuration du service

1. Railway va automatiquement:
   - ✅ Détecter que c'est un projet Node.js
   - ✅ Lire le `package.json`
   - ✅ Installer les dépendances
   - ✅ Démarrer le serveur

---

## 🔧 ÉTAPE 3: CONFIGURER LE SERVICE

### 3.1 Définir le répertoire racine

1. Cliquez sur le nouveau service déployé
2. Allez dans **"Settings"**
3. Trouvez **"Root Directory"**
4. Entrez: `backend`
5. Cliquez **"Update"**

### 3.2 Configurer la commande de démarrage

1. Toujours dans **"Settings"**
2. Trouvez **"Start Command"**
3. Entrez: `node src/server.js`
4. Cliquez **"Update"**

---

## 🔐 ÉTAPE 4: VARIABLES D'ENVIRONNEMENT

### 4.1 Accéder aux variables

1. Dans votre service backend
2. Cliquez sur l'onglet **"Variables"**
3. Cliquez sur **"RAW Editor"**

### 4.2 Copier les variables

**Copiez-collez EXACTEMENT ceci:**

```
NODE_ENV=production
PORT=5000
DB_HOST=${{MySQL.RAILWAY_PRIVATE_DOMAIN}}
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
DB_SSL=false
JWT_SECRET=security_guard_secret_key_2024_very_secure
JWT_EXPIRES_IN=7d
SESSION_SECRET=BrO9YoRyMtAX21QSNWdbusZKGP6wz3geLmhFcCI4HTnV5jkJ7qUlEa0ipfDvx8
ENCRYPTION_KEY=12345678901234567890123456789012
FRONTEND_URL=https://temporary.vercel.app
SOCKET_CORS_ORIGIN=https://temporary.vercel.app
FACE_RECOGNITION_MODE=local
FACE_MATCH_THRESHOLD=0.45
FACE_DETECTION_CONFIDENCE=0.8
```

**✨ MAGIE:** Les variables `${{MySQL.XXX}}` se référencent automatiquement à votre base de données MySQL!

### 4.3 Sauvegarder

1. Cliquez **"Update Variables"**
2. Le service redémarrera automatiquement

---

## 🌐 ÉTAPE 5: EXPOSER LE SERVICE

### 5.1 Générer un domaine public

1. Retournez dans **"Settings"**
2. Trouvez la section **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway va créer un domaine: `xxx.up.railway.app`

### 5.2 Copier l'URL

**Copiez cette URL!** Vous en aurez besoin pour Vercel.

---

## ✅ ÉTAPE 6: VÉRIFICATION

### 6.1 Voir les logs

1. Cliquez sur l'onglet **"Deployments"**
2. Cliquez sur le déploiement actif
3. Vous verrez les logs en temps réel

### 6.2 Tester l'API

Ouvrez dans votre navigateur:
```
https://votre-service.up.railway.app/api
```

**✅ Si vous voyez une réponse JSON = SUCCESS!**

---

## 🎯 RÉCAPITULATIF

**Ce que vous avez maintenant:**

✅ Backend déployé sur Railway  
✅ Connexion directe à MySQL (même plateforme)  
✅ URL publique disponible  
✅ 100% Gratuit  
✅ Aucune carte requise  

**URL de votre backend:**
```
https://xxxxx.up.railway.app
```

---

## 🔄 PROCHAINE ÉTAPE

**Déployer le frontend sur Vercel!**

Vous aurez besoin de:
- ✅ L'URL de votre backend Railway (que vous venez d'obtenir)
- ✅ Votre dépôt GitHub (déjà prêt)

**Durée estimée: 3 minutes**

---

## 💡 ASTUCES

### Variables automatiques

Railway permet de référencer d'autres services:
- `${{MySQL.RAILWAY_PRIVATE_DOMAIN}}` = Domaine MySQL
- `${{MySQL.MYSQL_ROOT_PASSWORD}}` = Mot de passe MySQL
- Pas besoin de copier-coller manuellement!

### Déploiement automatique

Chaque fois que vous poussez sur GitHub:
1. Railway détecte automatiquement
2. Redéploie le backend
3. Aucune action manuelle requise!

### Voir l'utilisation

Dans Railway Dashboard:
- Voir les heures utilisées
- 500h/mois gratuit
- Largement suffisant pour votre projet

---

## 🔧 DÉPANNAGE

### Le build échoue

**Vérifiez:**
- ✅ Root Directory = `backend`
- ✅ Start Command = `node src/server.js`
- ✅ Variables d'environnement copiées

### Erreur de connexion MySQL

**Vérifiez:**
- ✅ `DB_HOST=${{MySQL.RAILWAY_PRIVATE_DOMAIN}}`
- ✅ `DB_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}`
- ✅ Les deux services sont dans le MÊME projet Railway

### Port déjà utilisé

**Pas de problème!**
Railway gère automatiquement le PORT.
La variable `PORT=5000` est juste une fallback.

---

**© 2026 SGM – Security Guard Management System**
