import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, X, Copy, Check, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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
        
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '300px' }}>
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

                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => setSelectedApp(app)}
                        style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                      >
                        View
                      </button>
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Application Details</h3>
              <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            {/* Applied By Info Banner */}
            <div style={{ backgroundColor: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={18} color="#7c3aed" />
              <div>
                <p style={{ fontWeight: 700, color: '#5b21b6', margin: 0, fontSize: '0.9rem' }}>
                  {getUserName(selectedApp.userId)}
                </p>
                <p style={{ color: '#7c3aed', margin: 0, fontSize: '0.8rem' }}>
                  Applied on: {formatDateTime(selectedApp.createdAt)}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {/* Barcode Photo */}
              <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>📷 Barcode Photo</p>
                {selectedApp.barcodeUrl ? (
                  <a href={selectedApp.barcodeUrl} target="_blank" rel="noreferrer" title="Click to open full image">
                    <img
                      src={selectedApp.barcodeUrl}
                      alt="Barcode"
                      style={{
                        width: '100%',
                        maxHeight: '140px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        border: '2px solid #c4b5fd',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.5rem' }}>Click to view full</p>
                  </a>
                ) : (
                  <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No photo uploaded
                  </div>
                )}
              </div>

              {/* RC Book Photo */}
              <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>🚗 RC Book Photo</p>
                {selectedApp.rcUrl ? (
                  <a href={selectedApp.rcUrl} target="_blank" rel="noreferrer" title="Click to open full image">
                    <img
                      src={selectedApp.rcUrl}
                      alt="RC Book"
                      style={{
                        width: '100%',
                        maxHeight: '140px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        border: '2px solid #86efac',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem' }}>Click to view full</p>
                  </a>
                ) : (
                  <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No photo uploaded
                  </div>
                )}
              </div>
            </div>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {[
                { label: 'VLD S.No', value: selectedApp.vldSerial, key: 'vld' },
                { label: 'Vehicle No', value: selectedApp.vehicleNo, key: 'veh' },
                { label: 'Reg Date', value: selectedApp.registrationDate, key: 'reg' },
                { label: 'Validity', value: selectedApp.validity, key: 'val' },
                { label: 'RTO Office', value: selectedApp.rtoOffice, key: 'rto' },
                { label: 'IMEI No', value: selectedApp.imei, key: 'imei' },
                { label: 'Manufacturer', value: selectedApp.manufacturer, key: 'manu' },
                { label: 'Customer Name', value: selectedApp.customerName, key: 'cust' },
                { label: 'Mobile Number', value: selectedApp.mobileNumber, key: 'mob' },
              ].map((field) => (
                <div key={field.key} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{field.label}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{field.value}</p>
                  </div>
                  <button 
                    onClick={() => handleCopy(field.value, field.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', color: '#334155' }}
                  >
                    {copiedField === field.key ? <><Check size={16} color="#10b981" /> Copied</> : <><Copy size={16} /> Copy</>}
                  </button>
                </div>
              ))}

            </div>

            {selectedApp.status === 'Pending' && (
              <div style={{ marginTop: '2rem' }}>
                <button 
                  onClick={() => handleApprove(selectedApp.id)}
                  style={{ width: '100%', padding: '1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '1.125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle size={20} /> Approve Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
