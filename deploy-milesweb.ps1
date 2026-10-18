# SACK3D Deployment Package Creator for MilesWeb
# This script creates a production-ready package for MilesWeb (VPS or cPanel)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SACK3D MilesWeb Deployment Package" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "1. Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "   [OK] Cleaned dist folder" -ForegroundColor Green
}
if (Test-Path "deploy-package") {
    Remove-Item -Path "deploy-package" -Recurse -Force
    Write-Host "   [OK] Cleaned deploy-package folder" -ForegroundColor Green
}
Write-Host ""

# Step 2: Install dependencies
Write-Host "2. Verifying dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Build frontend
Write-Host "3. Building production frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Create deployment package
Write-Host "4. Creating deployment package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path ".\deploy-package" | Out-Null

# Copy essential files
Copy-Item -Path ".\server" -Destination ".\deploy-package\server" -Recurse
Copy-Item -Path ".\dist" -Destination ".\deploy-package\dist" -Recurse
Copy-Item -Path ".\public" -Destination ".\deploy-package\public" -Recurse -Exclude "uploads"
Copy-Item -Path ".\package.json" -Destination ".\deploy-package\"
Copy-Item -Path ".\.env.production.example" -Destination ".\deploy-package\.env.example"
Copy-Item -Path ".\sack.sql" -Destination ".\deploy-package\"
if (Test-Path ".\ecosystem.config.cjs") {
    Copy-Item -Path ".\ecosystem.config.cjs" -Destination ".\deploy-package\"
}

# Create empty uploads and logs directory structure in release
New-Item -ItemType Directory -Force -Path ".\deploy-package\public\uploads\models" | Out-Null
New-Item -ItemType Directory -Force -Path ".\deploy-package\public\qr" | Out-Null
New-Item -ItemType Directory -Force -Path ".\deploy-package\public\models" | Out-Null
New-Item -ItemType Directory -Force -Path ".\deploy-package\logs" | Out-Null

Write-Host "   [OK] Code files staged" -ForegroundColor Green
Write-Host ""

# Step 5: Archive existing uploads separately to preserve models and thumbnails
Write-Host "5. Archiving existing 3D models and uploads..." -ForegroundColor Yellow
if (Test-Path ".\public\uploads\models") {
    if (Test-Path "sack3d-uploads-backup.zip") {
        Remove-Item "sack3d-uploads-backup.zip" -Force
    }
    Compress-Archive -Path ".\public\uploads\*" -DestinationPath ".\sack3d-uploads-backup.zip" -Force
    Write-Host "   [OK] Existing uploads archived to sack3d-uploads-backup.zip" -ForegroundColor Green
}
Write-Host ""

# Step 6: Create ecosystem.config.cjs for PM2
Write-Host "6. Creating PM2 configuration..." -ForegroundColor Yellow
$pm2Lines = @(
  "module.exports = {",
  "  apps: [{",
  "    name: 'sack3d',",
  "    script: './server/server.js',",
  "    instances: 1,",
  "    exec_mode: 'fork',",
  "    env: {",
  "      NODE_ENV: 'production',",
  "      PORT: 5000,",
  "      HOST: '0.0.0.0'",
  "    },",
  "    error_file: './logs/err.log',",
  "    out_file: './logs/out.log',",
  "    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',",
  "    max_memory_restart: '1G',",
  "    node_args: '--max-old-space-size=2048'",
  "  }]",
  "};"
)
$pm2Config = $pm2Lines -join "`r`n"
$pm2Config | Out-File -FilePath ".\deploy-package\ecosystem.config.cjs" -Encoding UTF8
Write-Host "   [OK] PM2 config created: ecosystem.config.cjs" -ForegroundColor Green
Write-Host ""

# Step 7: Create production .env template
Write-Host "7. Creating environment template..." -ForegroundColor Yellow
Copy-Item -Path ".\.env.production.example" -Destination ".\deploy-package\.env.template"
Write-Host "   [OK] Environment template created" -ForegroundColor Green
Write-Host ""

# Step 8: Create deployment zip
Write-Host "8. Creating deployment zip..." -ForegroundColor Yellow
if (Test-Path "sack3d-production.zip") {
    Remove-Item "sack3d-production.zip" -Force
}
Compress-Archive -Path ".\deploy-package\*" -DestinationPath ".\sack3d-production.zip" -Force
Write-Host "   [OK] Deployment package created: sack3d-production.zip" -ForegroundColor Green
Write-Host ""

# Step 9: Generate JWT Secret
Write-Host "9. Generating production JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "   [KEY] Your JWT Secret (save this!):" -ForegroundColor Cyan
Write-Host "   $jwtSecret" -ForegroundColor White
Write-Host ""

# Display summary
Write-Host "============================================" -ForegroundColor Green
Write-Host "  [OK] SACK3D Packages Ready for MilesWeb!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: sack3d-production.zip" -ForegroundColor Yellow
if (Test-Path "sack3d-uploads-backup.zip") {
    Write-Host "Uploads Archive: sack3d-uploads-backup.zip" -ForegroundColor Yellow
}
Write-Host "Production Domain: https://sack3d.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready for deployment to MilesWeb!" -ForegroundColor Green
