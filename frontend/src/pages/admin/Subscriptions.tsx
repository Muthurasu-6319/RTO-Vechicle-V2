import React, { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, CheckCircle, Clock, User, Search, Calendar, Hash, FileText, Check, AlertCircle, Edit, Trash2, Download } from 'lucide-react';
import UploadButton from '../../components/UploadButton';
import SearchableUserSelect from '../../components/SearchableUserSelect';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [stockMap, setStockMap] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
  const [editingSub, setEditingSub] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: '',
    manufacturer: '',
    consumerName: '',
    subscriptionCount: '',
    date: '',
    invoicePdfUrl: '',
    approved: false
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    let fetchedFromBackend = false;
    try {
      const [subsRes, usersRes, settingsRes, statsRes] = await Promise.all([
        fetch(`${backendUrl}/api/subscriptions`),
        fetch(`${backendUrl}/api/users`),
        fetch(`${backendUrl}/api/settings`),
        fetch(`${backendUrl}/api/stats/manufacturer-stock`)
      ]);
      
      if (subsRes.ok && usersRes.ok) {
        const subsData = await subsRes.json();
        const usersData = await usersRes.json();
        if (Array.isArray(subsData) && Array.isArray(usersData)) {
          setSubscriptions(subsData);
          setUsers(usersData.filter((u: any) => u.role !== 'admin'));
          fetchedFromBackend = true;
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setManufacturers(settingsData.manufacturers || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStockMap(statsData);
      }
    } catch (err) {
      console.warn('Backend subscriptions fetch failed, using Firestore Web SDK fallback');
    }

    if (!fetchedFromBackend && db) {
      try {
        const [subsSnap, usersSnap, settingsDoc] = await Promise.all([
          getDocs(collection(db, 'subscriptions')),
          getDocs(collection(db, 'users')),
          getDoc(doc(db, 'settings', 'config'))
        ]);

        const allSubs = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allSubs.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSubscriptions(allSubs);

        const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(allUsers.filter((u: any) => u.role !== 'admin'));

        if (settingsDoc.exists()) {
          setManufacturers(settingsDoc.data()?.manufacturers || []);
        }
      } catch (e) {
        console.error('Firestore subscriptions fallback failed:', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      userId: '', manufacturer: '', consumerName: '', subscriptionCount: '', date: '', invoicePdfUrl: '', approved: false
    });
    setEditingSub(null);
  };

  const openCreateModal = () => {
    resetForm();
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: today }));
    setIsModalOpen(true);
  };

  const openEditModal = (sub: any) => {
    setEditingSub(sub);
    setFormData({
      userId: sub.userId || '',
      manufacturer: sub.manufacturer || '',
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
    
    const user = users.find(u => u.id === formData.userId || u.uid === formData.userId);
    const targetUserId = user ? (user.uid || user.id) : formData.userId;
    const subData = {
      ...formData,
      userId: targetUserId,
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage) || 1;
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const downloadCSV = () => {
    if (subscriptions.length === 0) {
      alert("No data available to download.");
      return;
    }
    const headers = ["User,User Email,Consumer Name,Subscription Count,Date,Approved"];
    const rows = subscriptions.map(sub => {
      return `"${sub.userName || ''}","${sub.userEmail || ''}","${sub.consumerName || ''}","${sub.subscriptionCount || ''}","${sub.date || ''}","${sub.approved ? 'Approved' : 'Pending'}"`;
    });
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Subscriptions_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Subscriptions</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage subscription certificates for users.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '250px', flexShrink: 0 }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Consumer, User..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <PlusCircle size={18} /> Create Subscription
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {/* Pagination controls above table */}
        {filteredSubs.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSubs.length)} of {filteredSubs.length} entries
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
                {paginatedSubs.map((sub, idx) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {((currentPage - 1) * itemsPerPage) + idx + 1}
                    </td>
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
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(sub)} title="Delete" style={{ padding: '0.4rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
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
          backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '520px', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{editingSub ? 'Edit Subscription' : 'Create Subscription'}</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              {/* Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Select User</label>
                  <SearchableUserSelect
                    users={users}
                    value={formData.userId}
                    onChange={(userId) => setFormData(prev => ({ ...prev, userId }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Consumer Name</label>
                  <input type="text" name="consumerName" value={formData.consumerName} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Subscription Count (Quota)</label>
                    <input type="number" min="1" name="subscriptionCount" value={formData.subscriptionCount} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Invoice PDF</label>
                  <UploadButton onUploadSuccess={handleInvoiceUpload} />
                  {formData.invoicePdfUrl && (
                    <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem' }}>✓ Invoice uploaded</p>
                  )}
                </div>

                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                    <input type="checkbox" name="approved" checked={formData.approved} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                    Approved
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexShrink: 0, backgroundColor: '#f8fafc' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.625rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.625rem', backgroundColor: editingSub ? '#f59e0b' : '#8b5cf6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>
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
