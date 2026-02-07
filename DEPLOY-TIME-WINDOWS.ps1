# Script de déploiement automatique - Gestion fenêtres temporelles
# Déploie les modifications vers GitHub → Render (auto-deploy)

Write-Host "🚀 DÉPLOIEMENT - GESTION FENÊTRES DE TEMPS" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Vérifier si on est dans le bon répertoire
if (-not (Test-Path "backend/src/server.js")) {
    Write-Host "❌ Erreur: Exécutez ce script depuis la racine du projet" -ForegroundColor Red
    Write-Host "   cd C:\Users\Home\Documents\GitHub\security-guard-deploy" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Fichiers modifiés à déployer:" -ForegroundColor Green
Write-Host "   1. backend/src/controllers/authController.js" -ForegroundColor Gray
Write-Host "   2. backend/src/controllers/attendanceController.js" -ForegroundColor Gray
Write-Host "   3. backend/src/services/socketIOService.js" -ForegroundColor Gray
Write-Host "   4. backend/src/scheduler.js" -ForegroundColor Gray
Write-Host "   5. backend/src/server.js" -ForegroundColor Gray
Write-Host "   6. web-dashboard/src/pages/CheckInLogin.jsx" -ForegroundColor Gray
Write-Host "   7. Documentation (TIME_WINDOW_RULES.md, etc.)" -ForegroundColor Gray
Write-Host ""

# Vérifier le statut Git
Write-Host "🔍 Vérification du statut Git..." -ForegroundColor Cyan
git status --short

Write-Host ""
$confirmation = Read-Host "Voulez-vous continuer le déploiement ? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📦 Ajout des fichiers modifiés..." -ForegroundColor Cyan

# Ajouter les fichiers modifiés
git add backend/src/controllers/authController.js
git add backend/src/controllers/attendanceController.js
git add backend/src/services/socketIOService.js
git add backend/src/scheduler.js
git add backend/src/server.js
git add web-dashboard/src/pages/CheckInLogin.jsx
git add TIME_WINDOW_RULES.md
git add IMPLEMENTATION_SUMMARY.md
git add DEPLOY-TIME-WINDOWS.md

Write-Host "✅ Fichiers ajoutés" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "💾 Création du commit..." -ForegroundColor Cyan
$commitMessage = @"
feat: Gestion fenêtres temporelles check-in/check-out et temps réel

- Blocage login CIN si hors fenêtre (2h avant → fin)
- Validation check-in (2h avant → fin événement)
- Validation check-out (5min avant fin → fin événement)
- Contrôle temps réel Socket.IO (2h avant → fin)
- CRON auto-déconnexion toutes les 10min
- Messages détaillés avec horaires
- Codes erreur: OUTSIDE_TIME_WINDOW, CHECKIN_NOT_ALLOWED, CHECKOUT_NOT_ALLOWED

Optimisation serveur: réduction 60-80% charge WebSocket
"@

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit créé avec succès" -ForegroundColor Green
} else {
    Write-Host "⚠️  Aucun changement à commiter ou erreur" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Push vers GitHub..." -ForegroundColor Cyan

# Push vers GitHub
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push réussi vers GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Render va redéployer automatiquement dans ~2-5 minutes" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Vérifiez le déploiement:" -ForegroundColor Yellow
    Write-Host "   1. https://dashboard.render.com/ → Events" -ForegroundColor Gray
    Write-Host "   2. Attendez 'Deploy succeeded'" -ForegroundColor Gray
    Write-Host "   3. Vérifiez les logs: 'Scheduler mis à jour avec Socket.IO'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🧪 Tests post-déploiement:" -ForegroundColor Yellow
    Write-Host "   - Login CIN avec événement futur → Message de blocage" -ForegroundColor Gray
    Write-Host "   - Check-in hors fenêtre → Erreur 403" -ForegroundColor Gray
    Write-Host "   - Logs CRON toutes les 10min" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 Documentation complète:" -ForegroundColor Yellow
    Write-Host "   - TIME_WINDOW_RULES.md" -ForegroundColor Gray
    Write-Host "   - IMPLEMENTATION_SUMMARY.md" -ForegroundColor Gray
    Write-Host "   - DEPLOY-TIME-WINDOWS.md" -ForegroundColor Gray
} else {
    Write-Host "❌ Erreur lors du push" -ForegroundColor Red
    Write-Host "   Vérifiez vos credentials Git" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "✅ DÉPLOIEMENT TERMINÉ!" -ForegroundColor Green
Write-Host ""
