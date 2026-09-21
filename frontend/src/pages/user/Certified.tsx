import React, { useState } from 'react';
import { Download, FileText, Loader, Eye } from 'lucide-react';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';
import { useAuthUser, useUserApplications } from '../../hooks/useUserData';

const Certified = () => {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid;

  const { data: allApps = [], isLoading: appsLoading } = useUserApplications(userId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const loading = authLoading || (!!userId && appsLoading);

  // Filter certified applications belonging strictly to this user
  const applications = allApps.filter((app: any) => app.status === 'Certified' && (!userId || app.userId === userId));


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

  const getCertUrl = (app: any) => {
    if (!app) return '';
    return app.vahanCertUrl || app.vahanCert || app.certUrl || app.certificateUrl || app.url || app.fileUrl || app.tempCertUrl || '';
  };

  const handleDownload = async (app: any) => {
    const certUrl = getCertUrl(app);
    const vehicleNo = (app?.vehicleNo || 'Document').toUpperCase();
    const filename = `${vehicleNo}_Vahan_Certificate.pdf`;
    const appId = app?.id;

    if (!certUrl && !appId) {
      alert('Certificate file URL is not available yet.');
      return;
    }

    try {
      if (appId) setDownloadingId(appId);

      // Method 1: Direct Blob Download (saves file directly into browser download manager)
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
          console.warn('Direct blob fetch failed (CORS), trying backend attachment proxy:', blobErr);
        }
      }

      // Method 2: Backend Attachment Proxy (forces Content-Disposition: attachment)
      const targetUrl = certUrl || `${backendUrl}/api/applications/${appId}/download-certificate?type=vahan`;
      const proxyDownloadUrl = `${backendUrl}/api/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;

      const a = document.createElement('a');
      a.href = proxyDownloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

    } catch (err: any) {
      console.error('Download error:', err);
      if (certUrl) {
        const a = document.createElement('a');
        a.href = certUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } finally {
      if (appId) setDownloadingId(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(applications.length / itemsPerPage) || 1;
  const paginatedApps = applications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Certified Devices</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View and download your Vahan certificates.</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {/* Pagination controls above table */}
        {applications.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, applications.length)} of {applications.length} entries
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
                  <th style={{ padding: '1rem 0.5rem' }}>Validity</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Reg Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Issued Date</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Vahan Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.map((app, index) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.imei}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.manufacturer}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.rtoOffice}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.mobileNumber}</td>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.validity || '—'}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{app.registrationDate}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{app.certifiedAt ? new Date(app.certifiedAt).toLocaleDateString() : '-'}</td>
                    
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={() => setSelectedApp(app)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Eye size={16} /> View
                        </button>
                        
                        {app.vahanCertUrl ? (
                          <button 
                            onClick={() => handleDownload(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: downloadingId === app.id ? '#e2e8f0' : '#10b981', color: downloadingId === app.id ? '#64748b' : 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: downloadingId === app.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {downloadingId === app.id
                              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                              : <><Download size={16} /> Download PDF</>
                            }
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>Not available</span>
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

      {selectedApp && (
        <ApplicationDetailsModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
};

export default Certified;
