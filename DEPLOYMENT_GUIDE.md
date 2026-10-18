# 🚀 SACK3D Deployment Guide for MilesWeb

## Pre-Deployment Checklist

### ✅ Local Preparation

- [ ] All features tested locally
- [ ] Database contains production data
- [ ] Uploaded 3D models preserved (664MB)
- [ ] Stripe test mode working
- [ ] No errors in development

### ✅ MilesWeb Requirements

- [ ] VPS or Cloud hosting plan (NOT shared hosting)
- [ ] Node.js v18+ support
- [ ] SSH/Terminal access
- [ ] MySQL database access
- [ ] Domain: sack3d.com pointing to server IP

---

## Step 1: Prepare Local Environment

### 1.1 Build Production Frontend

```powershell
# Set environment variables for build
$env:NODE_ENV="production"
$env:VITE_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_KEY"
$env:VITE_API_URL=""

# Build optimized frontend
npm run build:production
```

**Verify build:**
```powershell
# Should see dist/ folder with:
# - index.html
# - assets/ (with fingerprinted JS/CSS)
dir dist
```

### 1.2 Export Database

```powershell
# Export MySQL database
mysqldump -u root -p sack > sack_production_backup.sql

# Verify export
Get-Content sack_production_backup.sql | Select-Object -First 20
```

### 1.3 Archive Uploads

```powershell
# Create archive of uploaded models
Compress-Archive -Path "public\uploads" -DestinationPath "sack3d_uploads.zip" -Force

# Verify size
(Get-Item "sack3d_uploads.zip").Length / 1MB
# Should be ~664MB compressed
```

### 1.4 Create Deployment Package

```powershell
# Create deployment directory
New-Item -ItemType Directory -Force -Path "deploy"

# Copy essential files
Copy-Item -Path "dist" -Destination "deploy\dist" -Recurse
Copy-Item -Path "server" -Destination "deploy\server" -Recurse
Copy-Item -Path "public" -Destination "deploy\public" -Recurse -Exclude "uploads"
Copy-Item -Path "package.json" -Destination "deploy\"
Copy-Item -Path "package-lock.json" -Destination "deploy\"
Copy-Item -Path "ecosystem.config.cjs" -Destination "deploy\"
Copy-Item -Path ".env.production" -Destination "deploy\.env.template"

# Create production README
@"
# SACK3D Production Deployment

## Setup Instructions

1. Install dependencies:
   npm install --production

2. Configure environment:
   cp .env.template .env
   nano .env
   # Fill in all values

3. Import database:
   mysql -u sack3d_user -p sack3d_db < ../sack_production_backup.sql

4. Extract uploads:
   unzip ../sack3d_uploads.zip -d public/

5. Start with PM2:
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup

6. Configure Nginx/Apache (see documentation)

## Health Check
curl http://localhost:5000/health
"@ | Out-File -FilePath "deploy\README.md" -Encoding UTF8

# Create final archive
Compress-Archive -Path "deploy\*" -DestinationPath "sack3d_production.zip" -Force

Write-Host "✅ Deployment package created: sack3d_production.zip" -ForegroundColor Green
```

---

## Step 2: MilesWeb Server Setup

### 2.1 Connect via SSH

```bash
ssh your_username@sack3d.com
# Or use the IP provided by MilesWeb
ssh your_username@123.45.67.89
```

### 2.2 Install Node.js (if not installed)

```bash
# Check current version
node --version

# If not installed or old version, install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x
npm --version
```

### 2.3 Install PM2

```bash
sudo npm install -g pm2

# Verify
pm2 --version
```

### 2.4 Install Nginx (if using Nginx)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 3: Upload Files

### 3.1 Upload via SFTP

Using **FileZilla** or **WinSCP**:

1. Connect to: `sftp://sack3d.com` (port 22)
2. Username/Password: From MilesWeb
3. Upload to: `/home/your_username/`

**Files to upload:**
- `sack3d_production.zip`
- `sack_production_backup.sql`
- `sack3d_uploads.zip`

### 3.2 Extract on Server

