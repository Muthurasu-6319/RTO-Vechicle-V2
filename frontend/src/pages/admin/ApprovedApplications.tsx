import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Search, Trash2 } from 'lucide-react';

const ApprovedApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const adminManufacturer = localStorage.getItem('adminManufacturer');
        const url = adminManufacturer 
          ? `${backendUrl}/api/applications?manufacturer=${encodeURIComponent(adminManufacturer)}`
          : `${backendUrl}/api/applications`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((app: any) => app.status === 'Certified');
          setApplications(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const filteredApps = applications.filter(app => {
    const q = searchQuery.toLowerCase();
    return (
      (app.vehicleNo && app.vehicleNo.toLowerCase().includes(q)) ||
      (app.imei && app.imei.toLowerCase().includes(q)) ||
      (app.vldSerial && app.vldSerial.toLowerCase().includes(q))
    );
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
      } else {
        alert('Failed to delete application.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting application.');
    }
  };

  const handleDownload = async (appId: string, vehicleNo: string) => {
    try {
      setDownloadingId(appId);

      // Step 1: Get signed URL from backend
      const res = await fetch(`${backendUrl}/api/applications/${appId}/download-certificate?type=vahan`);
      if (!res.ok) throw new Error('Could not get download URL');
      const { downloadUrl, filename } = await res.json();

      // Step 2: Fetch and trigger download
      try {
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) throw new Error('Direct fetch failed');

        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || `${(vehicleNo || '').toUpperCase()}_Vahan_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: open in new tab
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Approved Applications</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Fully certified and completed applications.</p>
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No certified applications found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Customer Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Vehicle No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>RTO Office</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Date Issued</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.certifiedAt ? new Date(app.certifiedAt).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500,
                        backgroundColor: '#d1fae5', color: '#047857'
                      }}>
                        <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                        Certified
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {app.vahanCertUrl && (
                        <button 
                          onClick={() => handleDownload(app.id, app.vehicleNo)}
                          disabled={downloadingId === app.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: downloadingId === app.id ? '#e2e8f0' : '#10b981', color: downloadingId === app.id ? '#64748b' : 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: downloadingId === app.id ? 'not-allowed' : 'pointer' }}
                        >
                          {downloadingId === app.id ? '...' : <><Download size={16} /> Download</>}
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDelete(app.id)}
                        title="Delete Application"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedApplications;
