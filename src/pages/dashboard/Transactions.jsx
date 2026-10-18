import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    api.getTransactions(100).then((data) => {
      setTransactions(data);
    }).catch(console.warn).finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.transaction_type === filterType;
  });

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
          <h1 style={{ fontSize: '1.9rem', marginBottom: '4px' }}>Coin Ledger & Transaction History</h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Full double-entry ledger audit log of all coin credits, subscriptions, daily bonuses, and upload deductions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.88rem', padding: '8px 14px' }}
          >
            <option value="all">All Transaction Types</option>
            <option value="model_upload">Model Uploads (-25 Coins)</option>
            <option value="subscription_credit">Subscription Allowance</option>
            <option value="coin_purchase">Coin Purchases</option>
            <option value="daily_credit">Daily Bonuses</option>
            <option value="cad_revision">CAD Revisions</option>
            <option value="signup_bonus">Signup Bonus</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading ledger records...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No transactions found matching the selected filter.
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Type / Date</th>
                  <th style={{ padding: '14px 16px' }}>Description</th>
                  <th style={{ padding: '14px 16px' }}>Coin Source</th>
                  <th style={{ padding: '14px 16px' }}>Related Asset</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: tx.amount > 0 ? '#ecfdf5' : '#fef2f2',
                          color: tx.amount > 0 ? '#10b981' : '#ef4444'
                        }}>
                          {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                            {tx.transaction_type.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {tx.description}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${tx.coin_source === 'purchased' ? 'badge-primary' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                        {tx.coin_source}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.82rem' }}>
                      {tx.model_title || tx.related_model_id || '—'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {tx.balance_after} Coins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
