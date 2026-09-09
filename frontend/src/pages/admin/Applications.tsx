import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, X, Copy, Check, Search, User, Eye, Filter, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const adminManufacturer = localStorage.getItem('adminManufacturer');
      const url = adminManufacturer 
        ? `${backendUrl}/api/applications?manufacturer=${encodeURIComponent(adminManufacturer)}`
        : `${backendUrl}/api/applications`;
      const [appsRes, usersRes] = await Promise.all([
        fetch(url),
        fetch(`${backendUrl}/api/users`)
      ]);
      if (appsRes.ok) {
        const data = await appsRes.json();
        const pendingApps = data.filter((app: any) => app.status === 'Pending');
        setApplications(pendingApps);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Get user name from users list by userId
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId || u.uid === userId);
    return user ? (user.fullName || user.name || 'Unknown') : 'Unknown';
  };

  // Format createdAt ISO string to readable date + time
  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      const date = new Date(isoStr);
      const d = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const t = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${d}, ${t}`;
    } catch {
      return isoStr;
    }
  };


  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this application and move it to Installed?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}/approve`, {
        method: 'PUT'
      });
      if (res.ok) {
        setSelectedApp(null);
        navigate('/admin/certificates');
      } else {
        alert('Failed to approve application');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setApplications(prev => prev.filter(app => app.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } else {
        alert('Failed to delete application.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting application.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} applications?`)) return;

    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`${backendUrl}/api/applications/${id}`, { method: 'DELETE' })
        )
      );
      setApplications(prev => prev.filter(app => !selectedIds.includes(app.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert('Error during bulk deletion.');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredApps.length && filteredApps.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map(app => app.id));
    }
  };

  const filteredApps = applications.filter(app => {
    const q = searchQuery.toLowerCase();
    return (
      (app.vehicleNo && app.vehicleNo.toLowerCase().includes(q)) ||
      (app.imei && app.imei.toLowerCase().includes(q)) ||
      (app.vldSerial && app.vldSerial.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Applications</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Review and approve submitted certificates.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={18} /> Bulk Delete ({selectedIds.length})
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '300px', maxWidth: '100%' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search Vehicle No, IMEI, VLD..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No applications found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredApps.length && filteredApps.length > 0}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th style={{ padding: '1rem 0.5rem' }}>#</th>
                  <th style={{ padding: '1rem 0.5rem' }}>IMEI</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Serial No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Manufacturer</th>
                  <th style={{ padding: '1rem 0.5rem' }}>RTO</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Mobile</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Reg No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Reg Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Username</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelection(app.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{app.imei}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.manufacturer}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.mobileNumber}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.registrationDate}</td>

                    {/* Applied By - User Name + Date/Time */}
                    <td style={{ padding: '1rem 0.5rem', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <User size={14} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                            {getUserName(app.userId)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {formatDateTime(app.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => setSelectedApp(app)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDelete(app.id)}
                          title="Delete Application"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
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

      {/* Application Details Modal */}
      {selectedApp && (
        <ApplicationDetailsModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          getUserName={getUserName}
          formatDateTime={formatDateTime}
          onApprove={selectedApp.status === 'Pending' ? handleApprove : undefined}
        />
      )}
    </div>
  );
};

export default Applications;
