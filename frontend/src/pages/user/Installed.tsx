import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, CheckCircle, Loader, Clock, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthUser, useUserApplications } from '../../hooks/useUserData';

const Installed = () => {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid;
  const queryClient = useQueryClient();

  const { data: allApps = [], isLoading: appsLoading } = useUserApplications(userId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const loading = authLoading || (!!userId && appsLoading);

  // Filter pending/installed applications belonging strictly to this user
  const applications = allApps.filter((app: any) =>
    ['Pending', 'Installed', 'TempCertUploaded', 'RTOApproved'].includes(app.status) &&
    (!userId || app.userId === userId)
  );

  const handleRtoApprove = async (id: string) => {
    if (!window.confirm('Mark this as RTO Approved?')) return;
    try {
      const res = await fetch(`${backendUrl}/api/applications/${id}/rto-approve`, {
        method: 'PUT'
      });
      if (!res.ok) {
        alert('Failed to update status');
      } else {
        queryClient.invalidateQueries({ queryKey: ['applications', userId] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCertUrl = (app: any) => {
    if (!app) return '';
    return app.tempCertUrl || app.tempCert || app.certUrl || app.certificateUrl || app.url || app.fileUrl || app.vahanCertUrl || '';
  };

  const handleDownload = async (app: any) => {
    const appId = app?.id;
    const vehicleNo = (app?.vehicleNo || 'Document').toUpperCase();
    const filename = `${vehicleNo}_Temp_Certificate.pdf`;
    const certUrl = getCertUrl(app);

    if (!certUrl && !appId) {
      alert('Certificate file URL is not available yet.');
      return;
    }

    try {
      if (appId) setDownloadingId(appId);

      // Priority 1: Instant direct download if certUrl is present on app object
      if (certUrl) {
        try {
          const res = await fetch(certUrl);
          if (res.ok) {
            const blob = await res.blob();
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
        } catch (corsErr) {
          console.warn('CORS blob fetch failed, triggering direct link download:', corsErr);
        }

        // Direct anchor download fallback
        const a = document.createElement('a');
        a.href = certUrl;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // Priority 2: Backend proxy fallback if certUrl is not directly on object
      if (appId) {
        const downloadProxyUrl = `${backendUrl}/api/download-proxy?id=${appId}&type=temp&filename=${encodeURIComponent(filename)}`;
        const a = document.createElement('a');
        a.href = downloadProxyUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Download error:', err);
      if (certUrl) {
        window.open(certUrl, '_blank');
      }
    } finally {
      setTimeout(() => setDownloadingId(null), 300);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return { bg: '#fef9c3', color: '#92400e', label: '⏳ Pending Admin Approval' };
      case 'Installed':
        return { bg: '#e0e7ff', color: '#4f46e5', label: 'Installed' };
      case 'TempCertUploaded':
        return { bg: '#fef3c7', color: '#b45309', label: 'Needs Your Approval' };
      case 'RTOApproved':
        return { bg: '#d1fae5', color: '#047857', label: 'RTO Approved' };
      default:
        return { bg: '#f1f5f9', color: '#64748b', label: status };
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Installed Devices</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          View your submitted applications. Page updates automatically in real-time!
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No applications found. Submit a new certificate application to see it here.</p>
          </div>
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
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>RTO Approval</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, index) => {
                  const badge = getStatusBadge(app.status);
                  return (
                    <tr
                      key={app.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: app.status === 'Pending' ? '#fffbeb' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '1rem 0.5rem' }}>{index + 1}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{app.imei}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{app.vldSerial}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{app.vehicleNo}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{app.customerName}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        {app.status === 'Pending' && (
                          <span style={{ color: '#92400e', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                            <Clock size={14} /> Admin Review
                          </span>
                        )}
                        {app.status === 'Installed' && (
                          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Waiting</span>
                        )}
                        {app.status === 'TempCertUploaded' && (
                          <button
                            onClick={() => handleRtoApprove(app.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
                          >
                            <CheckCircle size={16} /> Yes
                          </button>
                        )}
                        {app.status === 'RTOApproved' && (
                          <span style={{ color: '#047857', fontSize: '0.875rem' }}>Responded</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        {app.status === 'Pending' ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <AlertCircle size={14} /> Awaiting approval
                          </span>
                        ) : app.tempCertUrl ? (
                          <button
                            onClick={() => handleDownload(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: downloadingId === app.id ? '#e2e8f0' : '#8b5cf6', color: downloadingId === app.id ? '#64748b' : 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: downloadingId === app.id ? 'not-allowed' : 'pointer' }}
                          >
                            {downloadingId === app.id
                              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                              : <><Download size={16} /> Download PDF</>
                            }
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Not ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Installed;

