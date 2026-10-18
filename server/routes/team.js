import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, queryAll, execute, transaction } from '../config/db.js';
import { authMiddleware, requireBusinessRole } from '../middleware/auth.js';
import { canAddTeamMember, getBusinessContext } from '../services/businessRules.js';

const router = express.Router();

// List team members for the business
router.get('/', authMiddleware, async (req, res) => {
  try {
    const members = await queryAll(`
      SELECT tm.id as member_id, tm.role, tm.invite_status, tm.created_at as joined_at,
             u.id as user_id, u.full_name, u.email, u.avatar_url
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.business_id = ? AND tm.invite_status != 'revoked'
      ORDER BY CASE WHEN tm.role = 'owner' THEN 1 WHEN tm.role = 'admin' THEN 2 ELSE 3 END
    `, [req.business.id]);

    const ctx = await getBusinessContext(req.business.id);
    const maxAllowed = ctx.plan.max_team_members || 1;

    res.json({
      members,
      currentCount: members.length,
      maxAllowed,
      canInviteMore: members.length < maxAllowed,
      planName: ctx.plan.plan_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invite team member
router.post('/invite', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { email, fullName, role = 'editor' } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const check = await canAddTeamMember(req.business.id);
    if (!check.allowed) {
      return res.status(400).json({ error: check.reason, code: check.code });
    }

    const cleanEmail = email.toLowerCase().trim();

    const result = await transaction(async () => {
      // Find or create user
      let user = await queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (!user) {
        const newUserId = 'usr_' + uuidv4().slice(0, 8);
        const randomPassword = 'InvitedUser' + Math.floor(Math.random() * 8999 + 1000) + '!';
        const hash = bcrypt.hashSync(randomPassword, 10);
        await execute(`
          INSERT INTO users (id, email, password_hash, full_name, role, is_verified, is_active)
          VALUES (?, ?, ?, ?, 'user', 1, 1)
        `, [newUserId, cleanEmail, hash, fullName || cleanEmail.split('@')[0]]);
        user = await queryOne('SELECT * FROM users WHERE id = ?', [newUserId]);
      }

      // Check if already in team
      const existingMember = await queryOne(`
        SELECT * FROM team_members WHERE business_id = ? AND user_id = ?
      `, [req.business.id, user.id]);

      if (existingMember) {
        if (existingMember.invite_status === 'accepted') {
          throw new Error('This user is already an active member of this organization.');
        } else {
          await execute('UPDATE team_members SET role = ?, invite_status = "accepted" WHERE id = ?', [role, existingMember.id]);
          return { memberId: existingMember.id, user };
        }
      }

      const memberId = 'tm_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO team_members (id, business_id, user_id, role, invite_status, invited_email)
        VALUES (?, ?, ?, ?, 'accepted', ?)
      `, [memberId, req.business.id, user.id, role, cleanEmail]);

      return { memberId, user };
    });

    res.status(201).json({
      message: `Team member ${cleanEmail} added successfully with role "${role}".`,
      member: result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update team member role
router.put('/:id/role', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be one of: admin, editor, viewer' });
    }

    const member = await queryOne('SELECT * FROM team_members WHERE id = ? AND business_id = ?', [id, req.business.id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.role === 'owner') return res.status(400).json({ error: 'Cannot change owner role' });

    await execute('UPDATE team_members SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, id]);

    res.json({ message: 'Role updated successfully', memberId: id, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove team member
router.delete('/:id', authMiddleware, requireBusinessRole(['owner', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const member = await queryOne('SELECT * FROM team_members WHERE id = ? AND business_id = ?', [id, req.business.id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.role === 'owner') return res.status(400).json({ error: 'Cannot remove organization owner' });

    await execute('DELETE FROM team_members WHERE id = ?', [id]);
    res.json({ message: 'Team member removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
