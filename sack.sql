-- ModelAR MySQL Database Schema & Seed Dump
-- Target Database: sack
-- Generated for MySQL 8.x / MariaDB / phpMyAdmin

CREATE DATABASE IF NOT EXISTS `sack` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sack`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Subscription Plans
DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE `subscription_plans` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(64) UNIQUE NOT NULL,
  `price_inr` INT NOT NULL DEFAULT 0,
  `billing_interval` VARCHAR(32) NOT NULL DEFAULT 'month',
  `monthly_coins` INT NOT NULL DEFAULT 0,
  `storage_bytes` BIGINT NOT NULL DEFAULT 1073741824,
  `cad_revisions_monthly` INT NOT NULL DEFAULT 1,
  `cad_revisions_max_per_model` INT NOT NULL DEFAULT 3,
  `cad_revision_cost_coins` INT NOT NULL DEFAULT 10,
  `active_ar_models_limit` INT NOT NULL DEFAULT 10,
  `max_team_members` INT NOT NULL DEFAULT 1,
  `has_private_sharing` TINYINT(1) NOT NULL DEFAULT 0,
  `has_version_history` TINYINT(1) NOT NULL DEFAULT 0,
  `has_priority_processing` TINYINT(1) NOT NULL DEFAULT 0,
  `has_priority_support` TINYINT(1) NOT NULL DEFAULT 0,
  `signup_bonus_coins` INT NOT NULL DEFAULT 0,
  `daily_bonus_coins` INT NOT NULL DEFAULT 0,
  `daily_bonus_monthly_cap` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Coin Packages
DROP TABLE IF EXISTS `coin_packages`;
CREATE TABLE `coin_packages` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  `coin_amount` INT NOT NULL,
  `price_inr` INT NOT NULL,
  `gst_percentage` INT NOT NULL DEFAULT 18,
  `is_popular` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `avatar_url` TEXT,
  `role` VARCHAR(32) NOT NULL DEFAULT 'user',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Businesses
DROP TABLE IF EXISTS `businesses`;
CREATE TABLE `businesses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `owner_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `industry` VARCHAR(128) NOT NULL DEFAULT 'Industrial & Manufacturing',
  `description` TEXT,
  `website` VARCHAR(255),
  `logo_url` TEXT,
  `storage_used_bytes` BIGINT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Workspaces
DROP TABLE IF EXISTS `workspaces`;
CREATE TABLE `workspaces` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Team Members
DROP TABLE IF EXISTS `team_members`;
CREATE TABLE `team_members` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'viewer',
  `invite_status` VARCHAR(32) NOT NULL DEFAULT 'accepted',
  `invited_email` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_biz_user` (`business_id`, `user_id`),
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Subscriptions
DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `plan_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `current_period_start` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `current_period_end` DATETIME NOT NULL,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(64) DEFAULT 'stripe',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Wallets
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) UNIQUE NOT NULL,
  `subscription_balance` INT NOT NULL DEFAULT 0,
  `purchased_balance` INT NOT NULL DEFAULT 0,
  `total_balance` INT GENERATED ALWAYS AS (`subscription_balance` + `purchased_balance`) VIRTUAL,
  `daily_bonus_claimed_this_month` INT NOT NULL DEFAULT 0,
  `last_daily_bonus_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Coin Transactions
DROP TABLE IF EXISTS `coin_transactions`;
CREATE TABLE `coin_transactions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `wallet_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL,
  `amount` INT NOT NULL,
  `coin_source` VARCHAR(32) NOT NULL DEFAULT 'subscription',
  `transaction_type` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `related_model_id` VARCHAR(64),
  `related_revision_id` VARCHAR(64),
  `payment_id` VARCHAR(64),
  `balance_after` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payments
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `amount_inr` INT NOT NULL,
  `gst_inr` INT NOT NULL DEFAULT 0,
  `total_amount_inr` INT NOT NULL,
  `currency` VARCHAR(8) NOT NULL DEFAULT 'INR',
  `payment_type` VARCHAR(32) NOT NULL,
  `item_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'completed',
  `payment_gateway` VARCHAR(32) NOT NULL DEFAULT 'stripe',
  `gateway_payment_id` VARCHAR(255),
  `gateway_signature` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Galleries
DROP TABLE IF EXISTS `galleries`;
CREATE TABLE `galleries` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `thumbnail_url` TEXT,
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `model_count` INT NOT NULL DEFAULT 0,
  `storage_used_bytes` BIGINT NOT NULL DEFAULT 0,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Categories
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `slug` VARCHAR(128) UNIQUE NOT NULL,
  `icon` VARCHAR(64) DEFAULT 'box',
  `description` TEXT,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Models
DROP TABLE IF EXISTS `models`;
CREATE TABLE `models` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `gallery_id` VARCHAR(64),
  `category_id` VARCHAR(64),
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `visibility` VARCHAR(16) NOT NULL DEFAULT 'public',
  `share_token` VARCHAR(64) UNIQUE,
  `thumbnail_url` TEXT,
  `original_file_name` VARCHAR(255) NOT NULL,
  `original_file_format` VARCHAR(32) NOT NULL,
  `original_file_size` BIGINT NOT NULL DEFAULT 0,
  `web_ready_file_url` TEXT,
  `web_ready_file_size` BIGINT NOT NULL DEFAULT 0,
  `storage_total_bytes` BIGINT NOT NULL DEFAULT 0,
  `processing_status` VARCHAR(32) NOT NULL DEFAULT 'uploading',
  `processing_progress` INT NOT NULL DEFAULT 0,
  `processing_error` TEXT,
  `ar_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `ar_active` TINYINT(1) NOT NULL DEFAULT 1,
  `qr_code_url` TEXT,
  `current_version` INT NOT NULL DEFAULT 1,
  `views_count` INT NOT NULL DEFAULT 0,
  `unique_views_count` INT NOT NULL DEFAULT 0,
  `ar_views_count` INT NOT NULL DEFAULT 0,
  `qr_scans_count` INT NOT NULL DEFAULT 0,
  `shares_count` INT NOT NULL DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Model Files