```bash
# Navigate to home directory
cd ~

# Create application directory
mkdir -p sack3d
cd sack3d

# Extract deployment package
unzip ~/sack3d_production.zip

# Verify structure
ls -la
# Should see: dist/ server/ public/ package.json ecosystem.config.cjs
```

---

## Step 4: Database Setup

### 4.1 Create Database (via cPanel)

1. Login to MilesWeb cPanel
2. **MySQL Databases** → **Create New Database**
   - Database Name: `sack3d_db`
   - Click "Create Database"

3. **MySQL Databases** → **MySQL Users** → **Add New User**
   - Username: `sack3d_user`
   - Password: Generate strong password
   - Click "Create User"

4. **Add User to Database**
   - User: `sack3d_user`
   - Database: `sack3d_db`
   - Privileges: **ALL PRIVILEGES**
   - Click "Make Changes"

5. **Note credentials** - you'll need them for `.env`

### 4.2 Import Database

**Via cPanel phpMyAdmin:**
1. cPanel → **phpMyAdmin**
2. Select database: `sack3d_db`
3. **Import** tab
4. Choose file: `sack_production_backup.sql`
5. Click "Go"
6. Wait for import to complete

**Via SSH (faster for large databases):**
```bash
cd ~
mysql -u sack3d_user -p sack3d_db < sack_production_backup.sql
# Enter password when prompted
```

### 4.3 Verify Import

```bash
mysql -u sack3d_user -p sack3d_db -e "SHOW TABLES;"
# Should see ~20 tables

mysql -u sack3d_user -p sack3d_db -e "SELECT COUNT(*) as total_users FROM users;"
# Should show your user count

mysql -u sack3d_user -p sack3d_db -e "SELECT COUNT(*) as total_models FROM models;"
# Should show your model count (22)
```

---

## Step 5: Configure Environment

### 5.1 Create .env File

```bash
cd ~/sack3d
cp .env.template .env
nano .env
```

### 5.2 Fill in Production Values

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
TRUST_PROXY=1

FRONTEND_URL=https://sack3d.com
BASE_URL=https://sack3d.com
ALLOWED_ORIGINS=https://sack3d.com,https://www.sack3d.com

DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=sack3d_user
DB_PASSWORD=<paste_your_database_password>
DB_NAME=sack3d_db
DB_CONNECTION_LIMIT=15

# Generate JWT secret
JWT_SECRET=<paste_generated_secret>

# Stripe LIVE keys
STRIPE_SECRET_KEY=sk_live_<your_key>
STRIPE_PUBLISHABLE_KEY=pk_live_<your_key>
STRIPE_WEBHOOK_SECRET=whsec_<your_key>

MAX_UPLOAD_SIZE_MB=100
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_<your_key>
VITE_API_URL=
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output to JWT_SECRET
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 5.3 Secure .env File

```bash
chmod 600 .env
# Prevents other users from reading secrets
```

---

## Step 6: Extract Uploads

```bash
cd ~/sack3d

# Extract uploaded models
unzip ~/sack3d_uploads.zip -d public/

# Verify
ls -lh public/uploads/models/
# Should see 22 .glb files

# Set proper permissions
chmod -R 755 public/uploads/
chmod -R 755 public/qr/
```

---

## Step 7: Install Dependencies

```bash
cd ~/sack3d

# Install production dependencies
npm install --production

# This may take 3-5 minutes
# Should complete without errors
```

---

## Step 8: Test Backend

### 8.1 Test Run

```bash
cd ~/sack3d
NODE_ENV=production node server/server.js
```

**Expected output:**
```
====================================================
🚀 SACK3D Backend API Server running
📡 Port: 5000 | Host: 0.0.0.0
📡 Mode: production
📡 URL: http://0.0.0.0:5000
📡 Max Upload: 100MB
====================================================
```

**Test health endpoint:**
```bash
# Open another SSH session
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "platform": "SACK3D Platform",
  "environment": "production",
  "database": "healthy",
  "uploads_storage": "writable",
  ...
}
```

**If working, press `Ctrl+C` to stop**

---

## Step 9: Start with PM2

### 9.1 Start Application

```bash
cd ~/sack3d
pm2 start ecosystem.config.cjs
```

