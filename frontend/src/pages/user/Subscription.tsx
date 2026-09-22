import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useAuthUser, useUserSubscriptions, useUserApplications } from '../../hooks/useUserData';

const Subscription = () => {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid;

  const { data: subscriptions = [], isLoading: subsLoading } = useUserSubscriptions(userId);
  const { data: applications = [], isLoading: appsLoading } = useUserApplications(userId);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loading = authLoading || (!!userId && (subsLoading || appsLoading));

  // Compute total, used, and remaining quota directly from RAM cache (matches UserDashboard.tsx)
  const totalQuota2Year = subscriptions.reduce((sum: number, s: any) => sum + Number(s.subscriptionCount || 0), 0);
  const usedQuota2Year = applications.filter((app: any) => (app.validity || '').trim() === '2 Years').length;
  const remainingQuota2Year = Math.max(0, totalQuota2Year - usedQuota2Year);

  const totalPages = Math.ceil(subscriptions.length / itemsPerPage) || 1;
  const paginatedSubscriptions = subscriptions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Additional Subscription</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View your additional subscription certificates and allocated quotas.</p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading subscriptions...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <CreditCard size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Additional Subscriptions</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You don't have any additional subscriptions. Contact your admin for subscription certificate access.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Banner */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3e8ff', border: '1px solid #a78bfa' }}>
            <div>
              <h4 style={{ fontWeight: 600, color: '#5b21b6', margin: 0 }}>Additional Subscription Quota</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#7c3aed', marginTop: '0.25rem' }}>
                Total: {totalQuota2Year} &nbsp;|&nbsp; Used: {usedQuota2Year} &nbsp;|&nbsp; Remaining: <strong>{remainingQuota2Year}</strong>
              </p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>
              {remainingQuota2Year}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            {/* Pagination controls above table */}
            {subscriptions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, subscriptions.length)} of {subscriptions.length} entries
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage === 1 ? '#94a3b8' : '#7c3aed', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    &laquo; First
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage === 1 ? '#94a3b8' : '#7c3aed', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    &lsaquo; Prev
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', padding: '0 0.5rem' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage >= totalPages ? '#94a3b8' : '#7c3aed', color: 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    Next &rsaquo;
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage >= totalPages ? '#94a3b8' : '#7c3aed', color: 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    Last &raquo;
                  </button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>#</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Payment Details</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Subscription Count</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Invoice</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubscriptions.map((sub, idx) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{((currentPage - 1) * itemsPerPage) + idx + 1}</td>
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
