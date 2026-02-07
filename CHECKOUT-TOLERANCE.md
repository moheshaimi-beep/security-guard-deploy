# 🕐 FENÊTRES DE TEMPS - CHECK-OUT AVEC TOLÉRANCES

## 📋 RÈGLES MISES À JOUR

### ✅ **NOUVELLE LOGIQUE CHECK-OUT:**

**Avant (ancienne version):**
```
❌ Check-out: 5min avant fin → fin événement
⚠️ Problème 1: Agent ne peut pas partir 20min avant (urgence, maladie)
⚠️ Problème 2: Agent ne peut pas check-out après fin (prolongation, rangement)
```

**Après (nouvelle version):**
```
✅ Check-out: (fin - tolérance anticipé) → (fin + tolérance tardif)
🎯 Solution: Flexibilité départ anticipé ET tardif
```

---

## 🔢 EXEMPLES CONCRETS

### Exemple 1: Événement avec tolérances par défaut

```
Événement: "raja vs wac"
Horaire: 20:00 - 23:00
Tolérance départ anticipé: 30 minutes (earlyCheckoutTolerance)
Tolérance départ tardif: 15 minutes (lateCheckoutTolerance)

FENÊTRE CHECK-OUT:
├─ Début: 22:30 (23:00 - 30min)
└─ Fin:   23:15 (23:00 + 15min)

SCÉNARIOS:
✅ 22:29 → ❌ Trop tôt (avant 22:30)
✅ 22:30 → ✅ OK (départ anticipé accepté)
✅ 22:45 → ✅ OK (départ anticipé)
✅ 23:00 → ✅ OK (fin exacte événement)
✅ 23:10 → ✅ OK (prolongation acceptée)
✅ 23:15 → ✅ OK (limite tolérance tardif)
✅ 23:16 → ❌ Trop tard (tolérance dépassée)
```

### Exemple 2: Événement avec tolérances personnalisées

```
Événement: "Surveillance 8h Centre Commercial"
Horaire: 08:00 - 16:00
Tolérance départ anticipé: 60 minutes (1h)
Tolérance départ tardif: 30 minutes

FENÊTRE CHECK-OUT:
├─ Début: 15:00 (16:00 - 60min)
└─ Fin:   16:30 (16:00 + 30min)

SCÉNARIOS:
✅ 14:59 → ❌ Trop tôt
✅ 15:00 → ✅ OK (départ anticipé 1h accepté)
✅ 15:30 → ✅ OK (départ anticipé 30min)
✅ 16:00 → ✅ OK (fin normale)
✅ 16:20 → ✅ OK (prolongation - rangement)
✅ 16:30 → ✅ OK (limite)
✅ 16:31 → ❌ Trop tard
```

---

## 💡 CAS D'USAGE

### ✅ **Départ Anticipé (earlyCheckoutTolerance):**

**Pourquoi?**
1. 🏥 **Urgence médicale** → Agent malade, besoin de partir
2. 👨‍👩‍👧 **Urgence familiale** → Enfant malade, problème famille
3. 🚗 **Relève en avance** → Agent de remplacement arrive tôt
4. 📉 **Événement calme** → Pas besoin de tous les agents jusqu'à la fin
5. 🌧️ **Conditions météo** → Événement annulé/écourté

**Valeurs recommandées:**
- Événements courts (2-3h): `15-30 minutes`
- Événements longs (8h): `30-60 minutes`
- Événements flexibles: `60-90 minutes`

### ✅ **Départ Tardif (lateCheckoutTolerance):**

**Pourquoi?**
1. 📦 **Rangement matériel** → Démontage tentes, équipements
2. 📝 **Rapport de fin** → Rédaction compte-rendu
3. ⏰ **Prolongation événement** → Match prolongations, retard fin
4. 👥 **Foule résiduelle** → Attente évacuation public
5. 🚨 **Incident de dernière minute** → Gestion problème de fin

**Valeurs recommandées:**
- Événements stricts: `5-10 minutes`
- Événements standards: `15-30 minutes`
- Événements complexes: `30-60 minutes`

