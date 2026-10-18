-- ModelAR Normalized Relational Database Schema
-- Compatible with SQLite and MySQL / PostgreSQL

-- 1. Subscription Plans (Configurable by Admin)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  slug VARCHAR(64) UNIQUE NOT NULL,
  tagline VARCHAR(255) DEFAULT '',
  price_inr INTEGER NOT NULL DEFAULT 0,
  price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  billing_interval VARCHAR(32) NOT NULL DEFAULT 'month',
  is_popular BOOLEAN NOT NULL DEFAULT 0,
  monthly_coins INTEGER NOT NULL DEFAULT 0,
  storage_bytes BIGINT NOT NULL DEFAULT 1073741824, -- e.g. 1GB
  storage_text VARCHAR(64) DEFAULT '1 GB',
  cad_revisions_text VARCHAR(128) DEFAULT '1 free, 3 max',
  cad_revisions_monthly INTEGER NOT NULL DEFAULT 1,
  cad_revisions_max_per_model INTEGER NOT NULL DEFAULT 3,
  cad_revision_cost_coins INTEGER NOT NULL DEFAULT 10,
  active_ar_models_limit INTEGER NOT NULL DEFAULT 10,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  has_private_sharing BOOLEAN NOT NULL DEFAULT 0,
  has_version_history BOOLEAN NOT NULL DEFAULT 0,
  has_priority_processing BOOLEAN NOT NULL DEFAULT 0,
  has_priority_support BOOLEAN NOT NULL DEFAULT 0,
  button_text VARCHAR(64) DEFAULT 'Get Started',
  features TEXT, -- JSON array of feature descriptions
  signup_bonus_coins INTEGER NOT NULL DEFAULT 0,
  daily_bonus_coins INTEGER NOT NULL DEFAULT 0,
  daily_bonus_monthly_cap INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Original Subscription Plans (Free ₹0, Creator ₹299 [Most Popular], Business ₹799)
