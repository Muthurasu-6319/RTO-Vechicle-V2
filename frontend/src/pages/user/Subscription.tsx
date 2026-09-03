import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { auth } from '../../firebase';

const Subscription = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchSubs = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/api/subscriptions/user/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data);
        }
      } catch (err) {
        console.error('Failed to fetch subscriptions', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchSubs();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Subscriptions</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View your subscription certificates and allocated quotas.</p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading subscriptions...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <CreditCard size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Subscriptions</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You don't have any active subscriptions. Contact your admin for subscription certificate access.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Banner */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3e8ff', border: '1px solid #a78bfa' }}>
            <div>
              <h4 style={{ fontWeight: 600, color: '#5b21b6', margin: 0 }}>Total Subscription Quota</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#7c3aed' }}>Sum of all subscription counts</p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>
              {subscriptions.reduce((sum, s) => sum + Number(s.subscriptionCount || 0), 0)}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>#</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Consumer Name</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Subscription Count</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Invoice</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{sub.consumerName}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                          {sub.subscriptionCount}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{sub.date}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {sub.invoicePdfUrl ? (
                          <a href={sub.invoicePdfUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>Download</a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        {sub.approved ? (
                          <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Approved</span>
                        ) : (
                          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