**Expected output:**
```
[PM2] Applying action restartProcessId on app [sack3d](ids: [ 0 ])
[PM2] [sack3d](0) ✓
```

### 9.2 Check Status

```bash
pm2 status
```

**Expected:**
```
┌─────┬──────────┬─────────┬──────┬────────┬
│ id  │ name     │ status  │ cpu  │ memory │
├─────┼──────────┼─────────┼──────┼────────┼
│ 0   │ sack3d   │ online  │ 0%   │ 50.0mb │
└─────┴──────────┴─────────┴──────┴────────┴
```

### 9.3 View Logs

```bash
pm2 logs sack3d
# Press Ctrl+C to exit logs
```

### 9.4 Save PM2 Configuration

```bash
pm2 save

# Configure PM2 to start on system boot
pm2 startup
# Copy and run the command it shows
```

---

## Step 10: Configure Web Server

### Option A: Nginx (Recommended)

#### 10.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/sack3d.com
```

**Paste this configuration:**

```nginx
# HTTP (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name sack3d.com www.sack3d.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sack3d.com www.sack3d.com;

    # SSL Certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/sack3d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sack3d.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 100M;

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout for large uploads
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Proxy health check
    location /health {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }

    # Proxy uploads (3D models)
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        
        # CORS for 3D models
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Accept-Ranges bytes;
    }

    # Proxy QR codes
    location /qr/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin "*" always;
    }

    # Proxy models library
    location /models/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        add_header Access-Control-Allow-Origin "*" always;
    }

    # Serve React frontend (static files)
    location / {
        root /home/your_username/sack3d/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Never cache index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

**Replace `/home/your_username/` with your actual path!**

#### 10.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/sack3d.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Expected: "syntax is ok" and "test is successful"

# Reload Nginx
sudo systemctl reload nginx
```

### Option B: Apache (If MilesWeb uses Apache)

Your `.htaccess` file is already configured in `public/.htaccess`.

**Apache Virtual Host:**
```bash
sudo nano /etc/apache2/sites-available/sack3d.com.conf
```

```apache
<VirtualHost *:443>
    ServerName sack3d.com
    ServerAlias www.sack3d.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/sack3d.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/sack3d.com/privkey.pem

    # Proxy API to Node.js
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
    ProxyPass /uploads http://localhost:5000/uploads
    ProxyPassReverse /uploads http://localhost:5000/uploads
    ProxyPass /qr http://localhost:5000/qr
    ProxyPassReverse /qr http://localhost:5000/qr
    ProxyPass /health http://localhost:5000/health
    ProxyPassReverse /health http://localhost:5000/health

    # Serve React frontend
    DocumentRoot /home/your_username/sack3d/dist
    <Directory /home/your_username/sack3d/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
# Enable required modules
sudo a2enmod proxy proxy_http ssl rewrite headers

# Enable site
sudo a2ensite sack3d.com

# Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## Step 11: SSL Certificate

### 11.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
# Or for Apache: python3-certbot-apache
```

### 11.2 Get SSL Certificate

```bash
# For Nginx
sudo certbot --nginx -d sack3d.com -d www.sack3d.com

# For Apache
sudo certbot --apache -d sack3d.com -d www.sack3d.com
```

**Follow prompts:**
1. Enter email address
2. Agree to terms
3. Choose: **Redirect HTTP to HTTPS** (recommended)

### 11.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 12: Configure Stripe Webhooks

### 12.1 Get Production Webhook URL

Your webhook endpoint: `https://sack3d.com/api/webhooks/stripe`

### 12.2 Create Webhook in Stripe

1. Go to: https://dashboard.stripe.com
2. **Switch to LIVE mode** (toggle in top left)
3. **Developers** → **Webhooks** → **Add endpoint**
4. Endpoint URL: `https://sack3d.com/api/webhooks/stripe`
5. **Select events to listen to:**
   - ☑️ `checkout.session.completed`
   - ☑️ `customer.subscription.updated`
   - ☑️ `customer.subscription.deleted`
   - ☑️ `invoice.payment_succeeded`
   - ☑️ `invoice.payment_failed`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_...`)

### 12.3 Update Environment

```bash
cd ~/sack3d
nano .env

# Update:
STRIPE_WEBHOOK_SECRET=whsec_<paste_your_signing_secret>

# Save and restart
pm2 restart sack3d
```

---

## Step 13: Final Testing

### 13.1 Test Endpoints

```bash
# Health check
curl https://sack3d.com/health

# Frontend
curl https://sack3d.com

# API
curl https://sack3d.com/api/public/categories

# 3D Model (use actual filename)
curl -I https://sack3d.com/uploads/models/file-xxx.glb
```

### 13.2 Test in Browser

1. **Homepage**: https://sack3d.com
   - ✅ Should load React app
   - ✅ No console errors

2. **Authentication**:
   - ✅ Register new account
   - ✅ Login works
   - ✅ Dashboard accessible

3. **3D Models**:
   - ✅ Model listing loads
   - ✅ 3D viewer renders
   - ✅ Upload new model works

4. **Payment** (IMPORTANT - Test with ₹1 first!):
   - ✅ Pricing page loads
   - ✅ Click "Subscribe"
   - ✅ Redirects to Stripe
   - ✅ Complete payment
   - ✅ Webhook fires
   - ✅ Plan updates in database
   - ✅ Refund test transaction

---

## Step 14: Monitoring & Maintenance

### 14.1 PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs sack3d

# Monitor CPU/Memory
pm2 monit

# Restart if needed
pm2 restart sack3d

# Stop
pm2 stop sack3d

# Delete
pm2 delete sack3d
```

### 14.2 Check Disk Space

```bash
df -h
# Ensure enough space for uploads
```

### 14.3 Backup Database

```bash
# Create backup
mysqldump -u sack3d_user -p sack3d_db > ~/backups/sack3d_$(date +%Y%m%d).sql

# Automate with cron
crontab -e

# Add daily backup at 2 AM:
0 2 * * * mysqldump -u sack3d_user -pYOUR_PASSWORD sack3d_db > ~/backups/sack3d_$(date +\%Y\%m\%d).sql
```

### 14.4 Backup Uploads

```bash
# Archive uploads
cd ~/sack3d/public
tar -czf ~/backups/uploads_$(date +%Y%m%d).tar.gz uploads/
```

---

## Troubleshooting

### Issue: PM2 shows "errored" status

```bash
pm2 logs sack3d
# Check for errors

# Common fixes:
pm2 restart sack3d
pm2 delete sack3d
pm2 start ecosystem.config.cjs
```

### Issue: Database connection failed

```bash
# Test MySQL connection
mysql -u sack3d_user -p sack3d_db -e "SELECT 1"

# Check .env file
cat .env | grep DB_
```

### Issue: 502 Bad Gateway

```bash
# Check if Node.js is running
pm2 status

# Check if Node.js is listening
sudo netstat -tulpn | grep :5000

# Restart PM2
pm2 restart sack3d
```

### Issue: Upload fails

```bash
# Check disk space
df -h

# Check permissions
ls -la ~/sack3d/public/uploads/

# Fix permissions
chmod -R 755 ~/sack3d/public/uploads/
```

### Issue: SSL certificate not working

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Post-Deployment Checklist

- [ ] ✅ Application accessible at https://sack3d.com
- [ ] ✅ SSL certificate active (green padlock)
- [ ] ✅ Health check returns "ok"
- [ ] ✅ Database connected
- [ ] ✅ Login/Register works
- [ ] ✅ Model upload works
- [ ] ✅ 3D viewer renders
- [ ] ✅ Stripe payment tested (₹1 transaction + refund)
- [ ] ✅ Webhooks working (plan updates)
- [ ] ✅ PM2 saved and startup configured
- [ ] ✅ Database backup scheduled
- [ ] ✅ Monitoring active
- [ ] ✅ Logs accessible

---

## Support Contacts

- **MilesWeb Support**: support@milesweb.com | +91-120-6025102
- **Stripe Support**: https://support.stripe.com
- **Server Admin**: your_email@domain.com

---

**Deployment Time Estimate:** 2-3 hours
**Monthly Cost:** ₹649-1,299 (~$8-16) + Stripe fees (2% per transaction)

🎉 **Your SACK3D application is now live!**
