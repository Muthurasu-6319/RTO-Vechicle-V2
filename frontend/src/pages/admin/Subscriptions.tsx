import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2, CreditCard } from 'lucide-react';
import UploadButton from '../../components/UploadButton';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: '',
    consumerName: '',
    subscriptionCount: '',
    date: '',
    invoicePdfUrl: '',
    approved: false
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, usersRes] = await Promise.all([
        fetch(`${backendUrl}/api/subscriptions`),
        fetch(`${backendUrl}/api/users`)
      ]);
      
      if (subsRes.ok && usersRes.ok) {
        setSubscriptions(await subsRes.json());
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
      userId: '', consumerName: '', subscriptionCount: '', date: '', invoicePdfUrl: '', approved: false
    });
    setEditingSub(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (sub: any) => {
    setEditingSub(sub);
    setFormData({
      userId: sub.userId || '',
      consumerName: sub.consumerName || '',
      subscriptionCount: String(sub.subscriptionCount || ''),
      date: sub.date || '',
      invoicePdfUrl: sub.invoicePdfUrl || '',
      approved: sub.approved || false
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  const handleInvoiceUpload = (url: string) => {
    setFormData(prev => ({ ...prev, invoicePdfUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      alert("Please select a User.");
      return;
    }
    
    const user = users.find(u => u.id === formData.userId);
    const subData = {
      ...formData,
      subscriptionCount: Number(formData.subscriptionCount),
      userName: user ? (user.fullName || user.name) : 'Unknown User',
      userEmail: user ? user.email : ''
    };

    try {
      if (editingSub) {
        const res = await fetch(`${backendUrl}/api/subscriptions/${editingSub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subData)
        });
        if (res.ok) {
          alert('Subscription updated successfully!');
        } else {
          alert('Failed to update subscription');
          return;
        }
      } else {
        const res = await fetch(`${backendUrl}/api/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subData)
        });
        if (res.ok) {
          alert('Subscription created successfully!');
        } else {
          alert('Failed to create subscription');
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

  const handleDelete = async (sub: any) => {
    if (!confirm(`Are you sure you want to delete this subscription for "${sub.consumerName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/subscriptions/${sub.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Subscription deleted successfully!');
        fetchData();
      } else {
        alert('Failed to delete subscription');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const filteredSubs = subscriptions.filter(sub => {
    const q = searchQuery.toLowerCase();
    return (
      (sub.consumerName && sub.consumerName.toLowerCase().includes(q)) ||
      (sub.userName && sub.userName.toLowerCase().includes(q)) ||
      (sub.userEmail && sub.userEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Subscriptions</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage subscription certificates for users.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '300px' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Consumer, User..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
          
          <button 
            onClick={openCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            <PlusCircle size={18} /> Create Subscription
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : subscriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No subscriptions found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>#</th>
                  <th style={{ padding: '1rem 0.5rem' }}>User</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Consumer Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Subscription Count</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Invoice</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub, idx) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ fontWeight: 500 }}>{sub.userName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{sub.userEmail}</div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{sub.consumerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                        {sub.subscriptionCount}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{sub.date}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {sub.invoicePdfUrl ? (
                        <a href={sub.invoicePdfUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>View Invoice</a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No Invoice</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      {sub.approved ? (
                        <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Approved</span>
                      ) : (
                        <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => openEditModal(sub)} title="Edit" style={{ padding: '0.4rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(sub)} title="Delete" style={{ padding: '0.4rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>{editingSub ? 'Edit Subscription' : 'Create Subscription'}</h3>
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
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Subscription count sets the subscription quota for the user.</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Consumer Name</label>
                <input type="text" name="consumerName" value={formData.consumerName} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Subscription Count (Quota)</label>
                  <input type="number" min="1" name="subscriptionCount" value={formData.subscriptionCount} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Invoice PDF</label>
                <UploadButton onUploadSuccess={handleInvoiceUpload} />
                {formData.invoicePdfUrl && (
                  <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem' }}>✓ Invoice uploaded</p>
                )}
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" name="approved" checked={formData.approved} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  Approved
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: editingSub ? '#f59e0b' : '#8b5cf6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                  {editingSub ? 'Update' : 'Create Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
