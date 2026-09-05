import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, Clock } from 'lucide-react';
import { auth } from '../../firebase';

const Installed = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const userIdParam = user ? `?userId=${user.uid}` : '';
      const res = await fetch(`${backendUrl}/api/applications${userIdParam}`);
      if (res.ok) {
        const data = await res.json();
        // Show Installed, TempCertUploaded, RTOApproved
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchApplications();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRtoApprove = async (id: string) => {
    if (!window.confirm('Mark this as RTO Approved?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}/rto-approve`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchApplications();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (appId: string, vehicleNo: string) => {
    try {
      const user = auth.currentUser;
      const downloadUrl = `${backendUrl}/api/applications/${appId}/download-certificate?type=temp&userId=${user?.uid || ''}`;
      
      // Navigate to the download URL directly to trigger the browser's native download
      window.location.href = downloadUrl;
    } catch (err) {
      console.error("Error downloading file securely", err);
      alert('Failed to download certificate securely.');
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Installed Devices</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View your installed devices and approve temporary certificates.</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No installed devices found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>#</th>
                  <th style={{ padding: '1rem 0.5rem' }}>IMEI</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Serial No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Vehicle No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Temp Cert Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>RTO Approval</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.imei}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500,
                        backgroundColor: app.status === 'Installed' ? '#e0e7ff' : app.status === 'TempCertUploaded' ? '#fef3c7' : '#d1fae5',
                        color: app.status === 'Installed' ? '#4f46e5' : app.status === 'TempCertUploaded' ? '#b45309' : '#047857'
                      }}>
                        {app.status === 'TempCertUploaded' ? 'Needs Your Approval' : app.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      {app.status === 'Installed' && <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Waiting</span>}
                      {app.status === 'TempCertUploaded' && (
                        <button 
                          onClick={() => handleRtoApprove(app.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <CheckCircle size={16} /> Yes
                        </button>
                      )}
                      {app.status === 'RTOApproved' && <span style={{ color: '#047857', fontSize: '0.875rem' }}>Responded</span>}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {app.tempCertUrl ? (
                        <button 
                          onClick={() => {
                            handleDownload(app.id, app.vehicleNo);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Download size={16} /> Download
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
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

export default Installed;
