import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2 } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch(`${backendUrl}/api/orders`),
        fetch(`${backendUrl}/api/users`)
      ]);
      
      if (ordersRes.ok && usersRes.ok) {
        setOrders(await ordersRes.json());
        const usersData = await usersRes.json();
        setUsers(usersData.filter((u: any) => u.role !== 'admin'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  const openCreateModal = () => {
    resetForm();
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
    if (!formData.userId) {
      alert("Please select a User.");
      return;
    }
    
    const user = users.find(u => u.id === formData.userId);
    const orderData = {
      ...formData,
      quantity: Number(formData.quantity),
      userName: user ? (user.fullName || user.name) : 'Unknown User',
      userEmail: user ? user.email : ''
    };

    try {
      if (editingOrder) {
        const res = await fetch(`${backendUrl}/api/orders/${editingOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          alert('Order updated successfully!');
        } else {
          alert('Failed to update order');
          return;
        }
      } else {
        const res = await fetch(`${backendUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          alert('Order created successfully!');
        } else {
          alert('Failed to create order');
          return;
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleDelete = async (order: any) => {
    if (!confirm(`Are you sure you want to delete Order "${order.orderId}"? This will reduce the user's quota.`)) {
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/orders/${order.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Order deleted successfully!');
        fetchData();
      } else {
        alert('Failed to delete order');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Orders & Quota</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage orders and allocate 1-Year certificate quotas to users.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '300px' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Order ID, User..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
          
          <button 
            onClick={openCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            <PlusCircle size={18} /> Create Order
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
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
                  <th style={{ padding: '1rem 0.5rem' }}>Item</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Batch</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Ordered Date</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Approvals</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
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
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>{editingOrder ? 'Edit Order' : 'Create New Order'}</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Select User</label>
                <select 
                  name="userId" value={formData.userId} onChange={handleChange} required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName || u.name} ({u.email})</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Quantity in this order sets the 1-Year certificate quota for the user.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Order ID</label>
                  <input type="text" name="orderId" value={formData.orderId} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Ordered Date</label>
                  <input type="date" name="orderedDate" value={formData.orderedDate} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Item</label>
                  <input type="text" name="item" value={formData.item} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Batch</label>
                  <input type="text" name="batch" value={formData.batch} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Quantity (Quota)</label>
                  <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Address</label>
                <textarea name="address" rows={3} value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" name="managerApproval" checked={formData.managerApproval} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  Manager Approval
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" name="accountsApproval" checked={formData.accountsApproval} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  Accounts Approval
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" name="dispatched" checked={formData.dispatched} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  Dispatched
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: editingOrder ? '#f59e0b' : '#3b82f6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                  {editingOrder ? 'Update Order' : 'Save Order'}
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