INSERT INTO subscription_plans (
  id, name, slug, tagline, price_inr, price_usd, billing_interval, is_popular,
  monthly_coins, storage_bytes, storage_text, cad_revisions_text, cad_revisions_monthly,
  cad_revisions_max_per_model, cad_revision_cost_coins, active_ar_models_limit,
  max_team_members, has_private_sharing, has_version_history, has_priority_processing,
  has_priority_support, button_text, features, signup_bonus_coins, daily_bonus_coins,
  daily_bonus_monthly_cap, is_active
) VALUES 
(
  'plan_free', 'Free', 'free', 'Try out 3d and AR sharing solo', 0, 0.00, 'month', 0,
  30, 1073741824, '1 GB', '1 free, 3 max', 1, 3, 10, 10, 1, 0, 0, 0, 0,
  'Start free',
  '["100 bonus coins on signup", "30 coins/month allowance", "1 free CAD revision per model, then 10 coins", "Public sharing and QR links", "Community support"]',
  100, 0, 0, 1
),
(
  'plan_creator', 'Creator', 'creator', 'Solo freelancers and photographers', 299, 4.00, 'month', 1,
  300, 10737418240, '10 GB', '5/mo, 10 max', 5, 10, 10, 25, 1, 1, 0, 0, 0,
  'Subscribe to Creator',
  '["1 workspace, 1 login (solo)", "25 active AR models", "+20 coins/day (capped at 60/mo)", "Private and public sharing", "Coin top-ups, email support"]',
  0, 20, 60, 1
),
(
  'plan_business', 'Business', 'business', 'Teams of 3+ logins, shared workspace', 799, 10.00, 'month', 0,
  1000, 53687091200, '50 GB', '30/mo, 15 max', 30, 15, 10, 100, 10, 1, 1, 1, 1,
  'Subscribe to Business',
  '["1 workspace, up to 10 invited logins", "Shared coin pool and storage", "100 active AR models", "+20 coins/day (capped at 200/mo)", "Priority processing and support"]',
  0, 20, 200, 1
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  tagline = VALUES(tagline),
  price_inr = VALUES(price_inr),
  price_usd = VALUES(price_usd),
  is_popular = VALUES(is_popular),
  monthly_coins = VALUES(monthly_coins),
  storage_bytes = VALUES(storage_bytes),
  storage_text = VALUES(storage_text),
  cad_revisions_text = VALUES(cad_revisions_text),
  button_text = VALUES(button_text),
  features = VALUES(features),
  is_active = 1;



-- 2. Coin Top-up Packages (Configurable by Admin)
CREATE TABLE IF NOT EXISTS coin_packages (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  coin_amount INTEGER NOT NULL,
  price_inr INTEGER NOT NULL,
  gst_percentage INTEGER NOT NULL DEFAULT 18,
  is_popular BOOLEAN NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'user', -- 'user', 'admin'
  is_verified BOOLEAN NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Businesses / Organizations
CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(128) NOT NULL DEFAULT 'Industrial & Manufacturing',
  description TEXT,
  website VARCHAR(255),
  logo_url TEXT,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 6. Team Members (RBAC: owner, admin, editor, viewer)
CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'viewer', -- 'owner', 'admin', 'editor', 'viewer'
  invite_status VARCHAR(32) NOT NULL DEFAULT 'accepted', -- 'invited', 'accepted', 'revoked'
  invited_email VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, user_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled'
  current_period_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end DATETIME NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT 0,
  payment_method VARCHAR(64) DEFAULT 'stripe',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 8. Wallets (Separate accounting for subscription vs purchased coins)
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) UNIQUE NOT NULL,
  subscription_balance INTEGER NOT NULL DEFAULT 0,
  purchased_balance INTEGER NOT NULL DEFAULT 0,
  total_balance INTEGER GENERATED ALWAYS AS (subscription_balance + purchased_balance) VIRTUAL,
  daily_bonus_claimed_this_month INTEGER NOT NULL DEFAULT 0,
  last_daily_bonus_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 9. Coin Transactions Ledger
CREATE TABLE IF NOT EXISTS coin_transactions (
  id VARCHAR(64) PRIMARY KEY,
  wallet_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  amount INTEGER NOT NULL, -- positive for credits, negative for debits
  coin_source VARCHAR(32) NOT NULL DEFAULT 'subscription', -- 'subscription', 'purchased', 'mixed'
  transaction_type VARCHAR(64) NOT NULL, -- 'signup_bonus', 'subscription_credit', 'daily_credit', 'coin_purchase', 'model_upload', 'cad_revision', 'refund', 'admin_adjustment', 'expiration'
  description TEXT NOT NULL,
  related_model_id VARCHAR(64),
  related_revision_id VARCHAR(64),
  payment_id VARCHAR(64),
  balance_after INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  amount_inr INTEGER NOT NULL,
  gst_inr INTEGER NOT NULL DEFAULT 0,
  total_amount_inr INTEGER NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  payment_type VARCHAR(32) NOT NULL, -- 'subscription', 'coin_package'
  item_id VARCHAR(64) NOT NULL, -- plan_id or package_id
  status VARCHAR(32) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  payment_gateway VARCHAR(32) NOT NULL DEFAULT 'stripe',
  gateway_payment_id VARCHAR(255),
  gateway_signature TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. Galleries
CREATE TABLE IF NOT EXISTS galleries (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT 1,
  share_token VARCHAR(64) UNIQUE,
  model_count INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 12. Categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  icon VARCHAR(64) DEFAULT 'box',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 13. Models
CREATE TABLE IF NOT EXISTS models (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  gallery_id VARCHAR(64),
  category_id VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public', -- 'public', 'private'
  share_token VARCHAR(64) UNIQUE,
  thumbnail_url TEXT,
  original_file_name VARCHAR(255) NOT NULL,
  original_file_format VARCHAR(32) NOT NULL, -- 'glb', 'gltf', 'obj', 'stl', 'step'
  original_file_size BIGINT NOT NULL DEFAULT 0,
  web_ready_file_url TEXT,
  web_ready_file_size BIGINT NOT NULL DEFAULT 0,
  storage_total_bytes BIGINT NOT NULL DEFAULT 0,
  processing_status VARCHAR(32) NOT NULL DEFAULT 'uploading', -- 'uploading', 'processing', 'ready', 'processing_failed', 'archived', 'deleted'
  processing_progress INTEGER NOT NULL DEFAULT 0,
  processing_error TEXT,
  ar_enabled BOOLEAN NOT NULL DEFAULT 1,
  ar_active BOOLEAN NOT NULL DEFAULT 1,
  qr_code_url TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  views_count INTEGER NOT NULL DEFAULT 0,
  unique_views_count INTEGER NOT NULL DEFAULT 0,
  ar_views_count INTEGER NOT NULL DEFAULT 0,
  qr_scans_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 14. Model Files (tracks all individual assets for storage calculations)
CREATE TABLE IF NOT EXISTS model_files (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  file_type VARCHAR(32) NOT NULL, -- 'original', 'web_ready', 'thumbnail', 'version', 'usdz'
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(128),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 15. Model Versions (For Business Plan rollback & history)
CREATE TABLE IF NOT EXISTS model_versions (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  version_number INTEGER NOT NULL,
  created_by_user_id VARCHAR(64) NOT NULL,
  notes TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  thumbnail_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- 16. CAD Revisions
CREATE TABLE IF NOT EXISTS model_revisions (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  revision_number INTEGER NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  coins_charged INTEGER NOT NULL DEFAULT 0,
  cooldown_until DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 17. QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  preset VARCHAR(64) DEFAULT 'brochure', -- 'brochure', 'machinery_label', 'showroom', 'packaging', 'menu'
  target_url TEXT NOT NULL,
  qr_image_url TEXT NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 18. AR Sessions
CREATE TABLE IF NOT EXISTS ar_sessions (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  device_type VARCHAR(64),
  browser VARCHAR(64),
  os VARCHAR(64),
  ip_hash VARCHAR(64),
  duration_seconds INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 19. Model Analytics Events
CREATE TABLE IF NOT EXISTS model_analytics (
  id VARCHAR(64) PRIMARY KEY,
  model_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL, -- 'view', 'ar_launch', 'qr_scan', 'share', 'fullscreen'
  visitor_id VARCHAR(64),
  device_type VARCHAR(64),
  browser VARCHAR(64),
  os VARCHAR(64),
  referer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 20. Tags
CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS model_tags (
  model_id VARCHAR(64) NOT NULL,
  tag_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (model_id, tag_id),
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 21. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  type VARCHAR(64) NOT NULL, -- 'upload_complete', 'processing_complete', 'processing_failed', 'cad_complete', 'low_storage', 'low_coins'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT 0,
  related_link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 22. Platform Settings (Admin managed)
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(128) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_models_business ON models(business_id);
CREATE INDEX IF NOT EXISTS idx_models_gallery ON models(gallery_id);
CREATE INDEX IF NOT EXISTS idx_models_visibility ON models(visibility);
CREATE INDEX IF NOT EXISTS idx_models_processing ON models(processing_status);
CREATE INDEX IF NOT EXISTS idx_coin_trans_wallet ON coin_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_coin_trans_biz ON coin_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_model ON model_analytics(model_id);
CREATE INDEX IF NOT EXISTS idx_team_business ON team_members(business_id);