DROP TABLE IF EXISTS `model_files`;
CREATE TABLE `model_files` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `file_type` VARCHAR(32) NOT NULL,
  `file_path` TEXT NOT NULL,
  `file_size` BIGINT NOT NULL,
  `mime_type` VARCHAR(128),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Model Versions
DROP TABLE IF EXISTS `model_versions`;
CREATE TABLE `model_versions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `version_number` INT NOT NULL,
  `created_by_user_id` VARCHAR(64) NOT NULL,
  `notes` TEXT,
  `file_path` TEXT NOT NULL,
  `file_size` BIGINT NOT NULL,
  `thumbnail_url` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. CAD Revisions
DROP TABLE IF EXISTS `model_revisions`;
CREATE TABLE `model_revisions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `revision_number` INT NOT NULL,
  `original_file_name` VARCHAR(255) NOT NULL,
  `file_path` TEXT NOT NULL,
  `file_size` BIGINT NOT NULL,
  `notes` TEXT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'processing',
  `coins_charged` INT NOT NULL DEFAULT 0,
  `cooldown_until` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. QR Codes
DROP TABLE IF EXISTS `qr_codes`;
CREATE TABLE `qr_codes` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `preset` VARCHAR(64) DEFAULT 'brochure',
  `target_url` TEXT NOT NULL,
  `qr_image_url` TEXT NOT NULL,
  `scan_count` INT NOT NULL DEFAULT 0,
  `last_scanned_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. AR Sessions
DROP TABLE IF EXISTS `ar_sessions`;
CREATE TABLE `ar_sessions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `device_type` VARCHAR(64),
  `browser` VARCHAR(64),
  `os` VARCHAR(64),
  `ip_hash` VARCHAR(64),
  `duration_seconds` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Model Analytics
