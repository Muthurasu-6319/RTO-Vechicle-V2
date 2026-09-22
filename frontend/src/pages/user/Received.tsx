import React, { useState } from 'react';
import { Package, Calendar, MapPin, Hash } from 'lucide-react';
import { useAuthUser, useUserOrders, useUserApplications } from '../../hooks/useUserData';

const Received = () => {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid;

  const { data: orders = [], isLoading: ordersLoading } = useUserOrders(userId);
  const { data: applications = [], isLoading: appsLoading } = useUserApplications(userId);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loading = authLoading || (!!userId && (ordersLoading || appsLoading));

  // Compute total, used, and balance stock from RAM cache
  const totalStock = orders.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
  const usedStock = applications.length;
  const balanceStock = Math.max(0, totalStock - usedStock);

  const totalPages = Math.ceil(orders.length / itemsPerPage) || 1;
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            {/* Pagination controls above table */}
            {orders.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, orders.length)} of {orders.length} entries
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage === 1 ? '#94a3b8' : '#2563eb', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    &laquo; First
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage === 1 ? '#94a3b8' : '#2563eb', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    &lsaquo; Prev
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', padding: '0 0.5rem' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage >= totalPages ? '#94a3b8' : '#2563eb', color: 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    Next &rsaquo;
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', border: 'none', backgroundColor: currentPage >= totalPages ? '#94a3b8' : '#2563eb', color: 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
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
                  {paginatedOrders.map((order, idx) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{((currentPage - 1) * itemsPerPage) + idx + 1}</td>
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
