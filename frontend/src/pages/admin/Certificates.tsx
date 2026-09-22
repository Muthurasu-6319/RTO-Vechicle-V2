import React, { useState, useEffect } from 'react';
import { Award, Upload, CheckCircle, Search, Clock, FileText, Trash2, Eye, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import UploadButton from '../../components/UploadButton';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const Certificates = () => {
  const queryClient = useQueryClient();
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'temp' | 'vahan' | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchApplications = async () => {
    setLoading(true);
    let fetchedFromBackend = false;
    const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
    const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || '';
    const adminManufacturer = sessionStorage.getItem('adminManufacturer') || localStorage.getItem('adminManufacturer') || '';
    const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
    const isStandard = !isSuperAdmin && (adminRole.includes('standard') || !!adminManufacturer);

    const matchesManufacturer = (appManu: string) => {
      if (isStandard) {
        if (!adminManufacturer) return false;
        return (appManu || '').trim().toLowerCase() === adminManufacturer.trim().toLowerCase();
      }
      return true;
    };

    try {
      const url = (isStandard && adminManufacturer) 
        ? `${backendUrl}/api/applications?manufacturer=${encodeURIComponent(adminManufacturer)}`
        : `${backendUrl}/api/applications`;
      const [res, usersRes] = await Promise.all([
        fetch(url),
        fetch(`${backendUrl}/api/users`)
      ]);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.filter((app: any) => 
            ['Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status) &&
            matchesManufacturer(app.manufacturer)
          );
          setApplications(filtered);
          fetchedFromBackend = true;
        }
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        }
      }
    } catch (err) {
      console.warn('Backend certificates fetch failed, using Firestore Web SDK fallback');
    }

    if (!fetchedFromBackend && db) {
      try {
        const [appsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'applications')),
          getDocs(collection(db, 'users'))
        ]);
        const allApps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filteredApps = allApps.filter((app: any) => 
          ['Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status) &&
          matchesManufacturer(app.manufacturer)
        );
        filteredApps.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setApplications(filteredApps);
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Firestore fallback failed:', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Get user name from users list by userId safely
  const getUserName = (userId: string) => {
    if (!userId || !Array.isArray(users)) return 'Unknown';
    const user = users.find(u => u && (u.id === userId || u.uid === userId));
    return user ? (user.fullName || user.name || 'Unknown') : 'Unknown';
  };

  const getMobileNumber = (app: any) => {
    if (!app) return '—';
    if (app.mobileNumber) return app.mobileNumber;
    if (app.customerMobile) return app.customerMobile;
    if (app.mobileNo) return app.mobileNo;
    if (app.mobile) return app.mobile;
    if (app.phone) return app.phone;
    if (app.userId && Array.isArray(users)) {
      const u = users.find((usr: any) => usr && (usr.id === app.userId || usr.uid === app.userId));
      if (u && (u.mobile || u.phone || u.mobileNumber)) {
        return u.mobile || u.phone || u.mobileNumber;
      }
    }
    return '—';
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

  const handleUploadSuccess = async (url: string) => {
    if (!uploadingAppId) return;

    const endpoint = uploadType === 'temp' 
      ? `/api/applications/${uploadingAppId}/temp-cert` 
      : `/api/applications/${uploadingAppId}/vahan-cert`;
      
    const payload = uploadType === 'temp' ? { tempCertUrl: url } : { vahanCertUrl: url };

    let success = false;
    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        success = true;
      }
    } catch (err) {
      console.warn('Backend upload cert failed, trying Firestore Web SDK fallback', err);
    }

    if (!success && db) {
      try {
        const updateData: any = uploadType === 'temp' 
          ? { status: 'TempCertUploaded', tempCertUrl: url, tempCertUploadedAt: new Date().toISOString() }
          : { status: 'Certified', vahanCertUrl: url, certifiedAt: new Date().toISOString() };
        
        await updateDoc(doc(db, 'applications', uploadingAppId), updateData);
        success = true;
      } catch (e) {
        console.error('Firestore fallback upload cert error:', e);
      }
    }

    if (success) {
      alert(uploadType === 'temp' ? 'Temporary Certificate Uploaded!' : 'Vahan Certificate Uploaded!');
      setUploadingAppId(null);
      fetchApplications(); // refresh list
    } else {
      alert('Error saving certificate URL to database.');
    }
  };

  const filteredApps = (applications || []).filter(app => {
    if (!app) return false;
    const q = (searchQuery || '').toLowerCase();
    const mob = getMobileNumber(app).toLowerCase();
    return (
      (app.vehicleNo && String(app.vehicleNo).toLowerCase().includes(q)) ||
      (app.imei && String(app.imei).toLowerCase().includes(q)) ||
      (app.vldSerial && String(app.vldSerial).toLowerCase().includes(q)) ||
      (app.customerName && String(app.customerName).toLowerCase().includes(q)) ||
      mob.includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this certificate application?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setApplications(prev => prev.filter(app => app.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        queryClient.invalidateQueries({ queryKey: ['quota'] });
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
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Manage Certificates</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload Temporary and Vahan certificates for approved applications.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {isSuperAdmin && selectedIds.length > 0 && (
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {/* Pagination controls above table */}
        {filteredApps.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredApps.length)} of {filteredApps.length} entries
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
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No applications waiting for certificates.</div>
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
                  <th style={{ padding: '1rem 0.5rem' }}>Vehicle No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Upload Certificate</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Customer Mobile Number</th>
                  <th style={{ padding: '1rem 0.5rem' }}>RTO</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Username</th>
                  <th style={{ padding: '1rem 0.5rem' }}>IMEI No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>VLD S.No</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelection(app.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {app.status === 'Installed' && (
                        <button 
                          onClick={() => { setUploadType('temp'); setUploadingAppId(app.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                        >
                          <Upload size={14} /> Upload Temp Cert
                        </button>
                      )}
                      
                      {app.status === 'TempCertUploaded' && (
                        <span style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '0.25rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Waiting for User Approval
                        </span>
                      )}

                      {app.status === 'RTOApproved' && (
                        <button 
                          onClick={() => { setUploadType('vahan'); setUploadingAppId(app.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                        >
                          <Upload size={14} /> Upload Vahan Cert
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{getMobileNumber(app)}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500,
                        backgroundColor: app.status === 'Installed' ? '#e0e7ff' : app.status === 'TempCertUploaded' ? '#fef3c7' : '#d1fae5',
                        color: app.status === 'Installed' ? '#4f46e5' : app.status === 'TempCertUploaded' ? '#b45309' : '#047857',
                        whiteSpace: 'nowrap'
                      }}>
                        {app.status}
                      </span>
                    </td>
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
                    <td style={{ padding: '1rem 0.5rem' }}>{app.imei || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleDelete(app.id)}
                            title="Delete Application"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                          >
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

      {uploadingAppId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Upload {uploadType === 'temp' ? 'Temporary' : 'Vahan'} Certificate
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Please select the PDF or Image file to upload for this application.</p>
            
            <UploadButton onUploadSuccess={handleUploadSuccess} />
            
            <button 
              onClick={() => setUploadingAppId(null)}
              style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Certificates;