---

## 🔧 CONFIGURATION

### Backend - Base de données

Ajout de 2 nouveaux champs dans la table `events`:

```sql
-- Table events
ALTER TABLE events 
ADD COLUMN earlyCheckoutTolerance INT DEFAULT 30 COMMENT 'Tolérance départ anticipé (min)',
ADD COLUMN lateCheckoutTolerance INT DEFAULT 15 COMMENT 'Tolérance départ tardif (min)';
```

### Backend - Code

```javascript
// backend/src/utils/eventTimeWindows.js

const isCheckOutAllowed = (event) => {
  const now = new Date();
  const end = new Date(event.endDate);
  
  // Tolérance départ anticipé (défaut 30 min)
  const earlyCheckoutTolerance = event.earlyCheckoutTolerance || 30;
  const checkOutStart = new Date(end.getTime() - earlyCheckoutTolerance * 60 * 1000);
  
  // Tolérance départ tardif (défaut 15 min)
  const lateCheckoutTolerance = event.lateCheckoutTolerance || 15;
  const checkOutEnd = new Date(end.getTime() + lateCheckoutTolerance * 60 * 1000);
  
  // Check-out autorisé: (fin - tolérance anticipé) → (fin + tolérance tardif)
  return now >= checkOutStart && now <= checkOutEnd;
};
```

---

## 📊 COMPARAISON CHECK-IN VS CHECK-OUT

### Check-in (début événement)
```
Fenêtre: 2h avant → (début + tolérance retard)

Exemple (événement 20:00-23:00, tolérance 15min):
├─ Début: 18:00 (2h avant 20:00)
└─ Fin:   20:15 (20:00 + 15min retard)

Raison: Accepter les retardataires
```

### Check-out (fin événement)
```
Fenêtre: (fin - tolérance anticipé) → (fin + tolérance tardif)

Exemple (événement 20:00-23:00, tolérance 30min+15min):
├─ Début: 22:30 (23:00 - 30min anticipé)
└─ Fin:   23:15 (23:00 + 15min tardif)

Raison: Flexibilité départ + prolongation
```

---

## 🎯 MESSAGES D'ERREUR

### Avant la fenêtre (trop tôt)
```json
{
  "success": false,
  "code": "CHECKOUT_NOT_ALLOWED",
  "message": "Le check-out sera disponible de 30 min avant la fin (22:30) jusqu'à 15 min après la fin (23:15)."
}
```

### Après la fenêtre (tolérance dépassée)
```json
{
  "success": false,
  "code": "CHECKOUT_NOT_ALLOWED",
  "message": "Le délai de check-out est dépassé (tolérance de 15 minutes après la fin)."
}
```

### Pas encore disponible
```json
{
  "success": false,
  "code": "CHECKOUT_NOT_ALLOWED",
  "message": "Le check-out n'est pas encore disponible."
}
```

---

## 🔄 STATUTS ATTENDANCE

### Détection automatique des départs anticipés:

```javascript
const eventEnd = new Date(event.endDate);
const checkOutTime = new Date(attendance.checkOutTime);

if (checkOutTime < eventEnd) {
  attendance.status = 'early_departure'; // Départ anticipé
  
  // Calculer le temps d'anticipation
  const minutesEarly = (eventEnd - checkOutTime) / (1000 * 60);
  attendance.earlyDepartureMinutes = Math.round(minutesEarly);
}
```

### Statuts possibles:
- ✅ `present` → Check-in/out dans les temps normaux
- ⚠️ `early_departure` → Check-out avant fin événement
- ⏰ `late` → Check-in après début (mais dans tolérance)
- 📝 `overtime` → Check-out après fin (prolongation)

---

## 🧪 TESTS

### Test 1: Check-out départ anticipé (urgence)
```bash
# Événement 20:00-23:00, tolérance 30min
# Tentative check-out à 22:40 (20min avant fin)

✅ ATTENDU: Check-out réussi (22:40 dans fenêtre 22:30-23:15)
⚠️ MARQUÉ: Status = 'early_departure', earlyDepartureMinutes = 20
```

