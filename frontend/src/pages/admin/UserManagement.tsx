import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Search, Loader, Edit, Trash2, X } from 'lucide-react';

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
  const [loadingUsers, setLoadingUsers] = useState(true);
  
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
      const res = await fetch(`${backendUrl}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
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
      const res = await fetch(`${backendUrl}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('User created successfully!');
        setFormData({ fullName: '', mobile: '', email: '', password: '' });
        setIsCreating(false);
        fetchUsers(); // Refresh list
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Network error while creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await fetch(`${backendUrl}/api/users/${uid}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const res = await fetch(`${backendUrl}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('Failed to update user');
      }
    } catch (err) {
      console.error(err);
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
                    <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Mobile</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Joined On</th>
                    <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{user.fullName}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{user.mobile}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setEditingUser(user)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', marginRight: '1rem' }}
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
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
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit User</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
                <input 
                  type="text" 
                  value={editingUser.fullName} 
                  onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} 
                  required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
                <input 
                  type="tel" 
                  value={editingUser.mobile} 
                  onChange={e => setEditingUser({...editingUser, mobile: e.target.value})} 
                  required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
                <input 
                  type="email" 
                  value={editingUser.email} 
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                  required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password (Optional)</label>
                <input 
                  type="password" 
                  value={(editingUser as any).password || ''} 
                  onChange={e => setEditingUser({...editingUser, password: e.target.value} as any)} 
                  placeholder="Leave blank to keep unchanged"
                  minLength={6}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
                />
              </div>
              
              <button type="submit" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
