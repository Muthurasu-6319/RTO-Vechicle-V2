import React, { useState, useEffect } from 'react';
import { Package, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

const Received = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInfo, setStockInfo] = useState({
    totalStock: 0,
    usedStock: 0,
    balanceStock: 0,
    totalStock2Year: 0,
    usedStock2Year: 0,
    balanceStock2Year: 0
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    let unsubscribeApps: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }

      // Fetch orders from backend
      try {
        const res = await fetch(`${backendUrl}/api/orders/user/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
      }

      // Fetch subscription totals
      const subsSnap = await getDocs(query(collection(db, 'subscriptions'), where('userId', '==', user.uid)));
      let totalSubs = 0;
      subsSnap.forEach(doc => { totalSubs += Number(doc.data().subscriptionCount || 0); });

      // Real-time listener: recalculate balance when applications change
      const appsRef = collection(db, 'applications');
      const q = query(appsRef, where('userId', '==', user.uid));
      unsubscribeApps = onSnapshot(q, async (snapshot) => {
        const allApps = snapshot.docs.map(doc => doc.data());
        const used1Year = allApps.filter((app: any) => app.validity === '1 Year').length;
        const used2Year = allApps.filter((app: any) => app.validity === '2 Years').length;

        // Also re-fetch orders total (in case orders updated)
        try {
          const res = await fetch(`${backendUrl}/api/orders/user/${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setOrders(data);
            const totalOrders = data.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
            setStockInfo({
              totalStock: totalOrders,
              usedStock: used1Year,
              balanceStock: totalOrders - used1Year,
              totalStock2Year: totalSubs,
              usedStock2Year: used2Year,
              balanceStock2Year: totalSubs - used2Year
            });
          }
        } catch { }
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, []);


  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Received Orders</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View orders and allocated device quotas assigned to you.</p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center' }}>
          <Package size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Orders Received</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't received any orders yet. Orders placed by your admin will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Stock Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            
            {/* Total Stock */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #818cf8', backgroundColor: '#e0e7ff' }}>
              <Package size={24} color="#4f46e5" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3730a3', margin: '0 0 0.25rem' }}>Total Stock</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4f46e5', margin: 0 }}>{stockInfo.totalStock}</p>
            </div>

            {/* Used Stock */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #fca5a5', backgroundColor: '#fee2e2' }}>
              <TrendingDown size={24} color="#dc2626" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', margin: '0 0 0.25rem' }}>Used</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>{stockInfo.usedStock}</p>
            </div>

            {/* Balance Stock */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: `1px solid ${stockInfo.balanceStock <= 0 ? '#fca5a5' : '#86efac'}`, backgroundColor: stockInfo.balanceStock <= 0 ? '#fee2e2' : '#dcfce7' }}>
              {stockInfo.balanceStock <= 0
                ? <AlertCircle size={24} color="#dc2626" style={{ marginBottom: '0.5rem' }} />
                : <CheckCircle size={24} color="#16a34a" style={{ marginBottom: '0.5rem' }} />
              }
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: stockInfo.balanceStock <= 0 ? '#991b1b' : '#14532d', margin: '0 0 0.25rem' }}>Balance</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: stockInfo.balanceStock <= 0 ? '#dc2626' : '#16a34a', margin: 0 }}>{stockInfo.balanceStock}</p>
            </div>

            {/* Additional Subscription Balance */}
            {stockInfo.totalStock2Year > 0 && (
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #c4b5fd', backgroundColor: '#f3e8ff' }}>
                <CheckCircle size={24} color="#7c3aed" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b21a8', margin: '0 0 0.25rem' }}>Add. Sub Balance</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', margin: 0 }}>{stockInfo.balanceStock2Year}</p>
              </div>
            )}
          </div>

          {/* Orders Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>#</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Order ID</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Item</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Batch</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Ordered Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Address</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{order.orderId}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{order.item}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{order.batch}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                          {order.quantity}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{order.orderedDate}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.address}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        {order.dispatched ? (
                          <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Dispatched</span>
                        ) : order.accountsApproval ? (
                          <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Approved</span>
                        ) : (
                          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Processing</span>
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

export default Received;
