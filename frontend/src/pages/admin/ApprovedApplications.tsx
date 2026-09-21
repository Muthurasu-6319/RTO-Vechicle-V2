import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Search, Trash2, Eye } from 'lucide-react';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

const ApprovedApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
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
              app.status === 'Certified' && matchesManufacturer(app.manufacturer)
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
        console.warn('Backend approved applications fetch failed, using Firestore Web SDK fallback');
      }

      if (!fetchedFromBackend && db) {
        try {
          const [appsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, 'applications')),
            getDocs(collection(db, 'users'))
          ]);
          const allApps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const certifiedApps = allApps.filter((app: any) => 
            app.status === 'Certified' && matchesManufacturer(app.manufacturer)
          );
          certifiedApps.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setApplications(certifiedApps);
          setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('Firestore fallback failed:', e);
        }
      }
      setLoading(false);
    };
    fetchApplications();
  }, []);


  const getUserName = (param: any) => {
    if (!param) return '—';
    if (typeof param === 'string') {
      if (!Array.isArray(users)) return '—';
      const u = users.find((usr: any) => usr && (usr.id === param || usr.uid === param));
      return u ? (u.fullName || u.name || u.email || '—') : '—';
    }
    if (typeof param === 'object') {
      if (param.userName) return param.userName;
      if (param.appliedBy) return param.appliedBy;
      if (param.userId && Array.isArray(users)) {
        const u = users.find((usr: any) => usr && (usr.id === param.userId || usr.uid === param.userId));
        if (u) return u.fullName || u.name || u.email || '—';
      }
    }
    return '—';
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

  const filteredApps = applications.filter(app => {
    const q = searchQuery.toLowerCase();
    const mob = getMobileNumber(app).toLowerCase();
    const uName = getUserName(app).toLowerCase();
    const matchesSearch = (
      (app.vehicleNo && app.vehicleNo.toLowerCase().includes(q)) ||
      (app.imei && app.imei.toLowerCase().includes(q)) ||
      (app.vldSerial && app.vldSerial.toLowerCase().includes(q)) ||
      (app.customerName && app.customerName.toLowerCase().includes(q)) ||
      (app.rtoOffice && app.rtoOffice.toLowerCase().includes(q)) ||
      mob.includes(q) ||
      uName.includes(q)
    );

    let matchesDate = true;
    if (fromDate || toDate) {
      const appDate = app.certifiedAt ? new Date(app.certifiedAt) : null;
      if (appDate) {
        if (fromDate) {
          const fd = new Date(fromDate);
          fd.setHours(0, 0, 0, 0);
          if (appDate < fd) matchesDate = false;
        }
        if (toDate) {
          const td = new Date(toDate);
          td.setHours(23, 59, 59, 999);
          if (appDate > td) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this approved application?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove from local state immediately for better UX or re-fetch
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} approved applications?`)) return;

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

  const getCertUrl = (app: any) => {
    if (!app) return '';
    return app.vahanCertUrl || app.vahanCert || app.certUrl || app.certificateUrl || app.url || app.fileUrl || app.tempCertUrl || '';
  };

  const handleDownload = async (app: any) => {
    const appId = app?.id;
    const vehicleNo = (app?.vehicleNo || 'Document').toUpperCase();
    const filename = `${vehicleNo}_Vahan_Certificate.pdf`;
    const certUrl = getCertUrl(app);

    try {
      if (appId) setDownloadingId(appId);

      // Method 1: Fetch binary PDF via backend download-proxy using Application ID
      const downloadProxyUrl = appId
        ? `${backendUrl}/api/download-proxy?id=${appId}&type=vahan&filename=${encodeURIComponent(filename)}`
        : `${backendUrl}/api/download-proxy?url=${encodeURIComponent(certUrl)}&filename=${encodeURIComponent(filename)}`;

      try {
        const proxyRes = await fetch(downloadProxyUrl);
        if (proxyRes.ok) {
          const blob = await proxyRes.blob();
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(pdfBlob);

          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          return;
        }
      } catch (proxyErr) {
        console.warn('Proxy blob download error, trying direct blob fetch:', proxyErr);
      }

      // Method 2: Direct Blob fetch from certUrl if available
      if (certUrl) {
        try {
          const fileRes = await fetch(certUrl);
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            return;
          }
        } catch (blobErr) {
          console.warn('Direct blob fetch failed:', blobErr);
        }
      }

      // Method 3: Invisible IFrame fallback (never replaces current page window!)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadProxyUrl;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 60000);

    } catch (err) {
      console.error('Download error:', err);
      if (certUrl) {
        window.open(certUrl, '_blank');
      }
    } finally {
      if (appId) setDownloadingId(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const downloadCSV = () => {
    if (applications.length === 0) {
      alert("No data available to download.");
      return;
    }
    const headers = ["Customer Name,Mobile Number,Vehicle No,User Name,IMEI No,Validity,Reg Date,RTO Office,Date Issued"];
    const rows = applications.map(app => {
      return `"${app.customerName || ''}","${getMobileNumber(app)}","${app.vehicleNo || ''}","${getUserName(app)}","${app.imei || ''}","${app.validity || ''}","${app.registrationDate || ''}","${app.rtoOffice || ''}","${app.certifiedAt ? new Date(app.certifiedAt).toLocaleDateString() : ''}"`;
    });
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Approved_Applications_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Approved Applications</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Fully certified and completed applications.</p>
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
          <button 
            onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Download size={18} /> Download Report
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
              title="From Date"
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
              title="To Date"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '250px', maxWidth: '100%' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search Name, Vehicle No, RTO..." 
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No certified applications found.</div>
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
                  <th style={{ padding: '1rem 0.5rem', width: '50px' }}>S.No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Customer Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Customer Mobile Number</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Vehicle No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>User Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>IMEI No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Validity</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Reg Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>RTO Office</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Date Issued</th>
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
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{getMobileNumber(app)}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem', color: '#4f46e5', fontWeight: 500 }}>{getUserName(app)}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.imei || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.validity || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.registrationDate || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.certifiedAt ? new Date(app.certifiedAt).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => setSelectedApp(app)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Eye size={16} /> View
                        </button>
                        
                        {app.vahanCertUrl && (
                          <button 
                            onClick={() => handleDownload(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: downloadingId === app.id ? '#e2e8f0' : '#10b981', color: downloadingId === app.id ? '#64748b' : 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: downloadingId === app.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {downloadingId === app.id ? '...' : <><Download size={16} /> Download</>}
                          </button>
                        )}
                        
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

      {selectedApp && (
        <ApplicationDetailsModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          getUserName={getUserName}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

export default ApprovedApplications;
