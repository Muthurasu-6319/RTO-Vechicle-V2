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

  const handleDownload = async (appId: string, vehicleNo: string) => {
    try {
      setDownloadingId(appId);

      // Step 1: Get signed URL from backend
      const res = await fetch(`${backendUrl}/api/applications/${appId}/download-certificate?type=temp`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Certificate file is not available yet.');
      }
      const { downloadUrl, filename } = await res.json();
      if (!downloadUrl) {
        throw new Error('Certificate file URL is not available yet.');
      }

      // Step 2: Trigger direct browser download/open without CORS or popup blocking issues
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = filename || `${vehicleNo.toUpperCase()}_Temp_Certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download certificate. Please try again.');
    } finally {
      setDownloadingId(null);
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
                            onClick={() => handleDownload(app.id, app.vehicleNo)}
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

