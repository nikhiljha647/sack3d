# SACK3D Deployment Preparation Script for MilesWeb
# Run this script on your local Windows machine before uploading to MilesWeb

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "SACK3D MilesWeb Deployment Prep" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "[1/6] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✓ Removed old dist folder" -ForegroundColor Green
}

# Step 2: Build frontend for production
Write-Host ""
Write-Host "[2/6] Building frontend for production..." -ForegroundColor Yellow
npm run build:production
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed. Please check errors above." -ForegroundColor Red
    exit 1
}

# Step 3: Export database
Write-Host ""
Write-Host "[3/6] Exporting MySQL database..." -ForegroundColor Yellow
Write-Host "Enter MySQL root password when prompted:" -ForegroundColor Cyan

$dbExportPath = "sack_production_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
mysqldump -u root -p sack > $dbExportPath

if (Test-Path $dbExportPath) {
    $dbSize = (Get-Item $dbExportPath).Length / 1MB
    Write-Host "✓ Database exported: $dbExportPath ($([math]::Round($dbSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "✗ Database export failed" -ForegroundColor Red
    exit 1
}

# Step 4: Archive uploads
Write-Host ""
Write-Host "[4/6] Archiving uploaded models..." -ForegroundColor Yellow
$uploadsPath = "public\uploads"
$uploadsArchive = "sack3d_uploads_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"

if (Test-Path $uploadsPath) {
    Compress-Archive -Path $uploadsPath -DestinationPath $uploadsArchive -Force
    $uploadsSize = (Get-Item $uploadsArchive).Length / 1MB
    Write-Host "✓ Uploads archived: $uploadsArchive ($([math]::Round($uploadsSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "⚠ No uploads folder found - skipping" -ForegroundColor Yellow
}

# Step 5: Create deployment package
Write-Host ""
Write-Host "[5/6] Creating deployment package..." -ForegroundColor Yellow

$deploymentFiles = @(
    "dist",
    "server",
    "public/.htaccess",
    "public/favicon.svg",
    "public/icons.svg",
    "public/images",
    "package.json",
    "package-lock.json",
    "ecosystem.config.cjs",
    ".env.production"
)

$deploymentFolder = "sack3d_deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $deploymentFolder -Force | Out-Null

foreach ($file in $deploymentFiles) {
    if (Test-Path $file) {
        $destination = Join-Path $deploymentFolder $file
        $destinationDir = Split-Path $destination -Parent
        
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        
        Copy-Item -Path $file -Destination $destination -Recurse -Force
    }
}

Write-Host "✓ Deployment package created: $deploymentFolder" -ForegroundColor Green

# Step 6: Generate deployment instructions
Write-Host ""
Write-Host "[6/6] Generating deployment checklist..." -ForegroundColor Yellow

$checklist = @"
=================================================================
SACK3D MILESWEB DEPLOYMENT CHECKLIST
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
=================================================================

✓ COMPLETED ON LOCAL MACHINE:
  [✓] Frontend built (check dist/ folder)
  [✓] Database exported: $dbExportPath
  [✓] Uploads archived: $uploadsArchive
  [✓] Deployment package: $deploymentFolder