DROP TABLE IF EXISTS `model_analytics`;
CREATE TABLE `model_analytics` (
  `id` VARCHAR(64) PRIMARY KEY,
  `model_id` VARCHAR(64) NOT NULL,
  `event_type` VARCHAR(32) NOT NULL,
  `visitor_id` VARCHAR(64),
  `device_type` VARCHAR(64),
  `browser` VARCHAR(64),
  `os` VARCHAR(64),
  `referer` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Tags
DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(64) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `model_tags`;
CREATE TABLE `model_tags` (
  `model_id` VARCHAR(64) NOT NULL,
  `tag_id` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`model_id`, `tag_id`),
  FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `business_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64),
  `type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `related_link` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Platform Settings
DROP TABLE IF EXISTS `platform_settings`;
CREATE TABLE `platform_settings` (
  `setting_key` VARCHAR(128) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` TEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enable Foreign Keys
SET FOREIGN_KEY_CHECKS = 1;

-- Data for `subscription_plans`
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `price_inr`, `billing_interval`, `monthly_coins`, `storage_bytes`, `cad_revisions_monthly`, `cad_revisions_max_per_model`, `cad_revision_cost_coins`, `active_ar_models_limit`, `max_team_members`, `has_private_sharing`, `has_version_history`, `has_priority_processing`, `has_priority_support`, `signup_bonus_coins`, `daily_bonus_coins`, `daily_bonus_monthly_cap`, `is_active`, `created_at`, `updated_at`) VALUES ('plan_free', 'Free', 'free', 0, 'month', 60, 1073741824, 1, 3, 10, 10, 1, 0, 0, 0, 0, 100, 20, 60, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `price_inr`, `billing_interval`, `monthly_coins`, `storage_bytes`, `cad_revisions_monthly`, `cad_revisions_max_per_model`, `cad_revision_cost_coins`, `active_ar_models_limit`, `max_team_members`, `has_private_sharing`, `has_version_history`, `has_priority_processing`, `has_priority_support`, `signup_bonus_coins`, `daily_bonus_coins`, `daily_bonus_monthly_cap`, `is_active`, `created_at`, `updated_at`) VALUES ('plan_creator', 'Creator', 'creator', 299, 'month', 300, 10737418240, 5, 10, 10, 25, 1, 1, 0, 0, 0, 0, 0, 0, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `price_inr`, `billing_interval`, `monthly_coins`, `storage_bytes`, `cad_revisions_monthly`, `cad_revisions_max_per_model`, `cad_revision_cost_coins`, `active_ar_models_limit`, `max_team_members`, `has_private_sharing`, `has_version_history`, `has_priority_processing`, `has_priority_support`, `signup_bonus_coins`, `daily_bonus_coins`, `daily_bonus_monthly_cap`, `is_active`, `created_at`, `updated_at`) VALUES ('plan_business', 'Business', 'business', 799, 'month', 1000, 53687091200, 30, 15, 10, 100, 10, 1, 1, 1, 1, 0, 0, 0, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `coin_packages`
INSERT INTO `coin_packages` (`id`, `name`, `coin_amount`, `price_inr`, `gst_percentage`, `is_popular`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES ('pkg_60', 'Starter Pack', 60, 49, 18, 0, 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `coin_packages` (`id`, `name`, `coin_amount`, `price_inr`, `gst_percentage`, `is_popular`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES ('pkg_300', 'Pro Creator Pack', 300, 199, 18, 1, 1, 2, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `coin_packages` (`id`, `name`, `coin_amount`, `price_inr`, `gst_percentage`, `is_popular`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES ('pkg_1000', 'Enterprise Booster', 1000, 599, 18, 0, 1, 3, '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `users`
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES ('usr_admin', 'admin@modelar.io', '$2b$10$KPtyGbchssKIALff9kXKMO8lKCbeQ3K/eGEK1UDqV4VK6KwNJKw92', 'ModelAR Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'admin', 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES ('usr_apex', 'contact@apexmfg.com', '$2b$10$KPtyGbchssKIALff9kXKMO8lKCbeQ3K/eGEK1UDqV4VK6KwNJKw92', 'Vikram Mehta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'user', 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES ('usr_modular', 'kavita@modulardesign.in', '$2b$10$KPtyGbchssKIALff9kXKMO8lKCbeQ3K/eGEK1UDqV4VK6KwNJKw92', 'Kavita Sundaram', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 'user', 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES ('usr_rajesh', 'rajesh@modulardesign.in', '$2b$10$KPtyGbchssKIALff9kXKMO8lKCbeQ3K/eGEK1UDqV4VK6KwNJKw92', 'Rajesh Patel', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 'user', 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES ('usr_free', 'rahul@rahuldesigns.com', '$2b$10$KPtyGbchssKIALff9kXKMO8lKCbeQ3K/eGEK1UDqV4VK6KwNJKw92', 'Rahul Varma', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80', 'user', 1, 1, '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `businesses`
INSERT INTO `businesses` (`id`, `owner_id`, `name`, `slug`, `industry`, `description`, `website`, `logo_url`, `storage_used_bytes`, `created_at`, `updated_at`) VALUES ('biz_apex', 'usr_apex', 'Apex Heavy Engineering', 'apex-heavy-engineering', 'Industrial & Manufacturing', 'Precision pumps, compressors, and hydraulic manifolds for heavy industry.', 'https://apexmfg.example.com', NULL, 130625176, '2026-10-03 18:30:09', '2026-10-03 19:38:48');
INSERT INTO `businesses` (`id`, `owner_id`, `name`, `slug`, `industry`, `description`, `website`, `logo_url`, `storage_used_bytes`, `created_at`, `updated_at`) VALUES ('biz_modular', 'usr_modular', 'Modular Living Spaces', 'modular-living-spaces', 'Furniture & Interior', 'B2B ergonomic contract furniture and commercial architectural fixtures.', 'https://modularspaces.example.com', NULL, 292110512, '2026-10-03 18:30:09', '2026-10-05 13:14:52');
INSERT INTO `businesses` (`id`, `owner_id`, `name`, `slug`, `industry`, `description`, `website`, `logo_url`, `storage_used_bytes`, `created_at`, `updated_at`) VALUES ('biz_rahul', 'usr_free', 'Rahul Product Design', 'rahul-product-design', 'Engineering', 'Independent engineering prototypes and CAD models.', 'https://rahuldesigns.example.com', NULL, 18874368, '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `workspaces`
INSERT INTO `workspaces` (`id`, `business_id`, `name`, `created_at`) VALUES ('ws_apex', 'biz_apex', 'Apex Core Workspace', '2026-10-03 18:30:09');
INSERT INTO `workspaces` (`id`, `business_id`, `name`, `created_at`) VALUES ('ws_modular', 'biz_modular', 'Modular Design Studio', '2026-10-03 18:30:09');
INSERT INTO `workspaces` (`id`, `business_id`, `name`, `created_at`) VALUES ('ws_rahul', 'biz_rahul', 'Rahul Free Workspace', '2026-10-03 18:30:09');

-- Data for `team_members`
INSERT INTO `team_members` (`id`, `business_id`, `user_id`, `role`, `invite_status`, `invited_email`, `created_at`, `updated_at`) VALUES ('team_mod_1', 'biz_modular', 'usr_modular', 'owner', 'accepted', NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `team_members` (`id`, `business_id`, `user_id`, `role`, `invite_status`, `invited_email`, `created_at`, `updated_at`) VALUES ('team_mod_2', 'biz_modular', 'usr_rajesh', 'editor', 'accepted', NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `team_members` (`id`, `business_id`, `user_id`, `role`, `invite_status`, `invited_email`, `created_at`, `updated_at`) VALUES ('team_apex_1', 'biz_apex', 'usr_apex', 'owner', 'accepted', NULL, '2026-10-03 19:30:12', '2026-10-03 19:30:12');
INSERT INTO `team_members` (`id`, `business_id`, `user_id`, `role`, `invite_status`, `invited_email`, `created_at`, `updated_at`) VALUES ('team_rahul_1', 'biz_rahul', 'usr_free', 'owner', 'accepted', NULL, '2026-10-03 19:30:12', '2026-10-03 19:30:12');

-- Data for `subscriptions`
INSERT INTO `subscriptions` (`id`, `business_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `payment_method`, `created_at`, `updated_at`) VALUES ('sub_apex', 'biz_apex', 'plan_business', 'active', '2026-10-05 13:13:22', '2026-11-04 13:13:22', 0, 'stripe', '2026-10-03 18:30:09', '2026-10-05 13:13:22');
INSERT INTO `subscriptions` (`id`, `business_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `payment_method`, `created_at`, `updated_at`) VALUES ('sub_modular', 'biz_modular', 'plan_business', 'active', '2026-10-03 18:30:09', '2026-11-02 18:30:09', 0, 'stripe', '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `subscriptions` (`id`, `business_id`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `payment_method`, `created_at`, `updated_at`) VALUES ('sub_rahul', 'biz_rahul', 'plan_free', 'active', '2026-10-03 18:30:09', '2026-11-02 18:30:09', 0, 'stripe', '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `wallets`
INSERT INTO `wallets` (`id`, `business_id`, `subscription_balance`, `purchased_balance`, `daily_bonus_claimed_this_month`, `last_daily_bonus_at`, `created_at`, `updated_at`) VALUES ('wal_apex', 'biz_apex', 1200, 300, 0, '2026-10-01 18:30:09', '2026-10-03 18:30:09', '2026-10-05 13:13:22');
INSERT INTO `wallets` (`id`, `business_id`, `subscription_balance`, `purchased_balance`, `daily_bonus_claimed_this_month`, `last_daily_bonus_at`, `created_at`, `updated_at`) VALUES ('wal_modular', 'biz_modular', 875, 450, 0, '2026-10-01 18:30:09', '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `wallets` (`id`, `business_id`, `subscription_balance`, `purchased_balance`, `daily_bonus_claimed_this_month`, `last_daily_bonus_at`, `created_at`, `updated_at`) VALUES ('wal_rahul', 'biz_rahul', 35, 60, 40, '2026-10-01 18:30:09', '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `coin_transactions`
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a1', 'wal_apex', 'usr_apex', 'biz_apex', 100, 'subscription', 'signup_bonus', 'Signup welcome bonus coins', NULL, NULL, NULL, 100, '2026-09-08 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a2', 'wal_apex', 'usr_apex', 'biz_apex', 300, 'subscription', 'subscription_credit', 'Creator Monthly Subscription Allowance', NULL, NULL, NULL, 400, '2026-09-13 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a3', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Apex Centrifugal Slurry Pump', 'mod_pump_01', NULL, NULL, 375, '2026-09-18 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a4', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Industrial Screw Compressor', 'mod_compressor_01', NULL, NULL, 350, '2026-09-23 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a5', 'wal_apex', 'usr_apex', 'biz_apex', 300, 'purchased', 'coin_purchase', 'Purchased Pro Creator Pack (300 coins)', NULL, NULL, 'pay_apex_1', 650, '2026-09-28 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a6', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Hydraulic Manifold Assembly', 'mod_manifold_01', NULL, NULL, 525, '2026-10-02 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m1', 'wal_modular', 'usr_modular', 'biz_modular', 1000, 'subscription', 'subscription_credit', 'Business Plan Monthly Coin Pool', NULL, NULL, NULL, 1000, '2026-09-15 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m2', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: ErgoPro Executive Task Chair', 'mod_chair_01', NULL, NULL, 975, '2026-09-19 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m3', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: Commercial 6-Burner Range & Combi Oven', 'mod_kitchen_01', NULL, NULL, 950, '2026-09-22 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m4', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: Luxury Hotel Suite Modular Pod', 'mod_hotel_01', NULL, NULL, 925, '2026-09-26 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m5', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: 6-Axis Articulated Robotic Arm', 'mod_robot_01', NULL, NULL, 900, '2026-09-29 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m6', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: V6 Twin-Turbo Automotive Powertrain', 'mod_engine_01', NULL, NULL, 875, '2026-10-01 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_m7', 'wal_modular', 'usr_modular', 'biz_modular', 450, 'purchased', 'coin_purchase', 'Custom Coin Purchase for Q4 Product Catalog rollout', NULL, NULL, 'pay_mod_1', 1325, '2026-10-02 18:30:09');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_a0d94353', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', '3D Model upload and WebAR processing: High-Pressure Hydraulic Valve Block', 'mod_6dac37e9', NULL, NULL, 500, '2026-10-03 19:38:48');
INSERT INTO `coin_transactions` (`id`, `wallet_id`, `user_id`, `business_id`, `amount`, `coin_source`, `transaction_type`, `description`, `related_model_id`, `related_revision_id`, `payment_id`, `balance_after`, `created_at`) VALUES ('tx_02a8e83a', 'wal_apex', 'usr_admin', 'biz_apex', 1000, 'subscription', 'subscription_credit', 'Business Monthly Subscription Coin Allowance (+1000 coins)', NULL, NULL, 'pay_sub_d6af9472', 1500, '2026-10-05 13:13:22');

-- Data for `payments`
INSERT INTO `payments` (`id`, `business_id`, `user_id`, `amount_inr`, `gst_inr`, `total_amount_inr`, `currency`, `payment_type`, `item_id`, `status`, `payment_gateway`, `gateway_payment_id`, `gateway_signature`, `created_at`) VALUES ('pay_sub_d6af9472', 'biz_apex', 'usr_admin', 799, 144, 943, 'INR', 'subscription', 'plan_business', 'completed', 'stripe', 'sim_ch_b770d895-b', NULL, '2026-10-05 13:13:22');

-- Data for `galleries`
INSERT INTO `galleries` (`id`, `business_id`, `name`, `slug`, `description`, `thumbnail_url`, `is_public`, `model_count`, `storage_used_bytes`, `is_archived`, `created_at`, `updated_at`) VALUES ('gal_pumps', 'biz_apex', 'High-Pressure Pumps & Turbines', 'high-pressure-pumps', 'Heavy-duty industrial slurry pumps, turbines, and fluid dynamics gear for process industries.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 1, 2, 32184320, 0, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `galleries` (`id`, `business_id`, `name`, `slug`, `description`, `thumbnail_url`, `is_public`, `model_count`, `storage_used_bytes`, `is_archived`, `created_at`, `updated_at`) VALUES ('gal_hydraulics', 'biz_apex', 'Pneumatics & Manifolds', 'pneumatics-manifolds', 'Precision CNC-machined distribution blocks, valves, and industrial compressor units.', 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80', 1, 1, 16050176, 0, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `galleries` (`id`, `business_id`, `name`, `slug`, `description`, `thumbnail_url`, `is_public`, `model_count`, `storage_used_bytes`, `is_archived`, `created_at`, `updated_at`) VALUES ('gal_furn', 'biz_modular', 'Ergonomic Workspaces & Seating', 'ergonomic-workspaces', 'Contract architectural furniture designed for modern corporate and commercial interiors.', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80', 1, 1, 24500000, 0, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `galleries` (`id`, `business_id`, `name`, `slug`, `description`, `thumbnail_url`, `is_public`, `model_count`, `storage_used_bytes`, `is_archived`, `created_at`, `updated_at`) VALUES ('gal_hospitality', 'biz_modular', 'Hospitality & Commercial Kitchen', 'hospitality-kitchen', 'Turnkey hotel room pods and heavy-duty stainless steel commercial cooking equipment.', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', 1, 2, 58200000, 0, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `galleries` (`id`, `business_id`, `name`, `slug`, `description`, `thumbnail_url`, `is_public`, `model_count`, `storage_used_bytes`, `is_archived`, `created_at`, `updated_at`) VALUES ('gal_robotics', 'biz_modular', 'Automation & Powertrain', 'automation-powertrain', 'Mechatronic assembly cells, robotic grippers, and high-performance automotive subsystems.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', 1, 2, 46274848, 0, '2026-10-03 18:30:09', '2026-10-03 18:30:09');

-- Data for `categories`
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_ind', 'Industrial & Manufacturing', 'industrial-manufacturing', 'factory', 'Heavy plant equipment, valves, assembly parts and manufacturing jigs', 1);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_mach', 'Machinery & Equipment', 'machinery-equipment', 'cog', 'High-precision pumps, motors, industrial automation and robotics', 2);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_food', 'Food & Restaurant', 'food-restaurant', 'utensils', 'Commercial food production units, display cases and catering equipment', 3);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_kit', 'Commercial Kitchens', 'commercial-kitchens', 'flame', 'Stainless steel ranges, industrial combi-ovens and prep stations', 4);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_furn', 'Furniture & Interior', 'furniture-interior', 'armchair', 'Architectural furniture, ergonomic office setups and contract seating', 5);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_hosp', 'Hospitality & Hotels', 'hospitality-hotels', 'bed', 'Luxury suite furnishings, lobby installations and resort fixtures', 6);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_arch', 'Architecture & Construction', 'architecture-construction', 'building', 'Prefab modules, structural connectors, HVAC ducts and facades', 7);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_comm', 'Commercial Spaces', 'commercial-spaces', 'store', 'Retail store fixtures, exhibition booths and point-of-sale setups', 8);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_auto', 'Automotive', 'automotive', 'car', 'Engine components, EV battery packs, drivetrain assemblies and chassis', 9);
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`, `sort_order`) VALUES ('cat_eng', 'Engineering', 'engineering', 'cpu', 'Precision robotics, mechatronics and specialized laboratory test apparatus', 10);

-- Data for `models`
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_pump_01', 'biz_apex', 'gal_pumps', 'cat_mach', 'Apex CP-400 Industrial Centrifugal Pump', 'apex-cp400-industrial-centrifugal-pump', 'High-capacity centrifugal slurry pump engineered for abrasive mining, chemical processing, and wastewater treatment. Features high-chrome alloy impeller, double mechanical seal, and flange connections rated for 16 bar operation.', 'public', 'shr_cp400_pub', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 'apex_cp400_cad_rev3.step', 'step', 22100000, '/models/sample_pump.glb', 16500000, 38600000, 'ready', 100, NULL, 1, 1, '/qr/mod_pump_01.png', 2, 1422, 890, 312, 195, 84, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_robot_01', 'biz_modular', 'gal_robotics', 'cat_ind', 'OmniBot-X6 Articulated Industrial Robotic Arm', 'omnibot-x6-articulated-robotic-arm', 'Payload capacity 20kg with 1.8m reach. Precision harmonic drive gearboxes on all 6 axes with repeatability ±0.03mm. Ideal for pick-and-place, welding, and machine tending in automotive and electronics manufacturing.', 'public', 'shr_robot_pub', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', 'omnibot_x6_full_assembly.glb', 'glb', 18400000, '/models/sample_robot.glb', 14200000, 32600000, 'ready', 100, NULL, 1, 1, '/qr/mod_robot_01.png', 2, 2181, 1420, 649, 412, 190, NULL, '2026-10-03 18:30:09', '2026-10-05 13:14:52');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_kitchen_01', 'biz_modular', 'gal_hospitality', 'cat_kit', 'ThermoMaster 10-Pan Commercial Combi Steamer', 'thermomaster-10pan-commercial-combi-steamer', 'Heavy-gauge AISI 304 stainless steel combi steamer with touch interface, auto-clean cycle, and boilerless injection system. Built for high-volume hotel banquets and commercial kitchen production.', 'public', 'shr_combi_pub', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', 'thermomaster_10p.obj', 'obj', 15600000, '/models/sample_oven.glb', 11800000, 27400000, 'ready', 100, NULL, 1, 1, '/qr/mod_kitchen_01.png', 1, 980, 610, 280, 160, 52, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_chair_01', 'biz_modular', 'gal_furn', 'cat_furn', 'AeroMesh Ergonomic Task Chair', 'aeromesh-ergonomic-task-chair', 'Commercial contract seating with 4D adjustable armrests, dynamic lumbar support, and breathable elastomer mesh. Designed for LEED-certified workspaces and corporate headquarters.', 'public', 'shr_chair_pub', 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=800&q=80', 'aeromesh_chair_v1.gltf', 'gltf', 12300000, '/models/sample_chair.glb', 8900000, 21200000, 'ready', 100, NULL, 1, 1, '/qr/mod_chair_01.png', 1, 3450, 2100, 890, 620, 240, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_hotel_01', 'biz_modular', 'gal_hospitality', 'cat_hosp', 'Aura Signature Hotel Suite Architectural Pod', 'aura-signature-hotel-suite-architectural-pod', 'Prefabricated modular luxury guestroom suite including integrated headboard, acoustic ceiling baffles, custom millwork, and bathroom transition bulkhead. Scalable for boutique hotel retrofits.', 'public', 'shr_hotel_pub', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80', 'aura_suite_pod_rev1.glb', 'glb', 24100000, '/models/sample_hotel.glb', 18600000, 42700000, 'ready', 100, NULL, 1, 1, '/qr/mod_hotel_01.png', 1, 1892, 1140, 520, 310, 115, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_engine_01', 'biz_modular', 'gal_robotics', 'cat_auto', 'Apex-T6 3.5L Twin-Turbocharged V6 Engine', 'apex-t6-3-5l-twin-turbocharged-v6-engine', 'Complete powertrain assembly with dual overhead camshafts, direct fuel injection, intercooler piping, and exhaust turbocharger runners. High-polygon engineering CAD converted for interactive client review.', 'public', 'shr_engine_pub', 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80', 'v6_twin_turbo_block.step', 'step', 31200000, '/models/sample_engine.glb', 22400000, 53600000, 'ready', 100, NULL, 1, 1, '/qr/mod_engine_01.png', 1, 4124, 2800, 1124, 780, 320, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_manifold_01', 'biz_apex', 'gal_hydraulics', 'cat_ind', 'HydraBlock-500 Custom Manifold Assembly (Proprietary)', 'hydrablock-500-custom-manifold', 'Confidential customer specification manifold with integrated proportional flow valves and pressure relief ports. Strict B2B client NDA model.', 'private', 'sec_token_manifold_98234', 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80', 'hydrablock_500_nda.step', 'step', 9800000, '/models/sample_manifold.glb', 6250176, 16050176, 'ready', 100, NULL, 0, 0, '/qr/mod_manifold_01.png', 1, 45, 12, 0, 4, 2, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `models` (`id`, `business_id`, `gallery_id`, `category_id`, `title`, `slug`, `description`, `visibility`, `share_token`, `thumbnail_url`, `original_file_name`, `original_file_format`, `original_file_size`, `web_ready_file_url`, `web_ready_file_size`, `storage_total_bytes`, `processing_status`, `processing_progress`, `processing_error`, `ar_enabled`, `ar_active`, `qr_code_url`, `current_version`, `views_count`, `unique_views_count`, `ar_views_count`, `qr_scans_count`, `shares_count`, `deleted_at`, `created_at`, `updated_at`) VALUES ('mod_6dac37e9', 'biz_apex', NULL, 'cat_ind', 'High-Pressure Hydraulic Valve Block', 'high-pressure-hydraulic-valve-block-37e9', 'B2B high-precision valve block tested for 350 bar pressure applications.', 'public', 'shr_3b47a0ac-bd6', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 'model_asset.glb', 'glb', 18500000, '/models/sample_pump.glb', 13875000, 32375000, 'ready', 100, NULL, 1, 1, 'data:image/png;base64,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', 1, 1, 0, 0, 0, 0, NULL, '2026-10-03 19:38:47', '2026-10-03 19:38:48');

-- Data for `model_versions`
INSERT INTO `model_versions` (`id`, `model_id`, `version_number`, `created_by_user_id`, `notes`, `file_path`, `file_size`, `thumbnail_url`, `created_at`) VALUES ('ver_c1', 'mod_chair_01', 1, 'usr_modular', 'Initial production mesh with chrome base', '/models/sample_chair_v1.glb', 8900000, NULL, '2026-10-03 18:30:09');
INSERT INTO `model_versions` (`id`, `model_id`, `version_number`, `created_by_user_id`, `notes`, `file_path`, `file_size`, `thumbnail_url`, `created_at`) VALUES ('ver_c2', 'mod_chair_01', 2, 'usr_modular', 'Updated elastomeric tension weave and matte black aluminum frame', '/models/sample_chair.glb', 8900000, NULL, '2026-10-03 18:30:09');
INSERT INTO `model_versions` (`id`, `model_id`, `version_number`, `created_by_user_id`, `notes`, `file_path`, `file_size`, `thumbnail_url`, `created_at`) VALUES ('ver_7609ffef', 'mod_robot_01', 2, 'usr_modular', 'dasfsadfa afes fa ', '/uploads/models/file-1791206092102-573292966.glb', 48405256, NULL, '2026-10-05 13:14:52');

-- Data for `model_revisions`
INSERT INTO `model_revisions` (`id`, `model_id`, `business_id`, `user_id`, `revision_number`, `original_file_name`, `file_path`, `file_size`, `notes`, `status`, `coins_charged`, `cooldown_until`, `created_at`, `completed_at`) VALUES ('rev_pump_1', 'mod_pump_01', 'biz_apex', 'usr_apex', 1, 'apex_cp400_cad_rev1.step', '/uploads/revisions/rev1.step', 21500000, 'Initial CAD release with 4-bolt flange casing.', 'completed', 0, '2026-10-01 18:30:09', '2026-10-03 18:30:09', '2026-10-01 18:30:09');
INSERT INTO `model_revisions` (`id`, `model_id`, `business_id`, `user_id`, `revision_number`, `original_file_name`, `file_path`, `file_size`, `notes`, `status`, `coins_charged`, `cooldown_until`, `created_at`, `completed_at`) VALUES ('rev_pump_2', 'mod_pump_01', 'biz_apex', 'usr_apex', 2, 'apex_cp400_cad_rev2.step', '/uploads/revisions/rev2.step', 22100000, 'Updated suction impeller angle to 22 degrees for 12% higher slurry flow efficiency.', 'completed', 10, '2026-10-04 14:30:09', '2026-10-03 18:30:09', NULL);
INSERT INTO `model_revisions` (`id`, `model_id`, `business_id`, `user_id`, `revision_number`, `original_file_name`, `file_path`, `file_size`, `notes`, `status`, `coins_charged`, `cooldown_until`, `created_at`, `completed_at`) VALUES ('rev_bd1a602d', 'mod_robot_01', 'biz_modular', 'usr_modular', 2, '42b2def5-46c1-4b5e-a432-47a663241223 (1).glb', '/uploads/models/file-1791206092102-573292966.glb', 48405256, 'dasfsadfa afes fa ', 'completed', 0, '2026-10-06 13:14:52', '2026-10-05 13:14:52', '2026-10-05 13:14:52');

-- Data for `qr_codes`
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_pump', 'mod_pump_01', 'machinery_label', 'https://modelar.io/model/mod_pump_01', '/qr/mod_pump_01.png', 195, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_robot', 'mod_robot_01', 'brochure', 'https://modelar.io/model/mod_robot_01', '/qr/mod_robot_01.png', 412, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_kitchen', 'mod_kitchen_01', 'packaging', 'https://modelar.io/model/mod_kitchen_01', '/qr/mod_kitchen_01.png', 160, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_chair', 'mod_chair_01', 'showroom', 'https://modelar.io/model/mod_chair_01', '/qr/mod_chair_01.png', 620, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_hotel', 'mod_hotel_01', 'brochure', 'https://modelar.io/model/mod_hotel_01', '/qr/mod_hotel_01.png', 310, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_engine', 'mod_engine_01', 'machinery_label', 'https://modelar.io/model/mod_engine_01', '/qr/mod_engine_01.png', 780, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_manifold', 'mod_manifold_01', 'machinery_label', 'https://modelar.io/model/mod_manifold_01?token=sec_token_manifold_98234', '/qr/mod_manifold_01.png', 4, NULL, '2026-10-03 18:30:09', '2026-10-03 18:30:09');
INSERT INTO `qr_codes` (`id`, `model_id`, `preset`, `target_url`, `qr_image_url`, `scan_count`, `last_scanned_at`, `created_at`, `updated_at`) VALUES ('qr_ad201f99', 'mod_6dac37e9', 'brochure', 'http://localhost:5173/model/mod_6dac37e9', 'data:image/png;base64,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', 0, NULL, '2026-10-03 19:38:48', '2026-10-03 19:38:48');

-- Data for `model_analytics`
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_1', 'mod_pump_01', 'view', 'vis_101', 'Desktop', 'Chrome', 'Windows', NULL, '2026-10-03 08:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_2', 'mod_pump_01', 'ar_launch', 'vis_102', 'Mobile', 'Safari', 'iOS', NULL, '2026-10-03 10:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_3', 'mod_pump_01', 'qr_scan', 'vis_103', 'Mobile', 'Chrome', 'Android', NULL, '2026-10-03 12:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_4', 'mod_chair_01', 'view', 'vis_104', 'Desktop', 'Edge', 'Windows', NULL, '2026-10-03 13:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_5', 'mod_chair_01', 'ar_launch', 'vis_105', 'Mobile', 'Safari', 'iOS', NULL, '2026-10-03 14:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_6', 'mod_chair_01', 'qr_scan', 'vis_106', 'Mobile', 'Safari', 'iOS', NULL, '2026-10-03 15:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_7', 'mod_robot_01', 'view', 'vis_107', 'Desktop', 'Firefox', 'MacOS', NULL, '2026-10-03 16:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_8', 'mod_robot_01', 'ar_launch', 'vis_108', 'Mobile', 'Chrome', 'Android', NULL, '2026-10-03 17:30:09');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_dc751dba', 'mod_engine_01', 'view', 'anon_::1', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-03 18:43:34');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_ca25ccf9', 'mod_engine_01', 'view', 'anon_::1', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-03 18:43:34');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_9a82ca07', 'mod_6dac37e9', 'view', 'usr_apex', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-03 19:38:49');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_3a13e310', 'mod_hotel_01', 'view', 'usr_admin', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-04 13:45:56');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_9968afbc', 'mod_hotel_01', 'view', 'usr_admin', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-04 13:45:56');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_e0fbcc15', 'mod_engine_01', 'ar_launch', 'anon_628a6a', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 12:18:25');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_6ee37934', 'mod_engine_01', 'ar_launch', 'anon_6be5df', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 12:18:25');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_e1f893a3', 'mod_engine_01', 'view', 'usr_free', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-05 12:18:45');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_b5452138', 'mod_engine_01', 'view', 'usr_free', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-05 12:18:45');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_e096f5a3', 'mod_robot_01', 'view', 'usr_free', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-05 12:18:55');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_6bd13c26', 'mod_robot_01', 'ar_launch', 'anon_09fb75', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 12:19:25');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_359a151b', 'mod_robot_01', 'ar_launch', 'anon_45c5ae', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 12:19:25');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_fb28d1fe', 'mod_engine_01', 'ar_launch', 'anon_56836f', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 13:14:59');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_e4966584', 'mod_engine_01', 'ar_launch', 'anon_be35c7', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 13:14:59');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_6b284166', 'mod_robot_01', 'ar_launch', 'anon_00ce0f', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 13:15:04');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_ar_68a2f3ba', 'mod_robot_01', 'ar_launch', 'anon_60f3ef', 'Desktop', 'Safari', 'Win32', NULL, '2026-10-05 13:15:04');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_ac610049', 'mod_pump_01', 'view', 'usr_modular', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-05 13:16:33');
INSERT INTO `model_analytics` (`id`, `model_id`, `event_type`, `visitor_id`, `device_type`, `browser`, `os`, `referer`, `created_at`) VALUES ('ev_view_1cf18abe', 'mod_pump_01', 'view', 'usr_modular', 'Desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Web', NULL, '2026-10-05 13:16:33');

