# ✅ SACK3D MilesWeb Deployment Checklist (https://sack3d.com/)

Production deployment checklist for SACK3D on MilesWeb hosting (VPS or cPanel).

---

## 📋 Before You Start

### MilesWeb Hosting Requirements
- [ ] MilesWeb hosting account (VPS/Cloud recommended or cPanel with Node.js support)
- [ ] SSH / SFTP access enabled
- [ ] MySQL database access (phpMyAdmin or CLI)
- [ ] Domain name pointed: `sack3d.com` and `www.sack3d.com`
- [ ] SSL certificate (Let's Encrypt / AutoSSL via Certbot or cPanel)

### Local Preparation
- [ ] Dependencies verified: `npm install`
- [ ] Production build verified: `npm run build`
- [ ] Deployment package created: `.\deploy-milesweb.ps1`
- [ ] Existing uploads preserved: `sack3d-uploads-backup.zip` generated

---

## 🚀 Deployment Steps

### Phase 1: Create Deployment Packages (Local)

Run in PowerShell:
```powershell
cd E:\react\sack3d
.\deploy-milesweb.ps1
```

**Output artifacts:**
- [ ] `sack3d-production.zip` (Code release: `server/`, `dist/`, `public/`, `package.json`, `ecosystem.config.js`, `sack.sql`)
- [ ] `sack3d-uploads-backup.zip` (Archive of all existing `.glb` models and thumbnails)
- [ ] Generated strong JWT Secret (saved securely)

---

### Phase 2: Upload Files to Server

#### Using FileZilla / WinSCP / SFTP
- [ ] Connect via SFTP (port 22) or cPanel File Manager
- [ ] Upload `sack3d-production.zip` to destination folder (e.g., `/home/sack3d/` or `public_html/`)
- [ ] Upload `sack3d-uploads-backup.zip` directly to the same server directory

#### Extract on Server
```bash
# Example VPS path:
mkdir -p /home/sack3d
mv sack3d-production.zip /home/sack3d/
mv sack3d-uploads-backup.zip /home/sack3d/
cd /home/sack3d
unzip sack3d-production.zip

# Extract existing uploads to public/uploads/
unzip sack3d-uploads-backup.zip -d public/uploads/
```

- [ ] Directory structure verified:
  ```
  /home/sack3d/
  ├── server/
  ├── dist/
  ├── public/
  │   ├── uploads/
  │   │   └── models/   (All .glb files and thumbnails preserved)
  │   ├── qr/
  │   └── models/
  ├── package.json
  ├── ecosystem.config.js
  ├── sack.sql
  └── .env.template
  ```

---

### Phase 3: Database Setup

#### Create MySQL Database
**Via cPanel:**
1. Open **cPanel > MySQL Databases**.
2. Create database: `sack3d_sack` (or your chosen prefix).
3. Create user: `sack3d_user` with a strong password.
4. Add user to database and grant **ALL PRIVILEGES**.

**Via VPS CLI:**
```bash
mysql -u root -p
CREATE DATABASE sack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sack_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON sack.* TO 'sack_user'@'localhost';
FLUSH PRIVILEGES;
exit;
```

#### Import Database Schema & Seeds
**Via phpMyAdmin:**
- Select your database and click **Import**.
- Upload `sack.sql`.
- *Note for cPanel*: If `sack.sql` contains `CREATE DATABASE sack;`, comment those lines out or select the database directly.

**Via CLI:**
```bash
mysql -u sack_user -p sack < sack.sql
```

- [ ] Schema imported successfully
- [ ] Tables verified (`SHOW TABLES;` shows `users`, `models`, `subscription_plans`, etc.)

---

### Phase 4: Configure Environment Variables

```bash
cd /home/sack3d
cp .env.template .env
nano .env
```

**Fill in the production values:**
```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# CORS Allowed Origins
ALLOWED_ORIGINS=https://sack3d.com,https://www.sack3d.com

# Database (MilesWeb MySQL)
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name

# Set to true if schema is already imported via sack.sql
SKIP_SEEDS=false

# JWT Authentication (Never prefix with VITE_)
JWT_SECRET=your_generated_64_character_secret

# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Domain URLs
FRONTEND_URL=https://sack3d.com
BASE_URL=https://sack3d.com

# 3D Model Upload Limit (in MB)
MAX_UPLOAD_SIZE_MB=100

# Client bundle (leave empty for same-domain relative /api/... requests)
VITE_API_URL=
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

### Phase 5: Install Production Dependencies & Start

```bash
cd /home/sack3d
npm install --omit=dev
```

#### Start with PM2 (VPS / Cloud)
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### Alternative: cPanel "Setup Node.js App"
1. In cPanel, click **Setup Node.js App**.
2. Click **Create Application**.
3. Node.js version: **20.x** (or highest available).
4. Application root: `/home/user/sack3d`.
5. Application startup file: `server/server.js`.
6. Click **Run NPM Install**, then click **Start App**.

---

### Phase 6: Configure Web Server (Nginx on VPS)

```nginx
server {
    server_name sack3d.com www.sack3d.com;

    # Allow up to 100MB uploads for 3D GLB/CAD files
    client_max_body_size 100M;

    # Static uploads (direct high-speed delivery)
    location /uploads/ {
        alias /home/sack3d/public/uploads/;
        add_header Access-Control-Allow-Origin *;
        add_header Accept-Ranges bytes;
        expires 7d;
        try_files $uri =404;
    }

    # API and Webhooks reverse proxy to Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Compiled React frontend
    location / {
        root /home/sack3d/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Phase 7: SSL & Verification

1. **Obtain SSL**:
   ```bash
   sudo certbot --nginx -d sack3d.com -d www.sack3d.com
   ```
2. **Verify Endpoints**:
   - Health check: `https://sack3d.com/api/health`
   - Homepage: `https://sack3d.com/`
   - 3D Viewer & WebAR: `https://sack3d.com/explore`
   - Stripe Webhook: `https://sack3d.com/api/webhooks/stripe`
