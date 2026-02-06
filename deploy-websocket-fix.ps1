#!/usr/bin/env pwsh
# 🚀 Script de déploiement WebSocket Fix pour Render

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 WEBSOCKET FIX - DÉPLOIEMENT RENDER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier les fichiers modifiés
Write-Host "📋 1. Vérification des fichiers modifiés..." -ForegroundColor Yellow
Write-Host ""

$modifiedFiles = @(
    "backend/src/server.js",
    "web-dashboard/src/pages/RealTimeTracking.jsx",
    "WEBSOCKET-FIX-GUIDE.md"
)

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (non trouvé)" -ForegroundColor Red
    }
}

Write-Host ""

# 2. Vérifier les variables d'environnement
Write-Host "📋 2. Vérification des variables d'environnement..." -ForegroundColor Yellow
Write-Host ""

$envFile = "web-dashboard\.env.production"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    Write-Host "  📄 Contenu de .env.production:" -ForegroundColor Cyan
    foreach ($line in $envContent) {
        Write-Host "    $line" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ .env.production non trouvé!" -ForegroundColor Red
}

Write-Host ""

# 3. Afficher les changements principaux
Write-Host "📋 3. Résumé des changements WebSocket:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend (server.js):" -ForegroundColor Cyan
Write-Host "    ✅ CORS wildcard pour .onrender.com et .vercel.app" -ForegroundColor Green
Write-Host "    ✅ pingTimeout: 60000ms (60s)" -ForegroundColor Green
Write-Host "    ✅ pingInterval: 25000ms (25s)" -ForegroundColor Green
Write-Host "    ✅ connectTimeout: 60000ms (60s)" -ForegroundColor Green
Write-Host "    ✅ Fallback polling activé" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend (RealTimeTracking.jsx):" -ForegroundColor Cyan
Write-Host "    ✅ reconnectionAttempts: Infinity" -ForegroundColor Green
Write-Host "    ✅ timeout: 20000ms (20s)" -ForegroundColor Green
Write-Host "    ✅ Auto-reconnexion avec re-auth" -ForegroundColor Green
Write-Host "    ✅ Bouton reconnexion manuelle" -ForegroundColor Green
Write-Host "    ✅ Événements reconnect_* gérés" -ForegroundColor Green
Write-Host ""

# 4. Git status
Write-Host "📋 4. Git Status:" -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""

# 5. Proposer le commit
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
$response = Read-Host "Voulez-vous commiter et pousser ces changements? (o/n)"

if ($response -eq "o" -or $response -eq "O" -or $response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🔧 Git Add..." -ForegroundColor Yellow
    git add backend/src/server.js
    git add web-dashboard/src/pages/RealTimeTracking.jsx
    git add WEBSOCKET-FIX-GUIDE.md
    
    Write-Host "📝 Git Commit..." -ForegroundColor Yellow
    $commitMessage = @"
🔧 Fix: WebSocket connection failures on Render

Backend improvements:
- Increase Socket.IO timeouts (pingTimeout: 60s, connectTimeout: 60s)
- Add CORS wildcard for .onrender.com and .vercel.app domains
- Enable WebSocket + Polling fallback transport
- Improve connection resilience for Render free tier

Frontend improvements:
- Infinite reconnection attempts with exponential backoff
- Auto re-authentication on reconnect
- Manual reconnect button when disconnected
- Better error logging and status display
- Handle all reconnection events (reconnect_attempt, reconnect, reconnect_error)

Documentation:
- Add comprehensive WebSocket troubleshooting guide
- Include Render deployment checklist
- Add monitoring and testing procedures

Fixes: WebSocket connection to 'wss://security-guard-backend.onrender.com' closed before establishment
"@
    
    git commit -m $commitMessage
    
    Write-Host "🚀 Git Push..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  ✅ DÉPLOIEMENT TERMINÉ!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Attendre le déploiement Render (3-5 minutes)" -ForegroundColor White
    Write-Host "   👉 https://dashboard.render.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Vérifier les logs backend sur Render:" -ForegroundColor White
    Write-Host "   Chercher: '✅ Socket.IO Service initialisé'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Tester le frontend:" -ForegroundColor White
    Write-Host "   👉 https://security-guard-web.onrender.com/tracking" -ForegroundColor Cyan
    Write-Host "   Console doit afficher: '✅ Socket.IO Tracking connecté'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Tester la reconnexion:" -ForegroundColor White
    Write-Host "   - Couper le réseau 30s" -ForegroundColor Gray
    Write-Host "   - Vérifier indicateur passe à 🔴" -ForegroundColor Gray
    Write-Host "   - Rétablir réseau" -ForegroundColor Gray
    Write-Host "   - Doit se reconnecter automatiquement en <10s" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📖 Documentation complète:" -ForegroundColor Yellow
    Write-Host "   👉 WEBSOCKET-FIX-GUIDE.md" -ForegroundColor Cyan
    Write-Host ""
    
    # Ouvrir le guide
    $openGuide = Read-Host "Voulez-vous ouvrir le guide de troubleshooting? (o/n)"
    if ($openGuide -eq "o" -or $openGuide -eq "O") {
        code WEBSOCKET-FIX-GUIDE.md
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vous pouvez commiter manuellement avec:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Cyan
    Write-Host "  git commit -m 'Fix WebSocket connection issues'" -ForegroundColor Cyan
    Write-Host "  git push origin main" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Script terminé" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
