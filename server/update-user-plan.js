/**
 * Quick script to manually update user plan after successful Stripe payment
 * Run this with: node server/update-user-plan.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateUserPlan() {
  try {
    console.log('Connecting to MySQL database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sack'
    });

    console.log('Connected! Fetching recent businesses and subscriptions...');

    // Get businesses with their subscriptions
    const [businesses] = await connection.execute(`
      SELECT 
        b.id as business_id,
        b.name as business_name,
        b.owner_id,
        u.email,
        s.id as subscription_id,
        s.plan_id,
        s.status,
        sp.name as plan_name
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN subscriptions s ON b.id = s.business_id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    console.log('\n=== Recent Businesses ===');
    businesses.forEach((biz, index) => {
      console.log(`${index + 1}. Business: ${biz.business_name}, Owner: ${biz.email}, Plan: ${biz.plan_name || 'Free (No subscription)'}`);
    });

    if (businesses.length === 0) {
      console.log('No businesses found!');
      await connection.end();
      return;
    }

    const targetBusiness = businesses[0];
    const newPlanId = 'plan_creator';

    console.log(`\n=== Updating Business: ${targetBusiness.business_name} ===`);
    console.log(`Owner: ${targetBusiness.email}`);
    console.log(`Current Plan: ${targetBusiness.plan_name || 'Free'}`);
    console.log(`New Plan: Creator`);

    if (targetBusiness.subscription_id) {
      // Update existing subscription
      console.log('\nUpdating existing subscription...');
      await connection.execute(`
        UPDATE subscriptions 
        SET plan_id = ?,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
            updated_at = NOW()
        WHERE id = ?
      `, [newPlanId, targetBusiness.subscription_id]);
    } else {
      // Create new subscription
      console.log('\nCreating new subscription...');
      const subscriptionId = 'sub_' + Date.now();
      await connection.execute(`
        INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end)
        VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 MONTH))
      `, [subscriptionId, targetBusiness.business_id, newPlanId]);
    }

    console.log('✅ Subscription updated successfully!');

    // Verify
    const [updated] = await connection.execute(`
      SELECT 
        b.name as business_name,
        u.email,
        sp.name as plan_name,
        s.status,
        s.current_period_end
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN subscriptions s ON b.id = s.business_id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE b.id = ?
    `, [targetBusiness.business_id]);

    console.log('\n=== Updated Business Info ===');
    console.log(updated[0]);

    await connection.end();
    console.log('\n🎉 Done! Refresh your browser to see the Creator plan.');
    console.log('Press Ctrl+R in your browser to reload the page.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateUserPlan();
