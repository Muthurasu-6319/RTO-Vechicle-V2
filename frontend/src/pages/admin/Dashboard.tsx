import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Package, Activity, CreditCard, HardDrive, Wrench } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    applications: 0,
    pendingReview: 0,
    certificatesIssued: 0,
    installed: 0,
    totalOrders: 0,
    deviceStock: 0,
    subscriptions: 0
  });

  const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
  const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || '';
  const adminManufacturer = sessionStorage.getItem('adminManufacturer') || (!sessionStorage.getItem('adminToken') ? localStorage.getItem('adminManufacturer') : '');
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
  const isStandard = !isSuperAdmin && (adminRole.includes('standard') || !!adminManufacturer);

  useEffect(() => {
    const fetchStats = async () => {
      let fetchedFromBackend = false;
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const url = isStandard && adminManufacturer 
          ? `${backendUrl}/api/stats/admin?manufacturer=${encodeURIComponent(adminManufacturer)}`
          : `${backendUrl}/api/stats/admin`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            setStats(data);
            fetchedFromBackend = true;
          }
        }
      } catch (err) {
        console.warn('Backend stats fetch failed, using client-side Firestore fallback');
      }

      // Fallback: Query collections directly from client-side Firestore
      if (!fetchedFromBackend && db) {
        try {
          const [usersSnap, appsSnap, ordersSnap, subsSnap, stockDoc] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'applications')),
            getDocs(collection(db, 'orders')),
            getDocs(collection(db, 'subscriptions')),
            getDoc(doc(db, 'settings', 'dashboard'))
          ]);

          let allApps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          if (isStandard && adminManufacturer) {
            allApps = allApps.filter((app: any) => 
              (app.manufacturer || app.vltdManufacturer || '').toLowerCase().trim() === adminManufacturer.toLowerCase().trim()
            );
          }

          const pendingApps = allApps.filter((app: any) => (app.status || 'Pending') === 'Pending').length;
          const certifiedApps = allApps.filter((app: any) => app.status === 'Certified').length;
          const installedApps = allApps.filter((app: any) => ['Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status)).length;
          const deviceStock = stockDoc.exists() ? (stockDoc.data()?.deviceStock || 0) : 0;

          setStats({
            totalUsers: isStandard ? 0 : usersSnap.size,
            applications: allApps.length,
            pendingReview: pendingApps,
            certificatesIssued: certifiedApps,
            installed: installedApps,
            totalOrders: isStandard ? 0 : ordersSnap.size,
            deviceStock: isStandard ? 0 : deviceStock,
            subscriptions: isStandard ? 0 : subsSnap.size
          });
        } catch (err) {
          console.error('Error fetching fallback stats:', err);
        }
      }
    };
    fetchStats();
  }, [isStandard, adminManufacturer]);

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
          {/* 1. Applications Count */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '0.875rem' }}>
              <FileText size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Applications</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.applications}</p>
            </div>
          </div>

          {/* 2. Certificates Issued Count */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: '0.875rem' }}>
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Certificates Issued</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.certificatesIssued}</p>
            </div>
          </div>

          {/* 3. Installed Count */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '1.125rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '0.875rem' }}>
              <Wrench size={32} />
            </div>
            <div>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Installed</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.installed}</p>
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
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Device Stock</h3>
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
              {(stats.totalOrders + stats.subscriptions) - stats.certificatesIssued}
            </p>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', height: '400px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Activity chart and logs will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
