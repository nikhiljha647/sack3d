import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const maxUploadMb = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10);

import { queryOne } from './config/db.js';
import { runSeeds } from './config/seed.js';
import authRoutes from './routes/auth.js';
import modelRoutes from './routes/models.js';
import galleryRoutes from './routes/galleries.js';
import walletRoutes from './routes/wallet.js';
import planRoutes from './routes/plans.js';
import teamRoutes from './routes/team.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import webhookRoutes from './routes/webhooks.js';

import { securityHeaders } from './middleware/security.js';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable reverse-proxy trust for MilesWeb / cPanel (Nginx / Apache / Passenger)
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Run database seed check (preserves existing production data)
runSeeds().catch(err => console.error('[Seed Error]:', err.message));

// Middlewares
app.use(securityHeaders);

// Dynamic CORS configuration
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  ...configuredOrigins,
  process.env.FRONTEND_URL,
  process.env.BASE_URL,
  'https://sack3d.com',
  'https://www.sack3d.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProd || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow external embeds for 3D viewers and WebAR
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Production Logging
const logsDir = path.resolve(__dirname, '../logs');
if (isProd) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
    accessLogStream.on('error', (err) => console.error('[Logging Stream Error]:', err.message));
    app.use(morgan('combined', { stream: accessLogStream }));
    app.use(morgan('combined'));
  } catch (e) {
    console.warn('[Logging Stream Warning] File logging unavailable, falling back to stdout:', e.message);
    app.use(morgan('combined'));
  }
} else {
  app.use(morgan('dev'));
}

// IMPORTANT: Webhook route MUST be before express.json() 
// Stripe needs raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// JSON & URL-encoded parsing with hosting-configurable limits
app.use(express.json({ limit: `${maxUploadMb}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${maxUploadMb}mb` }));

// Static file directories (supports both full-stack repo and standalone API deployment)
const customUploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null;
const basePublicDir = customUploadDir || (fs.existsSync(path.resolve(__dirname, '../public'))
  ? path.resolve(__dirname, '../public')
  : path.resolve(__dirname, './public'));

const uploadDir = customUploadDir || path.join(basePublicDir, 'uploads');
const modelsUploadDir = path.join(uploadDir, 'models');
const qrDir = path.join(basePublicDir, 'qr');
const modelsDir = path.join(basePublicDir, 'models');

[basePublicDir, uploadDir, modelsUploadDir, qrDir, modelsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Static asset options for 3D GLB/GLTF models, QR codes, and thumbnails
const staticAssetOptions = {
  maxAge: isProd ? '7d' : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    } else if (filePath.endsWith('.gltf')) {
      res.setHeader('Content-Type', 'model/gltf+json');
    } else if (filePath.endsWith('.obj')) {
      res.setHeader('Content-Type', 'text/plain');
    } else if (filePath.endsWith('.stl')) {
      res.setHeader('Content-Type', 'model/stl');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Accept-Ranges', 'bytes');
  }
};

app.use(express.static(basePublicDir, staticAssetOptions));
app.use('/uploads', express.static(uploadDir, staticAssetOptions));
app.use('/qr', express.static(qrDir, staticAssetOptions));
app.use('/models', express.static(modelsDir, staticAssetOptions));

// Health check endpoint with database ping, uploads storage access & memory statistics
const healthHandler = async (req, res) => {
  let dbStatus = 'healthy';
  try {
    await queryOne('SELECT 1 as alive');
  } catch (err) {
    dbStatus = `unreachable: ${err.message}`;
  }

  let storageStatus = 'writable';
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
  } catch (err) {
    storageStatus = `restricted: ${err.message}`;
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus === 'healthy';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    platform: 'SACK3D Platform',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    uploads_storage: storageStatus,
    uptime_seconds: Math.round(process.uptime()),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    },
    node_version: process.version,
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Serve compiled React frontend in production (dist directory)
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: isProd ? '1d' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        // Prevent browser caching of index.html so releases update immediately
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // SPA fallback for client-side routing (Express 5 safe)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/qr') ||
      req.path.startsWith('/models') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `Uploaded file exceeds the maximum allowed limit (${maxUploadMb}MB).`,
      code: 'LIMIT_FILE_SIZE'
    });
  }
  console.error('[API Error]:', err);
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProduction && status === 500 ? 'An unexpected internal error occurred.' : (err.message || 'Internal Server Error'),
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Process-level exception handling for production reliability
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', new Date().toISOString(), err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', new Date().toISOString(), reason);
});

// Start HTTP server with upload timeouts (supports hosting-assigned sockets/ports and local dev)
const isNamedPipeOrSocket = typeof PORT === 'string' && (PORT.startsWith('/') || PORT.startsWith('\\\\.\\pipe\\') || isNaN(Number(PORT)));
const server = isNamedPipeOrSocket || !process.env.HOST
  ? app.listen(PORT, () => logServerStarted(PORT, isNamedPipeOrSocket ? 'socket/pipe' : (HOST || 'default')))
  : app.listen(PORT, HOST, () => logServerStarted(PORT, HOST));

// Configure timeouts for 3D model uploads
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function logServerStarted(port, host) {
  console.log(`====================================================`);
  console.log(`🚀 SACK3D Backend API Server running`);
  console.log(`📡 Port: ${port} | Host: ${host}`);
  console.log(`📡 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 URL: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(`📡 Max Upload: ${maxUploadMb}MB`);
  console.log(`====================================================`);
}

// Graceful termination support
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, closing HTTP server gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

