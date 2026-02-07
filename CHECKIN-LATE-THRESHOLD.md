# 🕐 FENÊTRES DE TEMPS - CHECK-IN AVEC TOLÉRANCE RETARD

## 📋 RÈGLES MISES À JOUR

### ✅ **NOUVELLE LOGIQUE CHECK-IN:**

**Avant (ancienne version):**
- ❌ Check-in: 2h avant → fin événement
- ⚠️ Problème: Agent en retard de 30min ne peut pas check-in si événement déjà terminé

**Après (nouvelle version):**
- ✅ Check-in: **2h avant → (début + tolérance retard)**
- 🎯 Solution: Agent peut check-in même s'il arrive en retard (dans la limite de la tolérance)

---

## 🔢 EXEMPLES CONCRETS

### Exemple 1: Événement avec tolérance 15 min (défaut)

```
Événement: "raja vs wac"
Horaire: 20:00 - 23:00
Tolérance retard: 15 minutes (lateThreshold)

FENÊTRE CHECK-IN:
├─ Début: 18:00 (2h avant 20:00)
└─ Fin:   20:15 (20:00 + 15min tolérance)

SCÉNARIOS:
✅ 17:59 → ❌ Trop tôt (avant 18:00)
✅ 18:00 → ✅ OK (fenêtre ouverte)
✅ 19:30 → ✅ OK (dans la fenêtre)
✅ 20:00 → ✅ OK (début événement)
✅ 20:10 → ✅ OK (retard accepté)
✅ 20:15 → ✅ OK (limite tolérance)
✅ 20:16 → ❌ Trop tard (tolérance dépassée)
```

### Exemple 2: Événement avec tolérance 30 min

```
Événement: "Surveillance Centre Commercial"
Horaire: 08:00 - 16:00
Tolérance retard: 30 minutes

FENÊTRE CHECK-IN:
├─ Début: 06:00 (2h avant 08:00)
└─ Fin:   08:30 (08:00 + 30min tolérance)

SCÉNARIOS:
✅ 05:59 → ❌ Trop tôt
✅ 06:00 → ✅ OK
✅ 08:00 → ✅ OK (à l'heure)
✅ 08:20 → ✅ OK (retard 20min, accepté)
✅ 08:30 → ✅ OK (retard 30min, limite)
✅ 08:31 → ❌ Trop tard (tolérance dépassée)
```

---

## 🔧 CONFIGURATION

### Backend - Base de données

Chaque événement a un champ `lateThreshold` (tolérance retard):

```sql
-- Table events
lateThreshold INT DEFAULT 15  -- En minutes
```

**Valeurs recommandées:**
- Événements courts (2-3h): `15 minutes`
- Événements longs (8h+): `30 minutes`
- Événements stricts: `5 minutes`

### Backend - Code

```javascript
// backend/src/utils/eventTimeWindows.js

const isCheckInAllowed = (event) => {
  const now = new Date();
  const start = new Date(event.startDate);
  
  // Fenêtre de check-in
  const preWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000); // -2h
  const lateThreshold = event.lateThreshold || 15; // Défaut 15min
  const checkInEnd = new Date(start.getTime() + lateThreshold * 60 * 1000); // +tolérance
  
  // Check-in autorisé: 2h avant → début + tolérance
  return now >= preWindowStart && now <= checkInEnd;
};
```

---

## 📊 AUTRES FENÊTRES (INCHANGÉES)

### Check-out
```
Fenêtre: 5 min avant fin → fin événement

Exemple (événement 20:00-23:00):
├─ Début: 22:55 (5min avant 23:00)
└─ Fin:   23:00 (fin événement)
```

### Tracking GPS
```
Fenêtre: 2h avant → fin événement

Exemple (événement 20:00-23:00):
├─ Début: 18:00 (2h avant 20:00)
└─ Fin:   23:00 (fin événement)
```

---

## 🎯 MESSAGES D'ERREUR

