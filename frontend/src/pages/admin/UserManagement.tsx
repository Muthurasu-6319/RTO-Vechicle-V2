import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Search, Loader, Edit, Trash2, X } from 'lucide-react';
import { db, createSecondaryUser } from '../../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  createdAt: string;
}

const UserManagement = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
  
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let fetchedFromBackend = false;
      try {
        const [res, ordersRes, subsRes] = await Promise.all([
          fetch(`${backendUrl}/api/users`),
          fetch(`${backendUrl}/api/orders`),
          fetch(`${backendUrl}/api/subscriptions`)
        ]);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          fetchedFromBackend = true;
        }
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (Array.isArray(ordersData)) setOrders(ordersData);
        }
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          if (Array.isArray(subsData)) setSubscriptions(subsData);
        }
      } catch (e) {
        console.warn('Backend fetchUsers failed, falling back to Firestore Web SDK', e);
      }

      // Fallback: Fetch directly from client-side Firestore
      if (!fetchedFromBackend && db) {
        const [usersSnap, ordersSnap, subsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'subscriptions'))
        ]);
        const firestoreUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
        firestoreUsers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setUsers(firestoreUsers);
        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubscriptions(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const getUserStockCount = (u: any) => {
    if (!u) return 0;
    const userOrders = orders.filter(o => o.userId === u.id || o.userId === u.uid || (u.email && o.userEmail === u.email));
    return userOrders.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  };

  const getUserSubCount = (u: any) => {
    if (!u) return 0;
    const userSubs = subscriptions.filter(s => s.userId === u.id || s.userId === u.uid || (u.email && s.userEmail === u.email));
    return userSubs.reduce((sum, s) => sum + Number(s.subscriptionCount || 0), 0);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      let createdSuccessfully = false;

      // Try Backend API first
      try {
        const res = await fetch(`${backendUrl}/api/users/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          createdSuccessfully = true;
        }
      } catch (err) {
        console.warn('Backend user creation failed, attempting client-side fallback...');
      }

      // Fallback: Create directly via client-side secondary auth app + Firestore doc
      if (!createdSuccessfully) {
        await createSecondaryUser(formData.email, formData.password, formData.fullName, formData.mobile);
        createdSuccessfully = true;
      }

      if (createdSuccessfully) {
        setMessage('User created successfully!');
        setFormData({ fullName: '', mobile: '', email: '', password: '' });
        setIsCreating(false);
        fetchUsers(); // Refresh list
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setMessage(`Error: ${err.message || 'Failed to create user'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      let deletedOnBackend = false;
      try {
        const res = await fetch(`${backendUrl}/api/users/${uid}`, { method: 'DELETE' });
        if (res.ok) deletedOnBackend = true;
      } catch (e) {
        console.warn('Backend delete failed, falling back to Firestore Web SDK');
      }

      if (!deletedOnBackend && db) {
        await deleteDoc(doc(db, 'users', uid));
      }
      fetchUsers();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete user');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      let updatedOnBackend = false;
      try {
        const res = await fetch(`${backendUrl}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingUser)
        });
        if (res.ok) updatedOnBackend = true;
      } catch (e) {
        console.warn('Backend update failed, falling back to Firestore Web SDK');
      }

      if (!updatedOnBackend && db) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          fullName: editingUser.fullName,
          mobile: editingUser.mobile,
          email: editingUser.email
        });
      }
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Edit error:', err);
      alert('Failed to update user');
    }
  };


  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>User Management</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your portal users</p>
        </div>
        <button 
          onClick={() => {
            setIsCreating(!isCreating);
            setMessage('');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)',
            color: 'white', borderRadius: '0.5rem', fontWeight: 600,
            border: 'none', cursor: 'pointer'
          }}
        >
          {isCreating ? 'View All Users' : <><UserPlus size={20} /> Create User</>}
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', backgroundColor: message.includes('Error') ? '#fee2e2' : '#d1fae5', color: message.includes('Error') ? '#b91c1c' : '#047857', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      {isCreating ? (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Create New User Account</h3>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
              <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--secondary-color)', color: 'white', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? <Loader className="animate-spin" /> : 'Create Account'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>All Users</h3>
          
          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader className="animate-spin" size={32} color="var(--primary-color)" />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <p>No users found. Create one to get started.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Stock Count</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Subscription Count</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Mobile</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Joined On</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const stockCount = getUserStockCount(user);
                    const subCount = getUserSubCount(user);
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{user.fullName}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                            {stockCount}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f3e8ff', color: '#7c3aed', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                            {subCount}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{user.mobile}</td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                        </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setEditingUser(user)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', marginRight: isSuperAdmin ? '1rem' : 0 }}
                        >
                          <Edit size={18} />
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleDelete(user.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '480px', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Edit User</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              {/* Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={editingUser.fullName} 
                    onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} 
                    required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Mobile Number</label>
                  <input 
                    type="tel" 
                    value={editingUser.mobile} 
                    onChange={e => setEditingUser({...editingUser, mobile: e.target.value})} 
                    required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Email Address</label>
                  <input 
                    type="email" 
                    value={editingUser.email} 
                    onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                    required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} 
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Password (Optional)</label>
                  <input 
                    type="password" 
                    value={(editingUser as any).password || ''} 
                    onChange={e => setEditingUser({...editingUser, password: e.target.value} as any)} 
                    placeholder="Leave blank to keep unchanged"
                    minLength={6}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} 
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexShrink: 0, backgroundColor: '#f8fafc' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '0.625rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.625rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
