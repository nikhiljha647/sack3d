# ModelAR Production Deployment Helper Script
# This script helps prepare your application for deployment

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ModelAR Production Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if git is initialized
Write-Host "1. Checking Git repository..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "   ❌ Git not initialized. Initializing..." -ForegroundColor Red
    git init
    Write-Host "   ✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "   ✅ Git repository found" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check for .gitignore
Write-Host "2. Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "   ✅ .gitignore exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .gitignore not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Install dependencies
Write-Host "3. Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Build frontend
Write-Host "4. Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Check dist folder
Write-Host "5. Verifying build output..." -ForegroundColor Yellow
if (Test-Path "dist/index.html") {
    Write-Host "   ✅ Build output verified" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build output not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Generate JWT secret
Write-Host "6. Generating JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "   📋 Your JWT Secret (save this!):" -ForegroundColor Cyan
Write-Host "   $jwtSecret" -ForegroundColor White
Write-Host ""

# Step 7: Deployment checklist
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create Railway account: https://railway.app" -ForegroundColor White
Write-Host "2. Push code to GitHub" -ForegroundColor White
Write-Host "3. Connect Railway to your GitHub repo" -ForegroundColor White
Write-Host "4. Add MySQL database in Railway" -ForegroundColor White
Write-Host "5. Configure environment variables:" -ForegroundColor White
Write-Host "   - NODE_ENV=production" -ForegroundColor Gray
Write-Host "   - Database credentials from Railway MySQL" -ForegroundColor Gray
Write-Host "   - JWT_SECRET (shown above)" -ForegroundColor Gray
Write-Host "   - Stripe live keys" -ForegroundColor Gray
Write-Host "   - FRONTEND_URL from Railway" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Deploy!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Full guide: See DEPLOYMENT_CHECKLIST.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Build ready for deployment!" -ForegroundColor Green
Write-Host ""
