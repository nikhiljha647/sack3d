# Stripe Integration Installation Script
# Run this script to install Stripe dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ModelAR Stripe Integration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
Write-Host "Checking for npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Install Stripe dependencies
Write-Host "Installing Stripe dependencies..." -ForegroundColor Yellow
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Stripe dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a Stripe account at: https://stripe.com" -ForegroundColor White
Write-Host "2. Get your API keys from: https://dashboard.stripe.com/test/apikeys" -ForegroundColor White
Write-Host "3. Add keys to .env file:" -ForegroundColor White
Write-Host "   STRIPE_SECRET_KEY=sk_test_your_key" -ForegroundColor Gray
Write-Host "   STRIPE_PUBLISHABLE_KEY=pk_test_your_key" -ForegroundColor Gray
Write-Host "   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Enable India & UPI in Stripe Dashboard:" -ForegroundColor White
Write-Host "   Settings → Payment methods → Enable UPI" -ForegroundColor Gray
Write-Host "   Settings → Business settings → Set country to India" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Read the complete guide: STRIPE_INTEGRATION.md" -ForegroundColor White
Write-Host ""
Write-Host "✅ Installation complete! Ready to integrate payments." -ForegroundColor Green
Write-Host ""
