-- Update user to Creator plan after successful Stripe payment
-- Run this in MySQL to update your plan manually

-- Update the plan (change the email to YOUR email)
UPDATE users 
SET plan = 'creator',
    subscription_status = 'active',
    subscription_start = NOW(),
    subscription_end = DATE_ADD(NOW(), INTERVAL 1 MONTH),
    updated_at = NOW()
WHERE email = 'rahul@rnddesigns.com'; -- CHANGE THIS TO YOUR EMAIL

-- Verify the update
SELECT id, email, plan, subscription_status, subscription_start, subscription_end 
FROM users 
WHERE email = 'rahul@rnddesigns.com'; -- CHANGE THIS TO YOUR EMAIL
