import bcrypt from 'bcryptjs';
import db, { queryOne, execute, transaction } from './db.js';

export async function runSeeds() {
  if (process.env.SKIP_SEEDS === 'true') {
    console.log('[Seed] Seeding skipped via SKIP_SEEDS=true.');
    return;
  }

  try {
    const existingPlans = await queryOne('SELECT COUNT(*) as count FROM subscription_plans');
    if (existingPlans && existingPlans.count > 0) {
      console.log(`[Seed] Database is ready and populated (${existingPlans.count} subscription plans found). Skipping seed to preserve production data.`);
      return;
    }
  } catch (err) {
    console.log('[Seed] Database check note:', err.message);
    if (process.env.NODE_ENV === 'production' && process.env.FORCE_RUN_SEEDS !== 'true') {
      console.warn('[Seed] In production environment: skipping automatic seed generation to prevent unexpected data modifications. Please ensure schema is imported via sack.sql.');
      return;
    }
  }

  console.log('[Seed] Seeding ModelAR platform database...');

  try {
    await transaction(() => {
      // 1. Subscription Plans (Free ₹0, Creator ₹299 [Most Popular], Business ₹799)
    const insertPlan = db.prepare(`
      INSERT INTO subscription_plans (
        id, name, slug, tagline, price_inr, price_usd, billing_interval, is_popular,
        monthly_coins, storage_bytes, storage_text, cad_revisions_text, cad_revisions_monthly,
        cad_revisions_max_per_model, cad_revision_cost_coins, active_ar_models_limit,
        max_team_members, has_private_sharing, has_version_history, has_priority_processing,
        has_priority_support, button_text, features, signup_bonus_coins, daily_bonus_coins,
        daily_bonus_monthly_cap, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertPlan.run(
      'plan_free', 'Free', 'free', 'Try out 3d and AR sharing solo', 0, 0.00, 'month', 0,
      30, 1073741824, '1 GB', '1 free, 3 max', 1, 3, 10, 10, 1, 0, 0, 0, 0,
      'Start free',
      JSON.stringify([
        '100 bonus coins on signup',
        '30 coins/month allowance',
        '1 free CAD revision per model, then 10 coins',
        'Public sharing and QR links',
        'Community support'
      ]),
      100, 0, 0
    );

    insertPlan.run(
      'plan_creator', 'Creator', 'creator', 'Solo freelancers and photographers', 299, 4.00, 'month', 1,
      300, 10737418240, '10 GB', '5/mo, 10 max', 5, 10, 10, 25, 1, 1, 0, 0, 0,
      'Subscribe to Creator',
      JSON.stringify([
        '1 workspace, 1 login (solo)',
        '25 active AR models',
        '+20 coins/day (capped at 60/mo)',
        'Private and public sharing',
        'Coin top-ups, email support'
      ]),
      0, 20, 60
    );

    insertPlan.run(
      'plan_business', 'Business', 'business', 'Teams of 3+ logins, shared workspace', 799, 10.00, 'month', 0,
      1000, 53687091200, '50 GB', '30/mo, 15 max', 30, 15, 10, 100, 10, 1, 1, 1, 1,
      'Subscribe to Business',
      JSON.stringify([
        '1 workspace, up to 10 invited logins',
        'Shared coin pool and storage',
        '100 active AR models',
        '+20 coins/day (capped at 200/mo)',
        'Priority processing and support'
      ]),
      0, 20, 200
    );

    // 2. Coin Top-up Packages
    const insertPackage = db.prepare(`
      INSERT INTO coin_packages (id, name, coin_amount, price_inr, gst_percentage, is_popular, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertPackage.run('pkg_60', 'Starter Pack', 60, 49, 18, 0, 1);
    insertPackage.run('pkg_300', 'Pro Creator Pack', 300, 199, 18, 1, 2);
    insertPackage.run('pkg_1000', 'Enterprise Booster', 1000, 599, 18, 0, 3);

    // 3. Platform Settings
    const insertSetting = db.prepare(`
      INSERT INTO platform_settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
    `);
    insertSetting.run('model_upload_coin_cost', '25', 'Coins charged per successful model upload & conversion');
    insertSetting.run('cad_revision_coin_cost', '10', 'Coins charged for extra CAD revisions');
    insertSetting.run('cad_cooldown_hours', '24', 'Cooldown required between CAD revisions');
    insertSetting.run('max_upload_size_mb', '50', 'Max initial file size limit in MB');
    insertSetting.run('supported_formats', 'glb,gltf,obj,stl,step', 'Supported 3D file formats');
    insertSetting.run('tax_gst_percentage', '18', 'GST percentage applied to coin and subscription sales');
    insertSetting.run('maintenance_mode', 'false', 'Global maintenance mode toggle');

    // 4. Categories (B2B focus)
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, slug, icon, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const categories = [
      ['cat_ind', 'Industrial & Manufacturing', 'industrial-manufacturing', 'factory', 'Heavy plant equipment, valves, assembly parts and manufacturing jigs', 1],
      ['cat_mach', 'Machinery & Equipment', 'machinery-equipment', 'cog', 'High-precision pumps, motors, industrial automation and robotics', 2],
      ['cat_food', 'Food & Restaurant', 'food-restaurant', 'utensils', 'Commercial food production units, display cases and catering equipment', 3],
      ['cat_kit', 'Commercial Kitchens', 'commercial-kitchens', 'flame', 'Stainless steel ranges, industrial combi-ovens and prep stations', 4],
      ['cat_furn', 'Furniture & Interior', 'furniture-interior', 'armchair', 'Architectural furniture, ergonomic office setups and contract seating', 5],
      ['cat_hosp', 'Hospitality & Hotels', 'hospitality-hotels', 'bed', 'Luxury suite furnishings, lobby installations and resort fixtures', 6],
      ['cat_arch', 'Architecture & Construction', 'architecture-construction', 'building', 'Prefab modules, structural connectors, HVAC ducts and facades', 7],
      ['cat_comm', 'Commercial Spaces', 'commercial-spaces', 'store', 'Retail store fixtures, exhibition booths and point-of-sale setups', 8],
      ['cat_auto', 'Automotive', 'automotive', 'car', 'Engine components, EV battery packs, drivetrain assemblies and chassis', 9],
      ['cat_eng', 'Engineering', 'engineering', 'cpu', 'Precision robotics, mechatronics and specialized laboratory test apparatus', 10],
    ];
    categories.forEach(c => insertCat.run(...c));

    // 5. Users
    const passwordHash = bcrypt.hashSync('Password123!', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, is_verified, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin
    insertUser.run('usr_admin', 'admin@modelar.io', passwordHash, 'ModelAR Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'admin', 1, 1);
    // Business 1 Owner (Creator Plan)
    insertUser.run('usr_apex', 'contact@apexmfg.com', passwordHash, 'Vikram Mehta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'user', 1, 1);
    // Business 2 Owner (Business Plan with team)
    insertUser.run('usr_modular', 'kavita@modulardesign.in', passwordHash, 'Kavita Sundaram', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 'user', 1, 1);
    // Team member 1
    insertUser.run('usr_rajesh', 'rajesh@modulardesign.in', passwordHash, 'Rajesh Patel', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 'user', 1, 1);
    // Free Tier user
    insertUser.run('usr_free', 'rahul@rahuldesigns.com', passwordHash, 'Rahul Varma', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80', 'user', 1, 1);

    // 6. Businesses & Workspaces
    const insertBiz = db.prepare(`
      INSERT INTO businesses (id, owner_id, name, slug, industry, description, website, storage_used_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertWorkspace = db.prepare(`
      INSERT INTO workspaces (id, business_id, name)
      VALUES (?, ?, ?)
    `);

    insertBiz.run('biz_apex', 'usr_apex', 'Apex Heavy Engineering', 'apex-heavy-engineering', 'Industrial & Manufacturing', 'Precision pumps, compressors, and hydraulic manifolds for heavy industry.', 'https://apexmfg.example.com', 48234496); // ~46MB
    insertWorkspace.run('ws_apex', 'biz_apex', 'Apex Core Workspace');

    insertBiz.run('biz_modular', 'usr_modular', 'Modular Living Spaces', 'modular-living-spaces', 'Furniture & Interior', 'B2B ergonomic contract furniture and commercial architectural fixtures.', 'https://modularspaces.example.com', 128974848); // ~123MB
    insertWorkspace.run('ws_modular', 'biz_modular', 'Modular Design Studio');

    insertBiz.run('biz_rahul', 'usr_free', 'Rahul Product Design', 'rahul-product-design', 'Engineering', 'Independent engineering prototypes and CAD models.', 'https://rahuldesigns.example.com', 18874368); // ~18MB
    insertWorkspace.run('ws_rahul', 'biz_rahul', 'Rahul Free Workspace');

    // 7. Team Members
    const insertTeam = db.prepare(`
      INSERT INTO team_members (id, business_id, user_id, role, invite_status)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertTeam.run('team_mod_1', 'biz_modular', 'usr_modular', 'owner', 'accepted');
    insertTeam.run('team_mod_2', 'biz_modular', 'usr_rajesh', 'editor', 'accepted');
    insertTeam.run('team_apex_1', 'biz_apex', 'usr_apex', 'owner', 'accepted');
    insertTeam.run('team_rahul_1', 'biz_rahul', 'usr_free', 'owner', 'accepted');

    // 8. Subscriptions
    const insertSub = db.prepare(`
      INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end)
      VALUES (?, ?, ?, ?, datetime('now', '+30 days'))
    `);
    insertSub.run('sub_apex', 'biz_apex', 'plan_creator', 'active');
    insertSub.run('sub_modular', 'biz_modular', 'plan_business', 'active');
    insertSub.run('sub_rahul', 'biz_rahul', 'plan_free', 'active');

    // 9. Wallets (Separate accounting for subscription vs purchased coins)
    const insertWallet = db.prepare(`
      INSERT INTO wallets (id, business_id, subscription_balance, purchased_balance, daily_bonus_claimed_this_month, last_daily_bonus_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))
    `);
    insertWallet.run('wal_apex', 'biz_apex', 225, 300, 0); // Total: 525 coins
    insertWallet.run('wal_modular', 'biz_modular', 875, 450, 0); // Total: 1325 coins
    insertWallet.run('wal_rahul', 'biz_rahul', 35, 60, 40); // Total: 95 coins

    // 10. Ledger Transactions for Wallets
    const insertTx = db.prepare(`
      INSERT INTO coin_transactions (
        id, wallet_id, user_id, business_id, amount, coin_source, transaction_type,
        description, related_model_id, payment_id, balance_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    // Apex Ledger
    insertTx.run('tx_a1', 'wal_apex', 'usr_apex', 'biz_apex', 100, 'subscription', 'signup_bonus', 'Signup welcome bonus coins', null, null, 100, '-25 days');
    insertTx.run('tx_a2', 'wal_apex', 'usr_apex', 'biz_apex', 300, 'subscription', 'subscription_credit', 'Creator Monthly Subscription Allowance', null, null, 400, '-20 days');
    insertTx.run('tx_a3', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Apex Centrifugal Slurry Pump', 'mod_pump_01', null, 375, '-15 days');
    insertTx.run('tx_a4', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Industrial Screw Compressor', 'mod_compressor_01', null, 350, '-10 days');
    insertTx.run('tx_a5', 'wal_apex', 'usr_apex', 'biz_apex', 300, 'purchased', 'coin_purchase', 'Purchased Pro Creator Pack (300 coins)', null, 'pay_apex_1', 650, '-5 days');
    insertTx.run('tx_a6', 'wal_apex', 'usr_apex', 'biz_apex', -25, 'subscription', 'model_upload', 'Model upload: Hydraulic Manifold Assembly', 'mod_manifold_01', null, 525, '-1 days');

    // Modular Ledger
    insertTx.run('tx_m1', 'wal_modular', 'usr_modular', 'biz_modular', 1000, 'subscription', 'subscription_credit', 'Business Plan Monthly Coin Pool', null, null, 1000, '-18 days');
    insertTx.run('tx_m2', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: ErgoPro Executive Task Chair', 'mod_chair_01', null, 975, '-14 days');
    insertTx.run('tx_m3', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: Commercial 6-Burner Range & Combi Oven', 'mod_kitchen_01', null, 950, '-11 days');
    insertTx.run('tx_m4', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: Luxury Hotel Suite Modular Pod', 'mod_hotel_01', null, 925, '-7 days');
    insertTx.run('tx_m5', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: 6-Axis Articulated Robotic Arm', 'mod_robot_01', null, 900, '-4 days');
    insertTx.run('tx_m6', 'wal_modular', 'usr_modular', 'biz_modular', -25, 'subscription', 'model_upload', 'Model upload: V6 Twin-Turbo Automotive Powertrain', 'mod_engine_01', null, 875, '-2 days');
    insertTx.run('tx_m7', 'wal_modular', 'usr_modular', 'biz_modular', 450, 'purchased', 'coin_purchase', 'Custom Coin Purchase for Q4 Product Catalog rollout', null, 'pay_mod_1', 1325, '-1 days');

    // 11. Galleries
    const insertGal = db.prepare(`
      INSERT INTO galleries (id, business_id, name, slug, description, thumbnail_url, is_public, model_count, storage_used_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGal.run('gal_pumps', 'biz_apex', 'High-Pressure Pumps & Turbines', 'high-pressure-pumps', 'Heavy-duty industrial slurry pumps, turbines, and fluid dynamics gear for process industries.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 1, 2, 32184320);
    insertGal.run('gal_hydraulics', 'biz_apex', 'Pneumatics & Manifolds', 'pneumatics-manifolds', 'Precision CNC-machined distribution blocks, valves, and industrial compressor units.', 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80', 1, 1, 16050176);
    insertGal.run('gal_furn', 'biz_modular', 'Ergonomic Workspaces & Seating', 'ergonomic-workspaces', 'Contract architectural furniture designed for modern corporate and commercial interiors.', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80', 1, 1, 24500000);
    insertGal.run('gal_hospitality', 'biz_modular', 'Hospitality & Commercial Kitchen', 'hospitality-kitchen', 'Turnkey hotel room pods and heavy-duty stainless steel commercial cooking equipment.', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', 1, 2, 58200000);
    insertGal.run('gal_robotics', 'biz_modular', 'Automation & Powertrain', 'automation-powertrain', 'Mechatronic assembly cells, robotic grippers, and high-performance automotive subsystems.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', 1, 2, 46274848);

    // 12. Models (Rich B2B showcase models across target industries)
    const insertModel = db.prepare(`
      INSERT INTO models (
        id, business_id, gallery_id, category_id, title, slug, description, visibility,
        share_token, thumbnail_url, original_file_name, original_file_format, original_file_size,
        web_ready_file_url, web_ready_file_size, storage_total_bytes, processing_status,
        processing_progress, ar_enabled, ar_active, qr_code_url, current_version,
        views_count, unique_views_count, ar_views_count, qr_scans_count, shares_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    // Model 1: Centrifugal Slurry Pump
    insertModel.run(
      'mod_pump_01', 'biz_apex', 'gal_pumps', 'cat_mach',
      'Apex CP-400 Industrial Centrifugal Pump', 'apex-cp400-industrial-centrifugal-pump',
      'High-capacity centrifugal slurry pump engineered for abrasive mining, chemical processing, and wastewater treatment. Features high-chrome alloy impeller, double mechanical seal, and flange connections rated for 16 bar operation.',
      'public', 'shr_cp400_pub',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      'apex_cp400_cad_rev3.step', 'step', 22100000,
      '/models/sample_pump.glb', 16500000, 38600000, 'ready',
      100, 1, 1, '/qr/mod_pump_01.png', 2,
      1420, 890, 312, 195, 84
    );

    // Model 2: 6-Axis Articulated Robotic Arm
    insertModel.run(
      'mod_robot_01', 'biz_modular', 'gal_robotics', 'cat_ind',
      'OmniBot-X6 Articulated Industrial Robotic Arm', 'omnibot-x6-articulated-robotic-arm',
      'Payload capacity 20kg with 1.8m reach. Precision harmonic drive gearboxes on all 6 axes with repeatability ±0.03mm. Ideal for pick-and-place, welding, and machine tending in automotive and electronics manufacturing.',
      'public', 'shr_robot_pub',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      'omnibot_x6_full_assembly.glb', 'glb', 18400000,
      '/models/sample_robot.glb', 14200000, 32600000, 'ready',
      100, 1, 1, '/qr/mod_robot_01.png', 1,
      2180, 1420, 645, 412, 190
    );

    // Model 3: Commercial Combi Oven & Range
    insertModel.run(
      'mod_kitchen_01', 'biz_modular', 'gal_hospitality', 'cat_kit',
      'ThermoMaster 10-Pan Commercial Combi Steamer', 'thermomaster-10pan-commercial-combi-steamer',
      'Heavy-gauge AISI 304 stainless steel combi steamer with touch interface, auto-clean cycle, and boilerless injection system. Built for high-volume hotel banquets and commercial kitchen production.',
      'public', 'shr_combi_pub',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      'thermomaster_10p.obj', 'obj', 15600000,
      '/models/sample_oven.glb', 11800000, 27400000, 'ready',
      100, 1, 1, '/qr/mod_kitchen_01.png', 1,
      980, 610, 280, 160, 52
    );

    // Model 4: ErgoPro Executive Task Chair
    insertModel.run(
      'mod_chair_01', 'biz_modular', 'gal_furn', 'cat_furn',
      'AeroMesh Ergonomic Task Chair', 'aeromesh-ergonomic-task-chair',
      'Commercial contract seating with 4D adjustable armrests, dynamic lumbar support, and breathable elastomer mesh. Designed for LEED-certified workspaces and corporate headquarters.',
      'public', 'shr_chair_pub',
      'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=800&q=80',
      'aeromesh_chair_v1.gltf', 'gltf', 12300000,
      '/models/sample_chair.glb', 8900000, 21200000, 'ready',
      100, 1, 1, '/qr/mod_chair_01.png', 1,
      3450, 2100, 890, 620, 240
    );

    // Model 5: Luxury Hotel Suite Modular Pod
    insertModel.run(
      'mod_hotel_01', 'biz_modular', 'gal_hospitality', 'cat_hosp',
      'Aura Signature Hotel Suite Architectural Pod', 'aura-signature-hotel-suite-architectural-pod',
      'Prefabricated modular luxury guestroom suite including integrated headboard, acoustic ceiling baffles, custom millwork, and bathroom transition bulkhead. Scalable for boutique hotel retrofits.',
      'public', 'shr_hotel_pub',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
      'aura_suite_pod_rev1.glb', 'glb', 24100000,
      '/models/sample_hotel.glb', 18600000, 42700000, 'ready',
      100, 1, 1, '/qr/mod_hotel_01.png', 1,
      1890, 1140, 520, 310, 115
    );

    // Model 6: V6 Twin-Turbo Automotive Powertrain
    insertModel.run(
      'mod_engine_01', 'biz_modular', 'gal_robotics', 'cat_auto',
      'Apex-T6 3.5L Twin-Turbocharged V6 Engine', 'apex-t6-3-5l-twin-turbocharged-v6-engine',
      'Complete powertrain assembly with dual overhead camshafts, direct fuel injection, intercooler piping, and exhaust turbocharger runners. High-polygon engineering CAD converted for interactive client review.',
      'public', 'shr_engine_pub',
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
      'v6_twin_turbo_block.step', 'step', 31200000,
      '/models/sample_engine.glb', 22400000, 53600000, 'ready',
      100, 1, 1, '/qr/mod_engine_01.png', 1,
      4120, 2800, 1120, 780, 320
    );

    // Model 7: Private Proprietary Hydraulic Manifold (Private Mode Demo)
    insertModel.run(
      'mod_manifold_01', 'biz_apex', 'gal_hydraulics', 'cat_ind',
      'HydraBlock-500 Custom Manifold Assembly (Proprietary)', 'hydrablock-500-custom-manifold',
      'Confidential customer specification manifold with integrated proportional flow valves and pressure relief ports. Strict B2B client NDA model.',
      'private', 'sec_token_manifold_98234',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      'hydrablock_500_nda.step', 'step', 9800000,
      '/models/sample_manifold.glb', 6250176, 16050176, 'ready',
      100, 0, 0, '/qr/mod_manifold_01.png', 1,
      45, 12, 0, 4, 2
    );

    // 13. QR Codes for each model
    const insertQR = db.prepare(`
      INSERT INTO qr_codes (id, model_id, preset, target_url, qr_image_url, scan_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertQR.run('qr_pump', 'mod_pump_01', 'machinery_label', 'https://modelar.io/model/mod_pump_01', '/qr/mod_pump_01.png', 195);
    insertQR.run('qr_robot', 'mod_robot_01', 'brochure', 'https://modelar.io/model/mod_robot_01', '/qr/mod_robot_01.png', 412);
    insertQR.run('qr_kitchen', 'mod_kitchen_01', 'packaging', 'https://modelar.io/model/mod_kitchen_01', '/qr/mod_kitchen_01.png', 160);
    insertQR.run('qr_chair', 'mod_chair_01', 'showroom', 'https://modelar.io/model/mod_chair_01', '/qr/mod_chair_01.png', 620);
    insertQR.run('qr_hotel', 'mod_hotel_01', 'brochure', 'https://modelar.io/model/mod_hotel_01', '/qr/mod_hotel_01.png', 310);
    insertQR.run('qr_engine', 'mod_engine_01', 'machinery_label', 'https://modelar.io/model/mod_engine_01', '/qr/mod_engine_01.png', 780);
    insertQR.run('qr_manifold', 'mod_manifold_01', 'machinery_label', 'https://modelar.io/model/mod_manifold_01?token=sec_token_manifold_98234', '/qr/mod_manifold_01.png', 4);

    // 14. CAD Revision history for mod_pump_01 (demonstrating versioning & cooldown)
    const insertRev = db.prepare(`
      INSERT INTO model_revisions (
        id, model_id, business_id, user_id, revision_number, original_file_name,
        file_path, file_size, notes, status, coins_charged, cooldown_until, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
    `);
    insertRev.run(
      'rev_pump_1', 'mod_pump_01', 'biz_apex', 'usr_apex', 1, 'apex_cp400_cad_rev1.step',
      '/uploads/revisions/rev1.step', 21500000, 'Initial CAD release with 4-bolt flange casing.',
      'completed', 0, '-2 days', '-2 days'
    );
    insertRev.run(
      'rev_pump_2', 'mod_pump_01', 'biz_apex', 'usr_apex', 2, 'apex_cp400_cad_rev2.step',
      '/uploads/revisions/rev2.step', 22100000, 'Updated suction impeller angle to 22 degrees for 12% higher slurry flow efficiency.',
      'completed', 10, '+20 hours', 'now' // 20 hours remaining in cooldown
    );

    // 15. Model Versions for Business Plan rollback (Modular Living mod_chair_01)
    const insertVer = db.prepare(`
      INSERT INTO model_versions (id, model_id, version_number, created_by_user_id, notes, file_path, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertVer.run('ver_c1', 'mod_chair_01', 1, 'usr_modular', 'Initial production mesh with chrome base', '/models/sample_chair_v1.glb', 8900000);
    insertVer.run('ver_c2', 'mod_chair_01', 2, 'usr_modular', 'Updated elastomeric tension weave and matte black aluminum frame', '/models/sample_chair.glb', 8900000);

    // 16. Analytics Events (views, AR launches, QR scans over time)
    const insertAnalytics = db.prepare(`
      INSERT INTO model_analytics (id, model_id, event_type, visitor_id, device_type, browser, os, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    const events = [
      ['ev_1', 'mod_pump_01', 'view', 'vis_101', 'Desktop', 'Chrome', 'Windows', '-10 hours'],
      ['ev_2', 'mod_pump_01', 'ar_launch', 'vis_102', 'Mobile', 'Safari', 'iOS', '-8 hours'],
      ['ev_3', 'mod_pump_01', 'qr_scan', 'vis_103', 'Mobile', 'Chrome', 'Android', '-6 hours'],
      ['ev_4', 'mod_chair_01', 'view', 'vis_104', 'Desktop', 'Edge', 'Windows', '-5 hours'],
      ['ev_5', 'mod_chair_01', 'ar_launch', 'vis_105', 'Mobile', 'Safari', 'iOS', '-4 hours'],
      ['ev_6', 'mod_chair_01', 'qr_scan', 'vis_106', 'Mobile', 'Safari', 'iOS', '-3 hours'],
      ['ev_7', 'mod_robot_01', 'view', 'vis_107', 'Desktop', 'Firefox', 'MacOS', '-2 hours'],
      ['ev_8', 'mod_robot_01', 'ar_launch', 'vis_108', 'Mobile', 'Chrome', 'Android', '-1 hours'],
    ];
    events.forEach(e => insertAnalytics.run(...e));

    // 17. Sample Notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, type, title, message, related_link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertNotif.run('notif_1', 'biz_apex', 'usr_apex', 'processing_complete', 'Model Ready: CP-400 Slurry Pump', 'Your 3D model was processed and optimized for WebGL and WebAR. 25 coins were deducted from your wallet.', '/dashboard/my-models');
    insertNotif.run('notif_2', 'biz_apex', 'usr_apex', 'cad_complete', 'CAD Revision #2 Approved', 'Revision #2 updated successfully. 24-hour cooldown is currently active.', '/dashboard/cad-revisions');
    insertNotif.run('notif_3', 'biz_modular', 'usr_modular', 'upload_complete', 'New Team Member Joined', 'Rajesh Patel accepted your invitation to Modular Living Spaces as Editor.', '/dashboard/team');
    });
    console.log('[Seed] Database successfully seeded with production-grade B2B models, plans, wallets, and analytics.');
  } catch (seedErr) {
    console.warn('[Seed Note]:', seedErr.message);
  }
}
