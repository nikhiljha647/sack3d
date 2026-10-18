/**
 * Update Rahul's business to Creator plan
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateRahulPlan() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sack'
    });

    console.log('Updating Rahul Product Design to Creator plan...');

    // Find Rahul's business
    const [businesses] = await connection.execute(`
      SELECT 
        b.id as business_id,
        b.name,
        s.id as subscription_id
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN subscriptions s ON b.id = s.business_id
      WHERE b.name LIKE '%Rahul%'
    `);

    if (businesses.length === 0) {
      console.log('Rahul Product Design not found!');
      await connection.end();
      return;
    }

    const rahulBiz = businesses[0];
    const newPlanId = 'plan_creator';

    if (rahulBiz.subscription_id) {
      // Update existing
      await connection.execute(`
        UPDATE subscriptions 
        SET plan_id = ?,
            status = 'active',
            current_period_start = NOW(),
            current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
            updated_at = NOW()
        WHERE id = ?
      `, [newPlanId, rahulBiz.subscription_id]);
    } else {
      // Create new
      const subId = 'sub_rahul_' + Date.now();
      await connection.execute(`
        INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end)
        VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 MONTH))
      `, [subId, rahulBiz.business_id, newPlanId]);
    }

    console.log('✅ Updated successfully!');
    console.log('Business:', rahulBiz.name);
    console.log('New Plan: Creator');
    console.log('\n🎉 Refresh your browser (Ctrl+R) to see the Creator plan!');

    await connection.end();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateRahulPlan();
