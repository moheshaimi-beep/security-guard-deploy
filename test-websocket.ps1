#!/usr/bin/env pwsh
# 🧪 Script de test WebSocket Connection

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧪 TEST WEBSOCKET CONNECTION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$env:FORCE_COLOR = "1"

# Configuration
$BACKEND_URL = "http://localhost:5000"
$SOCKET_URL = "http://localhost:5000"
$TEST_TIMEOUT = 30

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Backend URL: $BACKEND_URL" -ForegroundColor Cyan
Write-Host "  Socket URL: $SOCKET_URL" -ForegroundColor Cyan
Write-Host "  Timeout: ${TEST_TIMEOUT}s" -ForegroundColor Cyan
Write-Host ""

# 1. Test Backend Health
Write-Host "1️⃣  Test Backend Health Endpoint..." -ForegroundColor Yellow
Write-Host ""

try {
    $healthResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/health" -Method Get -TimeoutSec 5
    Write-Host "  ✅ Backend is healthy" -ForegroundColor Green
    Write-Host "     Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "     Message: $($healthResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend is not responding!" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Assurez-vous que le backend est démarré:" -ForegroundColor Yellow
    Write-Host "   cd backend && npm start" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""

# 2. Test Socket.IO Endpoint
Write-Host "2️⃣  Test Socket.IO Endpoint..." -ForegroundColor Yellow
Write-Host ""

try {
    $socketResponse = Invoke-WebRequest -Uri "$SOCKET_URL/socket.io/?EIO=4&transport=polling" -Method Get -TimeoutSec 5
    if ($socketResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Socket.IO endpoint is accessible" -ForegroundColor Green
        Write-Host "     Status: $($socketResponse.StatusCode)" -ForegroundColor Gray
        $content = $socketResponse.Content
        if ($content -match '"sid":"([^"]+)"') {
            $sid = $matches[1]
            Write-Host "     Session ID: $sid" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ Socket.IO endpoint not accessible!" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Vérifier les processus Node.js
Write-Host "3️⃣  Vérification des processus Node.js..." -ForegroundColor Yellow
Write-Host ""

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  ✅ Processus Node.js trouvés:" -ForegroundColor Green
    foreach ($proc in $nodeProcesses) {
        Write-Host "     PID: $($proc.Id) | CPU: $([math]::Round($proc.CPU, 2))s | Memory: $([math]::Round($proc.WorkingSet64/1MB, 2))MB" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️  Aucun processus Node.js trouvé" -ForegroundColor Yellow
}

Write-Host ""

# 4. Créer un script de test client Socket.IO
Write-Host "4️⃣  Génération du script de test client..." -ForegroundColor Yellow
Write-Host ""

$testClientScript = @'
const io = require('socket.io-client');

console.log('🔌 Connexion à Socket.IO...');
console.log('URL:', process.argv[2] || 'http://localhost:5000');

const socket = io(process.argv[2] || 'http://localhost:5000', {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 10000
});

let testsPassed = 0;
let testsFailed = 0;

socket.on('connect', () => {
  console.log('✅ Socket.IO connecté!');
  console.log('   ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
  testsPassed++;
  
  // Test 1: Ping
  console.log('\n📡 Test 1: Ping...');
  socket.emit('ping');
});

socket.on('pong', (data) => {
  console.log('✅ Test 1: Pong reçu');
  console.log('   Timestamp:', data.timestamp);
  console.log('   Latency:', Date.now() - data.timestamp, 'ms');
  testsPassed++;
  
  // Test 2: Authentication
  console.log('\n🔐 Test 2: Authentication...');
  socket.emit('auth', {
    userId: 'test-user-id',
    role: 'admin',
    eventId: null
  });
});

socket.on('auth:success', (data) => {
  console.log('✅ Test 2: Authentification réussie');
  console.log('   User ID:', data.userId);
  console.log('   Role:', data.role);
  testsPassed++;
  
  // Tous les tests passés
  setTimeout(() => {
    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Résultats: ${testsPassed} tests réussis, ${testsFailed} tests échoués`);
    console.log('═══════════════════════════════════════\n');
    socket.disconnect();
    process.exit(testsFailed > 0 ? 1 : 0);
  }, 1000);
});

socket.on('auth:error', (error) => {
  console.log('❌ Test 2: Erreur authentification');
  console.log('   Message:', error.message);
  testsFailed++;
});

socket.on('disconnect', (reason) => {
  console.log('🔴 Déconnecté:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erreur de connexion:', error.message);
  testsFailed++;
  setTimeout(() => {
    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Résultats: ${testsPassed} tests réussis, ${testsFailed} tests échoués`);
    console.log('═══════════════════════════════════════\n');
    process.exit(1);
  }, 2000);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Tentative de reconnexion ${attemptNumber}...`);
});

// Timeout global
setTimeout(() => {
  if (!socket.connected) {
    console.error('\n❌ TIMEOUT: Impossible de se connecter après 30s');
    testsFailed++;
    socket.disconnect();
    process.exit(1);
  }
}, 30000);
'@

$testClientScript | Out-File -FilePath "test-socket-client.js" -Encoding UTF8
Write-Host "  ✅ Script créé: test-socket-client.js" -ForegroundColor Green

Write-Host ""

# 5. Exécuter le test client
Write-Host "5️⃣  Exécution du test client Socket.IO..." -ForegroundColor Yellow
Write-Host ""
Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray

try {
    # Vérifier si socket.io-client est installé
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        node test-socket-client.js $SOCKET_URL
        $exitCode = $LASTEXITCODE
        
        Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host ""
        
        if ($exitCode -eq 0) {
            Write-Host "✅ TOUS LES TESTS SONT PASSÉS!" -ForegroundColor Green
        } else {
            Write-Host "❌ CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  Impossible d'exécuter le test - socket.io-client non installé" -ForegroundColor Yellow
        Write-Host "   Installez avec: npm install socket.io-client" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erreur lors de l'exécution du test:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 6. Résumé et recommandations
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 RÉSUMÉ ET RECOMMANDATIONS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checklist avant déploiement:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend:" -ForegroundColor Cyan
Write-Host "    ☐ Backend démarre sans erreur (npm start)" -ForegroundColor White
Write-Host "    ☐ Health endpoint accessible (/api/health)" -ForegroundColor White
Write-Host "    ☐ Socket.IO Service initialisé" -ForegroundColor White
Write-Host "    ☐ CORS configuré pour production" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend:" -ForegroundColor Cyan
Write-Host "    ☐ Frontend démarre sans erreur (npm start)" -ForegroundColor White
Write-Host "    ☐ REACT_APP_SOCKET_URL défini" -ForegroundColor White
Write-Host "    ☐ Connexion Socket.IO établie" -ForegroundColor White
Write-Host "    ☐ Indicateur 🟢 Temps réel actif visible" -ForegroundColor White
Write-Host ""
Write-Host "  Tests:" -ForegroundColor Cyan
Write-Host "    ☐ Connexion initiale réussie" -ForegroundColor White
Write-Host "    ☐ Authentification fonctionne" -ForegroundColor White
Write-Host "    ☐ Reconnexion automatique testée" -ForegroundColor White
Write-Host "    ☐ Positions GPS reçues en temps réel" -ForegroundColor White
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   👉 WEBSOCKET-FIX-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Déploiement:" -ForegroundColor Yellow
Write-Host "   👉 .\deploy-websocket-fix.ps1" -ForegroundColor Cyan
Write-Host ""

# Cleanup
if (Test-Path "test-socket-client.js") {
    $cleanup = Read-Host "Supprimer test-socket-client.js? (o/n)"
    if ($cleanup -eq "o" -or $cleanup -eq "O") {
        Remove-Item "test-socket-client.js"
        Write-Host "✅ test-socket-client.js supprimé" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Script terminé" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