□ NEXT STEPS ON MILESWEB:

  1. PROVISION SERVER
     □ Log into MilesWeb control panel
     □ Ensure Node.js v18+ is available
     □ Verify SSH access is enabled
     □ Note your server IP address: _______________

  2. UPLOAD FILES VIA SFTP
     □ Connect to: sftp://your-server-ip
     □ Upload folder: $deploymentFolder/* to ~/sack3d/
     □ Upload: $uploadsArchive
     □ Upload: $dbExportPath

  3. SETUP DATABASE
     □ Log into cPanel → MySQL Databases
     □ Create database: sack3d_db
     □ Create user: sack3d_user
     □ Set strong password: _______________
     □ Grant ALL PRIVILEGES to sack3d_user on sack3d_db
     □ Note database host: _______________ (usually 'localhost')

  4. IMPORT DATABASE
     □ Go to phpMyAdmin
     □ Select database: sack3d_db
     □ Click Import → Choose file: $dbExportPath
     □ Click Go
     □ Verify tables imported (should see ~20 tables)

  5. SSH INTO SERVER
     □ SSH command: ssh username@your-server-ip
     □ Navigate: cd ~/sack3d
     □ Extract uploads: unzip $uploadsArchive
     □ Move uploads: mv uploads/* public/uploads/

  6. CONFIGURE ENVIRONMENT
     □ Rename: mv .env.production .env
     □ Edit: nano .env
     □ Update DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
     □ Generate JWT_SECRET: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     □ Add Stripe live keys (sk_live_..., pk_live_...)
     □ Set FRONTEND_URL=https://sack3d.com
     □ Save and exit (Ctrl+O, Enter, Ctrl+X)

  7. INSTALL DEPENDENCIES
     □ Run: npm install --production
     □ Verify no errors

  8. START APPLICATION
     □ Install PM2 globally: npm install -g pm2
     □ Start app: pm2 start ecosystem.config.cjs
     □ Check status: pm2 status
     □ View logs: pm2 logs sack3d
     □ Enable startup: pm2 startup
     □ Save config: pm2 save

  9. CONFIGURE WEB SERVER (Apache/Nginx)
     □ Create virtual host for sack3d.com
     □ Proxy port 5000 to domain
     □ Sample Apache config:
       <VirtualHost *:80>
           ServerName sack3d.com
           ProxyPass / http://localhost:5000/
           ProxyPassReverse / http://localhost:5000/
       </VirtualHost>
     □ Restart Apache: sudo systemctl restart apache2

 10. SETUP SSL CERTIFICATE
     □ Install Certbot: sudo apt install certbot python3-certbot-apache
     □ Get certificate: sudo certbot --apache -d sack3d.com -d www.sack3d.com
     □ Auto-renewal: sudo certbot renew --dry-run

 11. CONFIGURE STRIPE WEBHOOK
     □ Go to Stripe Dashboard → Webhooks
     □ Add endpoint: https://sack3d.com/api/webhooks/stripe
     □ Select events: payment_intent.succeeded, checkout.session.completed
     □ Copy webhook signing secret (whsec_...)
     □ Add to .env: STRIPE_WEBHOOK_SECRET=whsec_...
     □ Restart PM2: pm2 restart sack3d

 12. FINAL TESTING
     □ Visit: https://sack3d.com
     □ Test: User registration
     □ Test: Login/logout
     □ Test: Model upload
     □ Test: 3D viewer
     □ Test: Payment (Creator plan ₹299)
     □ Test: Plan upgrade confirmation
     □ Check: PM2 logs for errors
     □ Monitor: Server resources (CPU, RAM, disk)

=================================================================
IMPORTANT NOTES:
=================================================================

DATABASE CREDENTIALS:
- Host: _______________ (from cPanel)
- Database: sack3d_db
- User: sack3d_user
- Password: _______________ (you created)

JWT SECRET:
- Generate on server: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

STRIPE KEYS (from dashboard.stripe.com):
- Secret Key: sk_live_...
- Publishable Key: pk_live_...
- Webhook Secret: whsec_...

SUPPORT:
- MilesWeb support: support@milesweb.com
- Documentation: DEPLOYMENT_GUIDE.md
- Troubleshooting: DEPLOYMENT_SUMMARY.md

=================================================================
"@

$checklistFile = "DEPLOYMENT_CHECKLIST_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$checklist | Out-File -FilePath $checklistFile -Encoding UTF8

Write-Host "✓ Checklist saved: $checklistFile" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "PREPARATION COMPLETE!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Yellow
Write-Host "  1. $deploymentFolder/ - Upload this entire folder" -ForegroundColor White
Write-Host "  2. $dbExportPath - Database backup" -ForegroundColor White
Write-Host "  3. $uploadsArchive - Uploaded models" -ForegroundColor White
Write-Host "  4. $checklistFile - Step-by-step checklist" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open $checklistFile" -ForegroundColor White
Write-Host "  2. Follow each step carefully" -ForegroundColor White
Write-Host "  3. Upload files to MilesWeb via SFTP" -ForegroundColor White
Write-Host ""
Write-Host "Need help? Check DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
