import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit3, Trash2, Users } from 'lucide-react';

const AdminManagement = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'standard',
    manufacturer: ''
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, settingsRes] = await Promise.all([
        fetch(`${backendUrl}/api/admins`),
        fetch(`${backendUrl}/api/settings`)
      ]);
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setManufacturers(settingsData.manufacturers || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (admin: any = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name || '',
        mobile: admin.mobile || '',
        email: admin.email || '',
        password: admin.password || '',
        role: admin.role || 'standard',
        manufacturer: admin.manufacturer || ''
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        password: '',
        role: 'standard',
        manufacturer: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAdmin ? `${backendUrl}/api/admins/${editingAdmin.id}` : `${backendUrl}/api/admins`;
      const method = editingAdmin ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        fetchData();
        closeModal();
      } else {
        alert('Failed to save admin');
      }
    } catch (error) {
      console.error('Error saving admin:', error);
      alert('Error saving admin');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        const res = await fetch(`${backendUrl}/api/admins/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchData();
        } else {
          alert('Failed to delete admin');
        }
      } catch (error) {
        console.error('Error deleting admin:', error);
      }
    }
  };

  const filteredAdmins = admins.filter(admin => 
    (admin.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (admin.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Admin Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create and manage admin roles and access.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={20} />
          Create Admin
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input 
            type="text" 
            placeholder="Search admins by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#475569' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#475569' }}>Role</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#475569' }}>Manufacturer</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#475569' }}>Contact</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading admins...</td></tr>
            ) : filteredAdmins.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No admins found.</td></tr>
            ) : (
              filteredAdmins.map((admin) => (
                <tr key={admin.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{admin.name}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: admin.role === 'full admin' ? '#dcfce7' : '#e0e7ff', color: admin.role === 'full admin' ? '#166534' : '#3730a3' }}>
                      {admin.role === 'full admin' ? 'Full Admin' : 'Standard'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>{admin.role === 'full admin' ? 'All' : admin.manufacturer || 'None'}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div>{admin.email}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{admin.mobile}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openModal(admin)} style={{ padding: '0.5rem', color: '#3b82f6', backgroundColor: '#eff6ff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDelete(admin.id)} style={{ padding: '0.5rem', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', backgroundColor: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>{editingAdmin ? 'Edit Admin' : 'Create Admin'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile No</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
                <input type="text" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <option value="standard">Standard Admin</option>
                  <option value="full admin">Full Admin</option>
                </select>
              </div>

              {formData.role === 'standard' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Manufacturer Access</label>
                  <select name="manufacturer" value={formData.manufacturer} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <option value="">Select Manufacturer</option>
                    {manufacturers.map((manu, i) => (
                      <option key={i} value={manu}>{manu}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Standard admins will only see data for this manufacturer.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>{editingAdmin ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
