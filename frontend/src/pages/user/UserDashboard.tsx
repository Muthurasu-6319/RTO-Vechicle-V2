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

  const appliedCount = applications.filter((app: any) =>
    ['Pending', 'Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status)
  ).length;

  const certifiedCount = applications.filter((app: any) => app.status === 'Certified').length;

  const usedBalanceStock = applications.filter((app: any) => app.validity === '1 Year' || !app.validity).length; 
  const usedAdditionalSub = applications.filter((app: any) => app.validity === '2 Years').length;

  const remainingQuota = totalQuota1Year - usedBalanceStock;
  const remainingQuota2Year = totalQuota2Year - usedAdditionalSub;

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

        {/* Applications Submitted */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef3c7', color: '#f59e0b', borderRadius: '0.75rem' }}>
            <FileText size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Applied</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '...' : appliedCount}</p>
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
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Certificates</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No certificates generated yet.</p>
      </div>
    </div>
  );
};

export default UserDashboard;

