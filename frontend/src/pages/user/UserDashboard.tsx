import React, { useState, useEffect } from 'react';
import { Package, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

const UserDashboard = () => {
  const [quota, setQuota] = useState({
    totalQuota: 0,
    usedQuota: 0,
    remainingQuota: 0,
    totalQuota2Year: 0,
    usedQuota2Year: 0,
    remainingQuota2Year: 0
  });
  const [loading, setLoading] = useState(true);
  const [appliedCount, setAppliedCount] = useState(0);
  const [certifiedCount, setCertifiedCount] = useState(0);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch total stock from orders (1-year) + subscriptions (2-year)
      const [ordersSnap, subsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'subscriptions'), where('userId', '==', user.uid)))
      ]);

      let totalQuota1Year = 0;
      ordersSnap.forEach(doc => { totalQuota1Year += Number(doc.data().quantity || 0); });

      let totalQuota2Year = 0;
      subsSnap.forEach(doc => { totalQuota2Year += Number(doc.data().subscriptionCount || 0); });

      // Real-time listener: balance recalculates instantly when application is added/removed
      const appsRef = collection(db, 'applications');
      const q = query(appsRef, where('userId', '==', user.uid));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const allApps = snapshot.docs.map(doc => doc.data());

        const appliedApps = allApps.filter((app: any) =>
          ['Pending', 'Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status)
        );
        const certifiedApps = allApps.filter((app: any) => app.status === 'Certified');

        // Every application consumes 1 Balance Stock. Only 2-Year applications consume Additional Subscription.
        const usedBalanceStock = allApps.length; 
        const usedAdditionalSub = allApps.filter((app: any) => app.validity === '2 Years').length;

        setAppliedCount(appliedApps.length);
        setCertifiedCount(certifiedApps.length);
        setQuota({
          totalQuota: totalQuota1Year,
          usedQuota: usedBalanceStock,
          remainingQuota: totalQuota1Year - usedBalanceStock,
          totalQuota2Year,
          usedQuota2Year: usedAdditionalSub,
          remainingQuota2Year: totalQuota2Year - usedAdditionalSub
        });
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

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
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{loading ? '...' : quota.remainingQuota2Year}</p>
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
              {loading ? '...' : quota.remainingQuota}
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
