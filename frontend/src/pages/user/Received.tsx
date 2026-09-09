import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Hash } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

const Received = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStock, setTotalStock] = useState(0);
  const [usedStock, setUsedStock] = useState(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    let unsubscribeApps: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch orders from backend
      try {
        const res = await fetch(`${backendUrl}/api/orders/user/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
          const total = data.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
          setTotalStock(total);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
      }

      // Real-time listener on applications for live balance
      const appsRef = collection(db, 'applications');
      const q = query(appsRef, where('userId', '==', user.uid));
      unsubscribeApps = onSnapshot(q, (snapshot) => {
        const certified = snapshot.docs.filter(doc => doc.data().status === 'Certified').length;
        setUsedStock(certified); // Balance decreases only when Certified
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, []);

  const balanceStock = totalStock - usedStock;

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
          {/* Summary Banner - Total + Used + Balance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', backgroundColor: '#e0e7ff', border: '1px solid #818cf8' }}>
              <p style={{ fontWeight: 600, color: '#3730a3', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Total Stock</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#4f46e5' }}>{totalStock}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
              <p style={{ fontWeight: 600, color: '#92400e', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Used Stock</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#d97706' }}>{usedStock}</p>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '1rem', textAlign: 'center', backgroundColor: balanceStock <= 0 ? '#fee2e2' : '#d1fae5', border: `1px solid ${balanceStock <= 0 ? '#fca5a5' : '#6ee7b7'}` }}>
              <p style={{ fontWeight: 600, color: balanceStock <= 0 ? '#991b1b' : '#065f46', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Balance Stock</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: balanceStock <= 0 ? '#ef4444' : '#10b981' }}>{balanceStock}</p>
            </div>
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
