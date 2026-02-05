# ============================================================
#   SCRIPT: CONVERTIR .env POUR RENDER.COM
# ============================================================
# Ce script lit votre fichier .env et génère le format
# pour ajouter toutes les variables sur Render.com
# ============================================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "   CONVERTIR .env POUR RENDER.COM" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

# Chemin du fichier .env
$envFile = "backend\.env"

# Vérifier si le fichier existe
if (-not (Test-Path $envFile)) {
    Write-Host "ERREUR: Fichier .env introuvable dans backend/" -ForegroundColor Red
    Write-Host "Chemin attendu: $envFile`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Lecture du fichier: $envFile`n" -ForegroundColor Green

# Variables à adapter pour la production
$productionOverrides = @{
    "NODE_ENV" = "production"
    "DB_HOST" = "[COPIER_DEPUIS_RAILWAY]"
    "DB_USER" = "root"
    "DB_PASSWORD" = "[COPIER_DEPUIS_RAILWAY]"
    "DB_NAME" = "railway"
    "DB_SSL" = "false"
    "FRONTEND_URL" = "https://temporary.vercel.app"
    "SOCKET_CORS_ORIGIN" = "https://temporary.vercel.app"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   FORMAT POUR RENDER.COM (Copier-Coller)" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Dans Render.com, section 'Environment Variables'" -ForegroundColor White
Write-Host "2. Cliquez sur 'Add from .env'" -ForegroundColor White
Write-Host "3. COPIEZ TOUT LE CONTENU CI-DESSOUS:" -ForegroundColor White
Write-Host "4. COLLEZ dans le champ Render`n" -ForegroundColor White

Write-Host "============================================================" -ForegroundColor DarkGray
Write-Host "# DEBUT DU CONTENU A COPIER" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor DarkGray

# Lire et traiter le fichier .env
$output = @()
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    
    # Ignorer les lignes vides et commentaires
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Appliquer les overrides pour la production
            if ($productionOverrides.ContainsKey($key)) {
                $value = $productionOverrides[$key]
                Write-Host "$key=$value" -ForegroundColor Yellow
            } else {
                Write-Host "$key=$value" -ForegroundColor Cyan
            }
            
            $output += "$key=$value"
        }
    }
}

Write-Host "`n============================================================" -ForegroundColor DarkGray
Write-Host "# FIN DU CONTENU A COPIER" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor DarkGray

Write-Host "NOTES IMPORTANTES:" -ForegroundColor Yellow
Write-Host "   Les valeurs en JAUNE doivent etre modifiees:" -ForegroundColor White
Write-Host "   - DB_HOST: Copier depuis Railway" -ForegroundColor Red
Write-Host "   - DB_PASSWORD: Copier depuis Railway" -ForegroundColor Red
Write-Host "   - FRONTEND_URL: A mettre a jour apres Vercel`n" -ForegroundColor Red

Write-Host "VARIABLES DE SECURITE:" -ForegroundColor Yellow
Write-Host "   Vous devriez generer de nouvelles cles pour:" -ForegroundColor White
Write-Host "   - JWT_SECRET" -ForegroundColor Cyan
Write-Host "   - ENCRYPTION_KEY`n" -ForegroundColor Cyan

Write-Host "Pour generer des cles fortes, executez:" -ForegroundColor Green
Write-Host '   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})' -ForegroundColor White
Write-Host ""

# Sauvegarder dans un fichier pour faciliter le copier-coller
$outputFile = "render-env-variables.txt"
$output | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "============================================================" -ForegroundColor Green
Write-Host "   FICHIER GENERE!" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Green

Write-Host "Les variables ont ete sauvegardees dans:" -ForegroundColor Cyan
Write-Host "   $outputFile`n" -ForegroundColor White

Write-Host "Vous pouvez:" -ForegroundColor Yellow
Write-Host "   1. Ouvrir le fichier $outputFile" -ForegroundColor White
Write-Host "   2. Copier tout le contenu" -ForegroundColor White
Write-Host "   3. Coller dans Render.com > Add from .env`n" -ForegroundColor White

Write-Host "============================================================`n" -ForegroundColor Cyan

# Option pour copier dans le presse-papier
Write-Host "Voulez-vous copier dans le presse-papier? (O/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq "O" -or $response -eq "o" -or $response -eq "OUI" -or $response -eq "oui") {
    $output -join "`n" | Set-Clipboard
    Write-Host "`nCOPIE! Collez maintenant dans Render.com (Ctrl+V)`n" -ForegroundColor Green
} else {
    Write-Host "`nOuvrez le fichier $outputFile pour copier manuellement.`n" -ForegroundColor Cyan
}

Write-Host "============================================================`n" -ForegroundColor Cyan
