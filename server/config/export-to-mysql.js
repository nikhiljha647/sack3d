import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/modelar.db');
const db = new Database(dbPath);

const tables = [
  'subscription_plans',
  'coin_packages',
  'users',
  'businesses',
  'workspaces',
  'team_members',
  'subscriptions',
  'wallets',
  'coin_transactions',
  'payments',
  'galleries',
  'categories',
  'models',
  'model_files',
  'model_versions',
  'model_revisions',
  'qr_codes',
  'ar_sessions',
  'model_analytics',
  'tags',
  'model_tags',
  'notifications',
  'platform_settings'
];

let sqlOutput = `-- ModelAR MySQL Database Schema & Seed Dump
-- Target Database: sack
-- Generated for MySQL 8.x / MariaDB / phpMyAdmin

CREATE DATABASE IF NOT EXISTS \`sack\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`sack\`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Subscription Plans
DROP TABLE IF EXISTS \`subscription_plans\`;
CREATE TABLE \`subscription_plans\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(64) NOT NULL,
  \`slug\` VARCHAR(64) UNIQUE NOT NULL,
  \`price_inr\` INT NOT NULL DEFAULT 0,
  \`billing_interval\` VARCHAR(32) NOT NULL DEFAULT 'month',
  \`monthly_coins\` INT NOT NULL DEFAULT 0,
  \`storage_bytes\` BIGINT NOT NULL DEFAULT 1073741824,
  \`cad_revisions_monthly\` INT NOT NULL DEFAULT 1,
  \`cad_revisions_max_per_model\` INT NOT NULL DEFAULT 3,
  \`cad_revision_cost_coins\` INT NOT NULL DEFAULT 10,
  \`active_ar_models_limit\` INT NOT NULL DEFAULT 10,
  \`max_team_members\` INT NOT NULL DEFAULT 1,
  \`has_private_sharing\` TINYINT(1) NOT NULL DEFAULT 0,
  \`has_version_history\` TINYINT(1) NOT NULL DEFAULT 0,
  \`has_priority_processing\` TINYINT(1) NOT NULL DEFAULT 0,
  \`has_priority_support\` TINYINT(1) NOT NULL DEFAULT 0,
  \`signup_bonus_coins\` INT NOT NULL DEFAULT 0,
  \`daily_bonus_coins\` INT NOT NULL DEFAULT 0,
  \`daily_bonus_monthly_cap\` INT NOT NULL DEFAULT 0,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Coin Packages
DROP TABLE IF EXISTS \`coin_packages\`;
CREATE TABLE \`coin_packages\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(64) NOT NULL,
  \`coin_amount\` INT NOT NULL,
  \`price_inr\` INT NOT NULL,
  \`gst_percentage\` INT NOT NULL DEFAULT 18,
  \`is_popular\` TINYINT(1) NOT NULL DEFAULT 0,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`email\` VARCHAR(255) UNIQUE NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`full_name\` VARCHAR(255) NOT NULL,
  \`avatar_url\` TEXT,
  \`role\` VARCHAR(32) NOT NULL DEFAULT 'user',
  \`is_verified\` TINYINT(1) NOT NULL DEFAULT 1,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Businesses
DROP TABLE IF EXISTS \`businesses\`;
CREATE TABLE \`businesses\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`owner_id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) UNIQUE NOT NULL,
  \`industry\` VARCHAR(128) NOT NULL DEFAULT 'Industrial & Manufacturing',
  \`description\` TEXT,
  \`website\` VARCHAR(255),
  \`logo_url\` TEXT,
  \`storage_used_bytes\` BIGINT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Workspaces
DROP TABLE IF EXISTS \`workspaces\`;
CREATE TABLE \`workspaces\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Team Members
DROP TABLE IF EXISTS \`team_members\`;
CREATE TABLE \`team_members\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`role\` VARCHAR(32) NOT NULL DEFAULT 'viewer',
  \`invite_status\` VARCHAR(32) NOT NULL DEFAULT 'accepted',
  \`invited_email\` VARCHAR(255),
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uniq_biz_user\` (\`business_id\`, \`user_id\`),
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Subscriptions
DROP TABLE IF EXISTS \`subscriptions\`;
CREATE TABLE \`subscriptions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`plan_id\` VARCHAR(64) NOT NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
  \`current_period_start\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`current_period_end\` DATETIME NOT NULL,
  \`cancel_at_period_end\` TINYINT(1) NOT NULL DEFAULT 0,
  \`payment_method\` VARCHAR(64) DEFAULT 'stripe',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`plan_id\`) REFERENCES \`subscription_plans\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Wallets
DROP TABLE IF EXISTS \`wallets\`;
CREATE TABLE \`wallets\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) UNIQUE NOT NULL,
  \`subscription_balance\` INT NOT NULL DEFAULT 0,
  \`purchased_balance\` INT NOT NULL DEFAULT 0,
  \`total_balance\` INT GENERATED ALWAYS AS (\`subscription_balance\` + \`purchased_balance\`) VIRTUAL,
  \`daily_bonus_claimed_this_month\` INT NOT NULL DEFAULT 0,
  \`last_daily_bonus_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Coin Transactions
DROP TABLE IF EXISTS \`coin_transactions\`;
CREATE TABLE \`coin_transactions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`wallet_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`amount\` INT NOT NULL,
  \`coin_source\` VARCHAR(32) NOT NULL DEFAULT 'subscription',
  \`transaction_type\` VARCHAR(64) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`related_model_id\` VARCHAR(64),
  \`related_revision_id\` VARCHAR(64),
  \`payment_id\` VARCHAR(64),
  \`balance_after\` INT NOT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`wallet_id\`) REFERENCES \`wallets\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payments
DROP TABLE IF EXISTS \`payments\`;
CREATE TABLE \`payments\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`amount_inr\` INT NOT NULL,
  \`gst_inr\` INT NOT NULL DEFAULT 0,
  \`total_amount_inr\` INT NOT NULL,
  \`currency\` VARCHAR(8) NOT NULL DEFAULT 'INR',
  \`payment_type\` VARCHAR(32) NOT NULL,
  \`item_id\` VARCHAR(64) NOT NULL,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'completed',
  \`payment_gateway\` VARCHAR(32) NOT NULL DEFAULT 'stripe',
  \`gateway_payment_id\` VARCHAR(255),
  \`gateway_signature\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Galleries
DROP TABLE IF EXISTS \`galleries\`;
CREATE TABLE \`galleries\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`thumbnail_url\` TEXT,
  \`is_public\` TINYINT(1) NOT NULL DEFAULT 1,
  \`model_count\` INT NOT NULL DEFAULT 0,
  \`storage_used_bytes\` BIGINT NOT NULL DEFAULT 0,
  \`is_archived\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Categories
DROP TABLE IF EXISTS \`categories\`;
CREATE TABLE \`categories\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(128) NOT NULL,
  \`slug\` VARCHAR(128) UNIQUE NOT NULL,
  \`icon\` VARCHAR(64) DEFAULT 'box',
  \`description\` TEXT,
  \`sort_order\` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Models
DROP TABLE IF EXISTS \`models\`;
CREATE TABLE \`models\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`gallery_id\` VARCHAR(64),
  \`category_id\` VARCHAR(64),
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`visibility\` VARCHAR(16) NOT NULL DEFAULT 'public',
  \`share_token\` VARCHAR(64) UNIQUE,
  \`thumbnail_url\` TEXT,
  \`original_file_name\` VARCHAR(255) NOT NULL,
  \`original_file_format\` VARCHAR(32) NOT NULL,
  \`original_file_size\` BIGINT NOT NULL DEFAULT 0,
  \`web_ready_file_url\` TEXT,
  \`web_ready_file_size\` BIGINT NOT NULL DEFAULT 0,
  \`storage_total_bytes\` BIGINT NOT NULL DEFAULT 0,
  \`processing_status\` VARCHAR(32) NOT NULL DEFAULT 'uploading',
  \`processing_progress\` INT NOT NULL DEFAULT 0,
  \`processing_error\` TEXT,
  \`ar_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
  \`ar_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`qr_code_url\` TEXT,
  \`current_version\` INT NOT NULL DEFAULT 1,
  \`views_count\` INT NOT NULL DEFAULT 0,
  \`unique_views_count\` INT NOT NULL DEFAULT 0,
  \`ar_views_count\` INT NOT NULL DEFAULT 0,
  \`qr_scans_count\` INT NOT NULL DEFAULT 0,
  \`shares_count\` INT NOT NULL DEFAULT 0,
  \`deleted_at\` DATETIME DEFAULT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`gallery_id\`) REFERENCES \`galleries\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Model Files
DROP TABLE IF EXISTS \`model_files\`;
CREATE TABLE \`model_files\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`file_type\` VARCHAR(32) NOT NULL,
  \`file_path\` TEXT NOT NULL,
  \`file_size\` BIGINT NOT NULL,
  \`mime_type\` VARCHAR(128),
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Model Versions
DROP TABLE IF EXISTS \`model_versions\`;
CREATE TABLE \`model_versions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`version_number\` INT NOT NULL,
  \`created_by_user_id\` VARCHAR(64) NOT NULL,
  \`notes\` TEXT,
  \`file_path\` TEXT NOT NULL,
  \`file_size\` BIGINT NOT NULL,
  \`thumbnail_url\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. CAD Revisions
DROP TABLE IF EXISTS \`model_revisions\`;
CREATE TABLE \`model_revisions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`revision_number\` INT NOT NULL,
  \`original_file_name\` VARCHAR(255) NOT NULL,
  \`file_path\` TEXT NOT NULL,
  \`file_size\` BIGINT NOT NULL,
  \`notes\` TEXT,
  \`status\` VARCHAR(32) NOT NULL DEFAULT 'processing',
  \`coins_charged\` INT NOT NULL DEFAULT 0,
  \`cooldown_until\` DATETIME NOT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`completed_at\` DATETIME,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. QR Codes
DROP TABLE IF EXISTS \`qr_codes\`;
CREATE TABLE \`qr_codes\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`preset\` VARCHAR(64) DEFAULT 'brochure',
  \`target_url\` TEXT NOT NULL,
  \`qr_image_url\` TEXT NOT NULL,
  \`scan_count\` INT NOT NULL DEFAULT 0,
  \`last_scanned_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. AR Sessions
DROP TABLE IF EXISTS \`ar_sessions\`;
CREATE TABLE \`ar_sessions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`device_type\` VARCHAR(64),
  \`browser\` VARCHAR(64),
  \`os\` VARCHAR(64),
  \`ip_hash\` VARCHAR(64),
  \`duration_seconds\` INT DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Model Analytics
DROP TABLE IF EXISTS \`model_analytics\`;
CREATE TABLE \`model_analytics\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`model_id\` VARCHAR(64) NOT NULL,
  \`event_type\` VARCHAR(32) NOT NULL,
  \`visitor_id\` VARCHAR(64),
  \`device_type\` VARCHAR(64),
  \`browser\` VARCHAR(64),
  \`os\` VARCHAR(64),
  \`referer\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Tags
DROP TABLE IF EXISTS \`tags\`;
CREATE TABLE \`tags\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(64) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS \`model_tags\`;
CREATE TABLE \`model_tags\` (
  \`model_id\` VARCHAR(64) NOT NULL,
  \`tag_id\` VARCHAR(64) NOT NULL,
  PRIMARY KEY (\`model_id\`, \`tag_id\`),
  FOREIGN KEY (\`model_id\`) REFERENCES \`models\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Notifications
DROP TABLE IF EXISTS \`notifications\`;
CREATE TABLE \`notifications\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`business_id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64),
  \`type\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
  \`related_link\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Platform Settings
DROP TABLE IF EXISTS \`platform_settings\`;
CREATE TABLE \`platform_settings\` (
  \`setting_key\` VARCHAR(128) PRIMARY KEY,
  \`setting_value\` TEXT NOT NULL,
  \`description\` TEXT,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enable Foreign Keys
SET FOREIGN_KEY_CHECKS = 1;
`;

// Now dump all rows for each table from SQLite into MySQL INSERT statements
function escapeSqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;

  let str = String(val);
  // Convert ISO string (e.g., '2026-10-06T13:14:52.819Z') to MySQL DATETIME format ('2026-10-06 13:14:52')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      str = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    }
  }

  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    if (rows && rows.length > 0) {
      sqlOutput += `\n-- Data for \`${table}\`\n`;
      const cols = Object.keys(rows[0]).filter(c => c !== 'total_balance'); // skip generated column
      const colList = cols.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const valList = cols.map(c => escapeSqlVal(row[c])).join(', ');
        sqlOutput += `INSERT INTO \`${table}\` (${colList}) VALUES (${valList});\n`;
      }
    }
  } catch (err) {
    console.warn(`Skipping table ${table}:`, err.message);
  }
}

// Write to sack.sql in root directory
const targetSqlPath = path.resolve(__dirname, '../../sack.sql');
fs.writeFileSync(targetSqlPath, sqlOutput, 'utf8');
console.log('Successfully wrote sack.sql to:', targetSqlPath);