-- Data for `notifications`
INSERT INTO `notifications` (`id`, `business_id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_link`, `created_at`) VALUES ('notif_1', 'biz_apex', 'usr_apex', 'processing_complete', 'Model Ready: CP-400 Slurry Pump', 'Your 3D model was processed and optimized for WebGL and WebAR. 25 coins were deducted from your wallet.', 0, '/dashboard/my-models', '2026-10-03 18:30:09');
INSERT INTO `notifications` (`id`, `business_id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_link`, `created_at`) VALUES ('notif_2', 'biz_apex', 'usr_apex', 'cad_complete', 'CAD Revision #2 Approved', 'Revision #2 updated successfully. 24-hour cooldown is currently active.', 0, '/dashboard/cad-revisions', '2026-10-03 18:30:09');
INSERT INTO `notifications` (`id`, `business_id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_link`, `created_at`) VALUES ('notif_3', 'biz_modular', 'usr_modular', 'upload_complete', 'New Team Member Joined', 'Rajesh Patel accepted your invitation to Modular Living Spaces as Editor.', 0, '/dashboard/team', '2026-10-03 18:30:09');
INSERT INTO `notifications` (`id`, `business_id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_link`, `created_at`) VALUES ('notif_a7c38d98', 'biz_apex', 'usr_apex', 'processing_complete', 'Model Ready for 3D & WebAR', 'Your model "High-Pressure Hydraulic Valve Block" has been converted and is ready for WebAR. 25 coins were deducted.', 0, '/model/mod_6dac37e9', '2026-10-03 19:38:48');

-- Data for `platform_settings`
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('model_upload_coin_cost', '25', 'Coins charged per successful model upload & conversion', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('cad_revision_coin_cost', '10', 'Coins charged for extra CAD revisions', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('cad_cooldown_hours', '24', 'Cooldown required between CAD revisions', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('max_upload_size_mb', '50', 'Max initial file size limit in MB', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('supported_formats', 'glb,gltf,obj,stl,step', 'Supported 3D file formats', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('tax_gst_percentage', '18', 'GST percentage applied to coin and subscription sales', '2026-10-03 18:30:09');
INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES ('maintenance_mode', 'false', 'Global maintenance mode toggle', '2026-10-03 18:30:09');