### Test 2: Check-out fin normale
```bash
# Événement 20:00-23:00
# Tentative check-out à 23:00 (fin exacte)

✅ ATTENDU: Check-out réussi
✅ MARQUÉ: Status = 'present' (normal)
```

### Test 3: Check-out prolongation (rangement)
```bash
# Événement 20:00-23:00, tolérance tardif 15min
# Tentative check-out à 23:10 (10min après fin)

✅ ATTENDU: Check-out réussi (23:10 < 23:15)
📝 MARQUÉ: Status = 'overtime', overtimeMinutes = 10
```

### Test 4: Check-out trop tard
```bash
# Événement 20:00-23:00, tolérance tardif 15min
# Tentative check-out à 23:20 (20min après fin)

❌ ATTENDU: Check-out refusé (23:20 > 23:15)
❌ CODE: CHECKOUT_NOT_ALLOWED
```

---

## 📱 INTERFACE UTILISATEUR

### Messages check-out

**22:20 (avant fenêtre):**
```
❌ Le check-out sera disponible de 30 min avant la fin (22:30) 
   jusqu'à 15 min après la fin (23:15).
```

**22:40 (départ anticipé):**
```
✅ Check-out autorisé (départ anticipé)
⚠️ Note: Départ 20 minutes avant la fin
```

**23:10 (prolongation):**
```
✅ Check-out autorisé (prolongation acceptée)
📝 Note: Départ 10 minutes après la fin
```

**23:20 (tolérance dépassée):**
```
❌ Le délai de check-out est dépassé (tolérance de 15 minutes 
   après la fin).
```

---

## 🚀 MIGRATION BASE DE DONNÉES

### Script SQL:

```sql
-- Ajouter les colonnes de tolérance check-out
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS earlyCheckoutTolerance INT DEFAULT 30 
  COMMENT 'Tolérance départ anticipé avant fin événement (minutes)',
ADD COLUMN IF NOT EXISTS lateCheckoutTolerance INT DEFAULT 15 
  COMMENT 'Tolérance départ tardif après fin événement (minutes)';

-- Ajouter colonnes tracking départ anticipé/tardif dans attendance
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS earlyDepartureMinutes INT 
  COMMENT 'Nombre de minutes de départ anticipé',
ADD COLUMN IF NOT EXISTS overtimeMinutes INT 
  COMMENT 'Nombre de minutes de prolongation après fin';

-- Mettre à jour événements existants avec valeurs par défaut
UPDATE events 
SET earlyCheckoutTolerance = 30, 
    lateCheckoutTolerance = 15
WHERE earlyCheckoutTolerance IS NULL 
   OR lateCheckoutTolerance IS NULL;
```

---

## 🎯 RECOMMANDATIONS PAR TYPE D'ÉVÉNEMENT

### Événements sportifs
```
earlyCheckoutTolerance: 15 min (match peut finir tôt)
lateCheckoutTolerance: 30 min (prolongations, nettoyage)
```

### Surveillance bureau/magasin
```
earlyCheckoutTolerance: 60 min (relève possible)
lateCheckoutTolerance: 30 min (fermeture, rapport)
```

### Événements publics (concerts, foires)
```
earlyCheckoutTolerance: 30 min (événement annulé)
lateCheckoutTolerance: 60 min (évacuation foule)
```

### Patrouilles fixes
```
earlyCheckoutTolerance: 5 min (très strict)
lateCheckoutTolerance: 5 min (rotation précise)
```

---

## 📊 TABLEAU RÉCAPITULATIF

| Type événement | Check-in | Check-out Début | Check-out Fin |
|----------------|----------|-----------------|---------------|
| Sport | -2h → +15min | -15min | +30min |
| Bureau 8h | -2h → +15min | -60min | +30min |
| Concert | -2h → +30min | -30min | +60min |
| Patrouille | -2h → +5min | -5min | +5min |

---

**Date de mise à jour:** 2026-02-07  
**Version:** 2.0 - Tolérances check-in ET check-out
