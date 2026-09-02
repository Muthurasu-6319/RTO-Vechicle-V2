import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, Search } from 'lucide-react';

const ApprovedApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
                        <a 
                          href={app.vahanCertUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '0.5rem', fontWeight: 500, textDecoration: 'none' }}
                        >
                          <Download size={16} /> View
                        </a>
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

export default ApprovedApplications;
