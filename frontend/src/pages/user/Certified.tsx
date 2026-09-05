import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { auth } from '../../firebase';

const Certified = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        const userIdParam = user ? `?userId=${user.uid}` : '';
        const res = await fetch(`${backendUrl}/api/applications${userIdParam}`);
        if (res.ok) {
          const data = await res.json();
          // Show only Certified
          const filtered = data.filter((app: any) => app.status === 'Certified');
          setApplications(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchApplications();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDownload = async (appId: string, vehicleNo: string) => {
    try {
      const user = auth.currentUser;
      const downloadUrl = `${backendUrl}/api/applications/${appId}/download-certificate?type=vahan&userId=${user?.uid || ''}`;
      
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
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Certified Devices</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View and download your Vahan certificates.</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No certified devices found.</div>
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
                  <th style={{ padding: '1rem 0.5rem' }}>Issued Date</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Vahan Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.imei}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.manufacturer}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.mobileNumber}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{app.registrationDate}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.certifiedAt ? new Date(app.certifiedAt).toLocaleDateString() : '-'}</td>
                    
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {app.vahanCertUrl ? (
                        <button 
                          onClick={() => {
                            handleDownload(app.id, app.vehicleNo);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Download size={16} /> Download
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Not available</span>
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

export default Certified;
