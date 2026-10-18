import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, Mail, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function Team({ setCurrentTab }) {
  const { success, error } = useToast();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await api.getTeam();
      setTeamData(data);
    } catch (err) {
      error(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await api.inviteTeamMember({ email, fullName, role });
      success(res.message || 'Team member added');
      setModalOpen(false);
      setEmail('');
      setFullName('');
      fetchTeam();
    } catch (err) {
      error(err.message || 'Failed to invite team member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return;
    try {
      await api.removeTeamMember(memberId);
      success('Team member removed');
      fetchTeam();
    } catch (err) {
      error(err.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.updateTeamRole(memberId, newRole);
      success('Role updated');
      fetchTeam();
    } catch (err) {
      error(err.message || 'Failed to update role');
    }
  };

  if (loading) return <div style={{ color: '#64748b' }}>Loading team members...</div>;

  const { members = [], currentCount = 1, maxAllowed = 1, canInviteMore, planName } = teamData || {};

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Team & User Logins</h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Collaborate with shared 3D storage, shared coin pool, and role-based permissions.
          </p>
        </div>

        {canInviteMore ? (
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <UserPlus size={16} />
            <span>Invite Team Member</span>
          </button>
        ) : (
          <button onClick={() => setCurrentTab('subscription')} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <span>Upgrade to Business for 10 Logins</span>
          </button>
        )}
      </div>

      {/* Plan Seats Quota Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>
            {currentCount} of {maxAllowed} User Seats Used
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Plan: <strong>{planName}</strong>. Business plan includes up to 10 invited logins with shared coin pool.
          </p>
        </div>

        {!canInviteMore && maxAllowed < 10 && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>Upgrade to Business plan to add up to 10 team members.</span>
          </div>
        )}
      </div>

      {/* Team Members Table */}
      <div className="card">
        <div className="table-wrapper">
          <table style={{ width: '100%', minWidth: '620px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Email</th>
                <th style={{ padding: '14px 16px' }}>Role</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.member_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.full_name}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    {m.email}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {m.role === 'owner' ? (
                      <span className="badge badge-primary">Owner</span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.member_id, e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                      {m.invite_status}
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(m.member_id, m.full_name)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Invite Team Member</h3>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Sneha Roy"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="colleague@company.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-select"
                >
                  <option value="editor">Editor (Can upload & edit models)</option>
                  <option value="admin">Admin (Can manage team & billing)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={inviting} className="btn btn-primary">
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
