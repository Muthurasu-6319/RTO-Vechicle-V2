import React from 'react';
import { Package, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { useAuthUser, useUserApplications, useUserOrders, useUserSubscriptions } from '../../hooks/useUserData';

const UserDashboard = () => {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid;

  const { data: applications = [], isLoading: appsLoading } = useUserApplications(userId);
  const { data: orders = [], isLoading: ordersLoading } = useUserOrders(userId);
  const { data: subscriptions = [], isLoading: subsLoading } = useUserSubscriptions(userId);

  const loading = authLoading || (!!userId && (appsLoading || ordersLoading || subsLoading));

  // Compute quotas and application metrics directly from RAM cached data
  const totalQuota1Year = orders.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
  const totalQuota2Year = subscriptions.reduce((sum: number, s: any) => sum + Number(s.subscriptionCount || 0), 0);

  const installedCount = applications.filter((app: any) =>
    app.status !== 'Certified'
  ).length;

  const certifiedCount = applications.filter((app: any) => app.status === 'Certified').length;

  const usedBalanceStock = applications.length; // Every application deducts 1 count from Received Orders Total Stock
  const usedAdditionalSub = applications.filter((app: any) => (app.validity || '').trim() === '2 Years').length;

  const remainingQuota = Math.max(0, totalQuota1Year - usedBalanceStock);
  const remainingQuota2Year = Math.max(0, totalQuota2Year - usedAdditionalSub);

  // Sort recent certificates by createdAt descending
  const recentCertificates = [...applications]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome to your Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your devices and certificates from here.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Additional Subscription (2-Year Quota) */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f3e8ff', color: '#7c3aed', borderRadius: '0.75rem' }}>
            <CreditCard size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Additional Subscription</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '...' : remainingQuota2Year}</p>
          </div>
        </div>

        {/* Installed */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef3c7', color: '#f59e0b', borderRadius: '0.75rem' }}>
            <FileText size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Installed</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '...' : installedCount}</p>
          </div>
        </div>

        {/* Certified */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: '0.75rem' }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Certified</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '...' : certifiedCount}</p>
          </div>
        </div>

        {/* Balance Stock - 1 Year remaining quota */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', color: '#0ea5e9', borderRadius: '0.75rem' }}>
            <Package size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Balance Stock</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {loading ? '...' : remainingQuota}
            </p>
          </div>
        </div>

      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>Recent Certificates</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading recent certificates...</p>
        ) : recentCertificates.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No certificates generated yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Vehicle No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>IMEI No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>VLD S.No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Validity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCertificates.map((cert, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{cert.vehicleNo || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{cert.imei || cert.imeiNo || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{cert.vldSerial || cert.vldNo || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{cert.validity || '1 Year'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: cert.status === 'Certified' ? '#d1fae5' : cert.status === 'Installed' ? '#dbeafe' : '#fef3c7',
                        color: cert.status === 'Certified' ? '#047857' : cert.status === 'Installed' ? '#1d4ed8' : '#b45309'
                      }}>
                        {cert.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : '—'}
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
};

export default UserDashboard;