### Avant la fenêtre (trop tôt)
```json
{
  "success": false,
  "code": "CHECKIN_NOT_ALLOWED",
  "message": "Le check-in sera disponible de 2h avant le début (18:00) jusqu'à 15 min après le début (20:15)."
}
```

### Après la fenêtre (tolérance dépassée)
```json
{
  "success": false,
  "code": "CHECKIN_NOT_ALLOWED",
  "message": "Le délai de check-in est dépassé (tolérance de 15 minutes après le début)."
}
```

### Événement terminé
```json
{
  "success": false,
  "code": "CHECKIN_NOT_ALLOWED",
  "message": "L'événement est terminé. Le check-in n'est plus disponible."
}
```

---

## 🔄 IMPACT SUR LE SYSTÈME

### ✅ Avantages:
1. **Flexibilité pour agents en retard** → Peuvent encore check-in
2. **Réduction absences injustifiées** → Retard ≠ absence
3. **Meilleure tracking précision** → Même agents retardataires sont trackés
4. **Respect tolérance métier** → Configurée par événement

### ⚠️ Points d'attention:
1. **Check-in tardif ≠ à l'heure** → L'heure réelle est enregistrée
2. **Tolérance variable** → Peut être différente par événement
3. **Retard marqué** → Le système sait si agent en retard (checkInTime vs startDate)

---

## 📱 INTERFACE UTILISATEUR

### Login Page - Message

**Avant 18:00:**
```
❌ Le check-in pour l'événement "raja vs wac" sera disponible 
   2 heures avant le début (18:00) jusqu'à 15 min après 
   le début (20:15). Il reste 2h30min.
```

**20:10 (retard 10min):**
```
✅ Check-in autorisé (retard accepté)
⚠️ Note: Vous êtes en retard de 10 minutes
```

**20:20 (tolérance dépassée):**
```
❌ Le délai de check-in est dépassé (tolérance de 15 minutes 
   après le début).
```

---

## 🧪 TESTS

### Test 1: Check-in à l'heure
```bash
# Événement 20:00-23:00, tolérance 15min
# Tentative à 19:00 (1h avant)

✅ ATTENDU: Check-in réussi (dans fenêtre 18:00-20:15)
```

### Test 2: Check-in en retard (tolérance OK)
```bash
# Événement 20:00-23:00, tolérance 15min
# Tentative à 20:10 (retard 10min)

✅ ATTENDU: Check-in réussi (20:10 < 20:15)
⚠️ MARQUÉ: Agent en retard de 10 minutes
```

### Test 3: Check-in retard dépassé
```bash
# Événement 20:00-23:00, tolérance 15min
# Tentative à 20:20 (retard 20min)

❌ ATTENDU: Check-in refusé (20:20 > 20:15)
❌ CODE: CHECKIN_NOT_ALLOWED
```

---

## 🚀 DÉPLOIEMENT

### Fichiers modifiés:
1. ✅ `backend/src/utils/eventTimeWindows.js`
2. ✅ `backend/src/controllers/authController.js`
3. ✅ `backend/src/controllers/attendanceController.js`

### Commandes:
```bash
git add .
git commit -m "feat: Check-in avec tolérance retard (lateThreshold)

- Check-in: 2h avant → début + tolérance retard
- Support lateThreshold par événement (défaut 15min)
- Messages détaillés avec horaires exacts
- Validation stricte fenêtre temporelle"

git push origin main
```

### Vérification:
1. Render auto-deploy (~3min)
2. Logs: `✅ Check-in window: 2h before → start + lateThreshold`
3. Test: Login CIN avec événement dans 1h → OK
4. Test: Login CIN retard 10min (tolérance 15min) → OK
5. Test: Login CIN retard 20min (tolérance 15min) → ❌

---

**Date de mise à jour:** 2026-02-07  
**Version:** 2.0 - Tolérance retard check-in
