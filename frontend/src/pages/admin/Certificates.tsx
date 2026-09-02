import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, FileText, Check, Search } from 'lucide-react';
import UploadButton from '../../components/UploadButton';

const Certificates = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // For handling upload modal state
  const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'temp' | 'vahan'>('temp');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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
        // Only show Installed, TempCertUploaded, RTOApproved
        const filtered = data.filter((app: any) => 
          ['Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status)
        );
        setApplications(filtered);
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

  const handleUploadSuccess = async (url: string) => {
    if (!uploadingAppId) return;

    const endpoint = uploadType === 'temp' 
      ? `/api/applications/${uploadingAppId}/temp-cert` 
      : `/api/applications/${uploadingAppId}/vahan-cert`;
      
    const payload = uploadType === 'temp' ? { tempCertUrl: url } : { vahanCertUrl: url };

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert(uploadType === 'temp' ? 'Temporary Certificate Uploaded!' : 'Vahan Certificate Uploaded!');
        setUploadingAppId(null);
        fetchApplications(); // refresh list
      }
    } catch (err) {
      console.error(err);
      alert('Error saving certificate URL to database.');
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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Manage Certificates</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload Temporary and Vahan certificates for approved applications.</p>
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No applications waiting for certificates.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>#</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Vehicle No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>VLD S.No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>RTO</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500,
                        backgroundColor: app.status === 'Installed' ? '#e0e7ff' : app.status === 'TempCertUploaded' ? '#fef3c7' : '#d1fae5',
                        color: app.status === 'Installed' ? '#4f46e5' : app.status === 'TempCertUploaded' ? '#b45309' : '#047857'
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {app.status === 'Installed' && (
                        <button 
                          onClick={() => { setUploadType('temp'); setUploadingAppId(app.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Upload size={16} /> Upload Temp Cert
                        </button>
                      )}
                      
                      {app.status === 'TempCertUploaded' && (
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Waiting for User Approval</span>
                      )}

                      {app.status === 'RTOApproved' && (
                        <button 
                          onClick={() => { setUploadType('vahan'); setUploadingAppId(app.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Upload size={16} /> Upload Vahan Cert
                        </button>
                      )}
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
