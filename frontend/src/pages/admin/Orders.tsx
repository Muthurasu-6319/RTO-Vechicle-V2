import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, CheckCircle, Clock, Truck, User, Search, MapPin, Calendar, Hash, ShieldCheck, AlertCircle, Edit, Edit3, Trash2, Download } from 'lucide-react';
import SearchableUserSelect from '../../components/SearchableUserSelect';
import SearchableManufacturerSelect from '../../components/SearchableManufacturerSelect';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [stockMap, setStockMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    item: '',
    batch: '',
    orderId: '',
    quantity: '',
    orderedDate: '',
    address: '',
    managerApproval: false,
    accountsApproval: false,
    dispatched: false
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const parseOrderNumber = (orderId: string) => {
    if (!orderId) return 999999;
    const num = parseInt(orderId.replace(/\D/g, ''), 10);
    return isNaN(num) ? 999999 : num;
  };

  const processAndSyncOrders = (list: any[]) => {
    const sorted = [...list].sort((a, b) => {
      const numA = parseOrderNumber(a.orderId);
      const numB = parseOrderNumber(b.orderId);
      if (numA !== numB && numA !== 999999 && numB !== 999999) {
        return numA - numB;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    const normalized = sorted.map((order, idx) => {
      const expectedId = `V${String(idx + 1).padStart(3, '0')}`;
      if (order.orderId !== expectedId) {
        if (order.id) {
          fetch(`${backendUrl}/api/orders/${order.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...order, orderId: expectedId })
          }).catch(err => console.warn('Order ID sync failed:', err));
        }
      }
      return { ...order, orderId: expectedId };
    });

    return normalized;
  };

  const computeStockMap = (purchases: any[], ordersList: any[]) => {
    const map: Record<string, { manufacturer: string; totalPurchased: number; totalAllocated: number; currentStock: number }> = {};

    purchases.forEach(p => {
      const rawMfg = p.manufacturer ? String(p.manufacturer).trim() : '';
      if (!rawMfg) return;
      const key = rawMfg.toUpperCase();
      const qty = Number(p.quantity) || 0;
      if (!map[key]) {
        map[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      }
      map[key].totalPurchased += qty;
    });

    ordersList.forEach(o => {
      const rawMfg = o.item || o.manufacturer ? String(o.item || o.manufacturer).trim() : '';
      if (!rawMfg) return;
      const key = rawMfg.toUpperCase();
      const qty = Number(o.quantity) || 0;
      if (!map[key]) {
        map[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      }
      map[key].totalAllocated += qty;
    });

    for (const key in map) {
      map[key].currentStock = map[key].totalPurchased - map[key].totalAllocated;
    }
    return map;
  };

  const fetchData = async () => {
    setLoading(true);
    let fetchedFromBackend = false;
    let purchases: any[] = [];
    let ordersList: any[] = [];
    try {
      const [ordersRes, usersRes, settingsRes, statsRes, entriesRes] = await Promise.all([
        fetch(`${backendUrl}/api/orders`),
        fetch(`${backendUrl}/api/users`),
        fetch(`${backendUrl}/api/settings`),
        fetch(`${backendUrl}/api/stats/manufacturer-stock`),
        fetch(`${backendUrl}/api/purchase-entries`)
      ]);
      
      if (ordersRes.ok && usersRes.ok) {
        const ordersData = await ordersRes.json();
        const usersData = await usersRes.json();
        if (Array.isArray(ordersData) && Array.isArray(usersData)) {
          ordersList = ordersData;
          setOrders(processAndSyncOrders(ordersData));
          setUsers(usersData.filter((u: any) => u.role !== 'admin'));
          fetchedFromBackend = true;
        }
      }

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        if (Array.isArray(entriesData)) {
          purchases = entriesData;
        }
      }
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setManufacturers(settingsData.manufacturers || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (Object.keys(statsData).length > 0) {
          setStockMap(statsData);
        } else {
          setStockMap(computeStockMap(purchases, ordersList));
        }
      } else {
        setStockMap(computeStockMap(purchases, ordersList));
      }
    } catch (err) {
      console.warn('Backend orders fetch failed, using Firestore Web SDK fallback');
    }

    if (!fetchedFromBackend && db) {
      try {
        const [ordersSnap, usersSnap, settingsDoc, entriesSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
          getDoc(doc(db, 'settings', 'config')),
          getDocs(collection(db, 'purchaseEntries'))
        ]);

        const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(processAndSyncOrders(allOrders));

        const allEntries = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStockMap(computeStockMap(allEntries, allOrders));

        const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(allUsers.filter((u: any) => u.role !== 'admin'));

        if (settingsDoc.exists()) {
          setManufacturers(settingsDoc.data()?.manufacturers || []);
        }
      } catch (e) {
        console.error('Firestore orders fallback failed:', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      userId: '', item: '', batch: '', orderId: '', quantity: '', orderedDate: '', address: '',
      managerApproval: false, accountsApproval: false, dispatched: false
    });
    setEditingOrder(null);
  };

  const generateNextOrderId = () => {
    const nextIdNum = orders.length + 1;
    return `V${String(nextIdNum).padStart(3, '0')}`;
  };

  const openCreateModal = () => {
    resetForm();
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, orderId: generateNextOrderId(), orderedDate: today }));
    setIsModalOpen(true);
  };

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setFormData({
      userId: order.userId || '',
      item: order.item || '',
      batch: order.batch || '',
      orderId: order.orderId || '',
      quantity: String(order.quantity || ''),
      orderedDate: order.orderedDate || '',
      address: order.address || '',
      managerApproval: order.managerApproval || false,
      accountsApproval: order.accountsApproval || false,
      dispatched: order.dispatched || false
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.userId) {
      alert("Please select a User.");
      return;
    }

    const mfgKey = formData.item ? formData.item.replace(/\s+/g, '').toUpperCase() : '';
    const currentStock = stockMap[mfgKey]?.currentStock || 0;
    const requestedQty = Number(formData.quantity);
    
    // Calculate effective requested quantity based on whether we are editing or creating
    let effectiveRequestedQty = requestedQty;
    if (editingOrder && editingOrder.item === formData.item) {
      // If editing same item, only the difference matters for stock
      effectiveRequestedQty = requestedQty - Number(editingOrder.quantity || 0);
    }
    
    if (effectiveRequestedQty > currentStock) {
      alert(`No stock available for this manufacturer. Current available stock is ${currentStock}.`);
      return;
    }
    
    const user = users.find(u => u.id === formData.userId);
    const orderData = {
      ...formData,
      quantity: requestedQty,
      userName: user ? (user.fullName || user.name) : 'Unknown User',
      userEmail: user ? user.email : ''
    };

    setSubmitting(true);
    let saved = false;
    let errorMsg = '';

    // Primary: Save directly via Firestore Web SDK (Single-Shot, Instant)
    if (db) {
      try {
        if (editingOrder && editingOrder.id) {
          await updateDoc(doc(db, 'orders', editingOrder.id), {
            ...orderData,
            updatedAt: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, 'orders'), {
            ...orderData,
            createdAt: new Date().toISOString()
          });

          if (formData.userId) {
            try {
              await addDoc(collection(db, 'notifications'), {
                userId: formData.userId,
                title: 'Stock Added',
                message: `${requestedQty} Stock certificates have been allocated to your account.`,
                read: false,
                createdAt: new Date().toISOString()
              });
            } catch (nErr) {
              console.warn('Notification creation failed:', nErr);
            }
          }
        }
        saved = true;
      } catch (fErr: any) {
        console.warn('Firestore save order failed, trying backend API:', fErr);
        errorMsg = fErr?.message || '';
      }
    }

    // Secondary fallback: Express backend API ONLY if Firestore Web SDK failed
    if (!saved) {
      try {
        const url = editingOrder ? `${backendUrl}/api/orders/${editingOrder.id}` : `${backendUrl}/api/orders`;
        const method = editingOrder ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          saved = true;
        } else {
          const errJson = await res.json().catch(() => ({}));
          errorMsg = errJson.error || errJson.message || `Server status ${res.status}`;
        }
      } catch (err: any) {
        console.error('Backend save order fallback failed:', err);
        errorMsg = err?.message || errorMsg || 'Network error';
      }
    }

    setSubmitting(false);

    if (saved) {
      alert(editingOrder ? 'Order updated successfully!' : 'Order created successfully!');
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } else {
      alert(`Failed to ${editingOrder ? 'update' : 'create'} order: ${errorMsg || 'Unknown error'}`);
    }
  };

  const handleDelete = async (order: any) => {
    if (!confirm(`Are you sure you want to delete Order "${order.orderId}"? This will reduce the user's quota.`)) {
      return;
    }

    setSubmitting(true);
    let deleted = false;
    let errorMsg = '';

    if (db && order.id) {
      try {
        await deleteDoc(doc(db, 'orders', order.id));
        deleted = true;
      } catch (fErr: any) {
        console.warn('Firestore delete order failed, trying backend API:', fErr);
        errorMsg = fErr?.message || '';
      }
    }

    if (!deleted) {
      try {
        const res = await fetch(`${backendUrl}/api/orders/${order.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          deleted = true;
        } else {
          const errJson = await res.json().catch(() => ({}));
          errorMsg = errJson.error || errJson.message || `Server status ${res.status}`;
        }
      } catch (err: any) {
        console.error('Backend delete order fallback failed:', err);
        errorMsg = err?.message || errorMsg || 'Network error';
      }
    }

    setSubmitting(false);

    if (deleted) {
      alert('Order deleted successfully!');
      fetchData();
    } else {
      alert(`Failed to delete order: ${errorMsg || 'Unknown error'}`);
    }
  };

  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase();
    return (
      (order.orderId && order.orderId.toLowerCase().includes(q)) ||
      (order.userName && order.userName.toLowerCase().includes(q)) ||
      (order.userEmail && order.userEmail.toLowerCase().includes(q)) ||
      (order.item && order.item.toLowerCase().includes(q))
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const downloadCSV = () => {
    if (orders.length === 0) {
      alert("No data available to download.");
      return;
    }
    const headers = ["Order ID,User,User Email,Manufacturer,Batch,Quantity,Ordered Date,Manager Approval,Accounts Approval,Dispatched"];
    const rows = orders.map(order => {
      return `"${order.orderId || ''}","${order.userName || ''}","${order.userEmail || ''}","${order.item || ''}","${order.batch || ''}","${order.quantity || ''}","${order.orderedDate || ''}","${order.managerApproval ? 'Yes' : 'No'}","${order.accountsApproval ? 'Yes' : 'No'}","${order.dispatched ? 'Yes' : 'No'}"`;
    });
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Orders_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Orders & Quota</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage orders and allocate stock certificates to users.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '250px', flexShrink: 0 }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Order ID, User..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button 
              onClick={downloadCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Download size={18} /> Download Report
            </button>
            
            <button 
              onClick={openCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <PlusCircle size={18} /> Create Order
            </button>
          </div>
        </div>
      </div>

      {/* Manufacturer Stock Overview Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Stock Overview</h3>
        {Object.keys(stockMap).length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '1rem' }}>
            No stock data available yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {Object.keys(stockMap).map(mfgKey => {
              const item = stockMap[mfgKey];
              const mfgName = (typeof item === 'object' && item.manufacturer) ? item.manufacturer : mfgKey;
              const currentStock = typeof item === 'number' ? item : (item.currentStock ?? 0);
              const totalPurchased = typeof item === 'object' ? (item.totalPurchased ?? 0) : 0;
              const totalAllocated = typeof item === 'object' ? (item.totalAllocated ?? 0) : 0;
              return (
                <div key={mfgKey} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.875rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.75rem', flexShrink: 0 }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{mfgName}</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {currentStock}
                      {(totalPurchased > 0 || totalAllocated > 0) && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
                          (In: {totalPurchased} | Used: {totalAllocated})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {/* Pagination controls above table */}
        {filteredOrders.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} entries
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
                Last End &raquo;
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No orders found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Order ID</th>
                  <th style={{ padding: '1rem 0.5rem' }}>User</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Manufacturer</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Batch</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Ordered Date</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Approvals</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{order.orderId}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ fontWeight: 500 }}>{order.userName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.userEmail}</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{order.item}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{order.batch}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                        {order.quantity}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{order.orderedDate}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <span style={{ color: order.managerApproval ? '#10b981' : '#94a3b8' }}>MGR</span>
                        <span style={{ color: order.accountsApproval ? '#10b981' : '#94a3b8' }}>ACC</span>
                        <span style={{ color: order.dispatched ? '#3b82f6' : '#94a3b8' }}>DISP</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(order)}
                          title="Edit Order"
                          style={{ padding: '0.4rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(order)}
                          title="Delete Order"
                          style={{ padding: '0.4rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '540px', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{editingOrder ? 'Edit Order' : 'Create New Order'}</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              {/* Modal Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Select User</label>
                  <SearchableUserSelect
                    users={users}
                    value={formData.userId}
                    onChange={(userId) => setFormData(prev => ({ ...prev, userId }))}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Quantity in this order sets the stock quota for the user.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Order ID</label>
                    <input type="text" name="orderId" value={formData.orderId} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Ordered Date</label>
                    <input type="date" name="orderedDate" value={formData.orderedDate} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Manufacturer</label>
                    <SearchableManufacturerSelect
                      manufacturers={manufacturers}
                      value={formData.item}
                      onChange={(val) => setFormData(prev => ({ ...prev, item: val }))}
                      placeholder="-- Manufacturer --"
                      required
                    />
                    {formData.item && (() => {
                      const mKey = formData.item.replace(/\s+/g, '').toUpperCase();
                      const availStock = stockMap[mKey]?.currentStock || 0;
                      return (
                        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: availStock <= 0 ? '#ef4444' : '#10b981' }}>
                          Stock: {availStock}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Batch</label>
                    <input type="text" name="batch" value={formData.batch} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Quantity</label>
                    <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Address</label>
                  <textarea name="address" rows={2} value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'none', fontSize: '0.875rem' }}></textarea>
                </div>

                <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" name="managerApproval" checked={formData.managerApproval} onChange={handleChange} style={{ width: '15px', height: '15px' }} />
                    Manager Approval
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" name="accountsApproval" checked={formData.accountsApproval} onChange={handleChange} style={{ width: '15px', height: '15px' }} />
                    Accounts Approval
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" name="dispatched" checked={formData.dispatched} onChange={handleChange} style={{ width: '15px', height: '15px' }} />
                    Dispatched
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexShrink: 0, backgroundColor: '#f8fafc' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.625rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '0.625rem',
                    backgroundColor: submitting ? '#94a3b8' : (editingOrder ? '#f59e0b' : '#3b82f6'),
                    border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500,
                    cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : (editingOrder ? 'Update Order' : 'Save Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
