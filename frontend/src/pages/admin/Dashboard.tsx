import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Package, Activity, CreditCard, HardDrive, Wrench } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    applications: 0,
    pendingReview: 0,
    certificatesIssued: 0,
    installed: 0,
    totalOrders: 0,
    totalOrderQuantity: 0,
    deviceStock: 0,
    subscriptions: 0
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
  const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || '';
  const adminManufacturer = sessionStorage.getItem('adminManufacturer') || localStorage.getItem('adminManufacturer') || '';
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
  const isStandard = !isSuperAdmin && (adminRole.includes('standard') || !!adminManufacturer);

  useEffect(() => {
    let unsubscribeUsers: () => void = () => {};
    let unsubscribeApps: () => void = () => {};
    let unsubscribeOrders: () => void = () => {};
    let unsubscribeSubs: () => void = () => {};
    let unsubscribePurchases: () => void = () => {};

    // 1. Initial API Fetch
    const fetchStats = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        const url = adminManufacturer 
          ? `${backendUrl}/api/stats/admin?manufacturer=${encodeURIComponent(adminManufacturer)}`
          : `${backendUrl}/api/stats/admin`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            setStats(prev => ({ ...prev, ...data }));
          }
        }
      } catch (err) {
        console.warn('Backend stats fetch warning, using Firestore Web SDK real-time sync', err);
      }
    };
    fetchStats();

    let currentUsers: any[] = [];
    let currentApps: any[] = [];
    let currentOrders: any[] = [];
    let currentPurchases: any[] = [];

    const recalculateUsersBalanceStock = () => {
      const nonAdminUsers = currentUsers.filter((u: any) => u.role !== 'admin');
      const totalUsersBalance = nonAdminUsers.reduce((sum: number, u: any) => {
        const userOrders = currentOrders.filter((o: any) => o.userId === u.id || o.userId === u.uid || (u.email && o.userEmail === u.email));
        const totalStock = userOrders.reduce((s: number, o: any) => s + Number(o.quantity || 0), 0);
        const usedApps = currentApps.filter((a: any) => a.userId === u.id || a.userId === u.uid || (u.email && a.userEmail === u.email)).length;
        return sum + Math.max(0, totalStock - usedApps);
      }, 0);

      const totalPurchasedQty = currentPurchases.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0);
      const totalOrderQty = currentOrders.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
      const mfgBalanceStock = Math.max(0, totalPurchasedQty - totalOrderQty);

      setStats(prev => ({ ...prev, deviceStock: totalUsersBalance, balanceStock: mfgBalanceStock }));
    };

    // 2. Real-Time Firestore Web SDK Sync (Updates live on data add (+) or delete (-))
    if (db) {
      try {
        unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const usersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          currentUsers = usersList;
          const nonAdminUsers = usersList.filter((u: any) => u.role !== 'admin');
          setStats(prev => ({ ...prev, totalUsers: nonAdminUsers.length }));
          recalculateUsersBalanceStock();
        });

        unsubscribeApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
          let allApps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          currentApps = allApps;
          if (adminManufacturer) {
            allApps = allApps.filter((app: any) => 
              (app.manufacturer || '').trim().toLowerCase() === adminManufacturer.trim().toLowerCase()
            );
          }
          const pendingAppsList = allApps.filter((app: any) => (app.status || 'Pending') === 'Pending');
          const pendingAppsCount = pendingAppsList.length;
          const pendingReviewCount = pendingAppsList.filter((app: any) => !app.viewed && !app.isViewed && !app.adminViewed).length;
          const certifiedApps = allApps.filter((app: any) => app.status === 'Certified').length;
          const installedApps = allApps.filter((app: any) => ['Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status)).length;
          
          setStats(prev => ({
            ...prev,
            applications: pendingAppsCount,
            pendingReview: pendingReviewCount,
            certificatesIssued: certifiedApps,
            installed: installedApps
          }));
          recalculateUsersBalanceStock();

          // Sort recent activities by createdAt descending
          const sorted = [...allApps].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setRecentActivities(sorted.slice(0, 7));
        });

        unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          const ordersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          currentOrders = ordersList;
          const totalOrderQty = ordersList.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
          setStats(prev => ({
            ...prev,
            totalOrders: totalOrderQty,
            totalOrderQuantity: totalOrderQty
          }));
          recalculateUsersBalanceStock();
        });

        unsubscribeSubs = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
          const subsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const totalSubCount = subsList.reduce((sum: number, s: any) => sum + Number(s.subscriptionCount || 0), 0);
          setStats(prev => ({
            ...prev,
            subscriptions: totalSubCount
          }));
        });

        unsubscribePurchases = onSnapshot(collection(db, 'purchaseEntries'), (snapshot) => {
          const purchasesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          currentPurchases = purchasesList;
          recalculateUsersBalanceStock();
        });
      } catch (err) {
        console.error('Real-time Firestore stats listener error:', err);
      }
    }

    return () => {
      unsubscribeUsers();
      unsubscribeApps();
      unsubscribeOrders();
      unsubscribeSubs();
      unsubscribePurchases();
    };
  }, [adminManufacturer]);

  // Standard Admin View: 3 Cards Only (Applications, Certificates Issued, Installed)
  if (isStandard) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Overview Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Welcome back{adminManufacturer ? `, ${adminManufacturer} Admin` : ''}. Here is your application overview.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* 1. Pending Applications Count (Matches /admin/applications) */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '0.875rem' }}>
              <FileText size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pending Applications</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.pendingReview}</p>
            </div>
          </div>

          {/* 2. Installed Devices Count (Matches /admin/certificates) */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '0.875rem' }}>
              <Wrench size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Installed Devices</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.installed}</p>
            </div>
          </div>

          {/* 3. Certificates Issued Count (Matches /admin/approved) */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: '0.875rem' }}>
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Certificates Issued</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.certificatesIssued}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Super Admin View: Full Dashboard
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Overview Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, Admin. Here is what's happening today.</p>
        </div>
        <button className="btn-primary">Generate Report</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.75rem' }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Total Users</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalUsers}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '0.75rem' }}>
            <FileText size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Applications</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.applications}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef3c7', color: '#f59e0b', borderRadius: '0.75rem' }}>
            <Activity size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pending Review</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.pendingReview}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: '0.75rem' }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Certificates Issued</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.certificatesIssued}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '0.75rem' }}>
            <Wrench size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Installed</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.installed}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fce7f3', color: '#ec4899', borderRadius: '0.75rem' }}>
            <Package size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Total Orders</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalOrders}</p>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.75rem' }}>
            <CreditCard size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Subscriptions</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.subscriptions}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '0.75rem' }}>
            <HardDrive size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Users Balance Stock</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.deviceStock}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', color: '#0ea5e9', borderRadius: '0.75rem' }}>
            <Package size={28} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Balance Stock</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.balanceStock}
            </p>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', minHeight: '300px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>Recent Activity</h3>
          {recentActivities.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No recent activity found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Vehicle No</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Manufacturer</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((act, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{act.vehicleNo || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{act.customerName || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{act.manufacturer || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: act.status === 'Certified' ? '#d1fae5' : act.status === 'Installed' ? '#dbeafe' : '#fef3c7',
                          color: act.status === 'Certified' ? '#047857' : act.status === 'Installed' ? '#1d4ed8' : '#b45309'
                        }}>
                          {act.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
