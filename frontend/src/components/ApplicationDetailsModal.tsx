import React, { useState } from 'react';
import { CheckCircle, Copy, FileText, User, X } from 'lucide-react';

interface ApplicationDetailsModalProps {
  app: any;
  onClose: () => void;
  getUserName?: (userId: string) => string;
  formatDateTime: (isoStr: string) => string;
  onApprove?: (id: string) => void;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  app,
  onClose,
  getUserName,
  formatDateTime,
  onApprove,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Application Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {/* Applied By Info Banner */}
        {getUserName && (
          <div style={{ backgroundColor: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={18} color="#7c3aed" />
            <div>
              <p style={{ fontWeight: 700, color: '#5b21b6', margin: 0, fontSize: '0.9rem' }}>
                Username: {getUserName(app.userId)}
              </p>
              <p style={{ color: '#7c3aed', margin: 0, fontSize: '0.8rem' }}>
                Applied on: {formatDateTime(app.createdAt)}
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {/* Barcode Photo */}
          <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>📷 Barcode Photo</p>
            {app.barcodeUrl ? (
              <a href={app.barcodeUrl} target="_blank" rel="noreferrer" title="Click to open full image">
                <img
                  src={app.barcodeUrl}
                  alt="Barcode"
                  style={{
                    width: '100%',
                    maxHeight: '140px',
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: '2px solid #c4b5fd',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <p style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.5rem' }}>Click to view full</p>
              </a>
            ) : (
              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                No photo uploaded
              </div>
            )}
          </div>

          {/* RC Book Photo */}
          <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', marginBottom: '0.75rem' }}>🚗 RC Book Photo</p>
            {app.rcUrl ? (
              <a href={app.rcUrl} target="_blank" rel="noreferrer" title="Click to open full image">
                <img
                  src={app.rcUrl}
                  alt="RC Book"
                  style={{
                    width: '100%',
                    maxHeight: '140px',
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: '2px solid #86efac',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem' }}>Click to view full</p>
              </a>
            ) : (
              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                No photo uploaded
              </div>
            )}
          </div>
        </div>


        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'VLD S.No', value: app.vldSerial, key: 'vld' },
            { label: 'Vehicle No', value: app.vehicleNo, key: 'veh' },
            { label: 'Reg Date', value: app.registrationDate, key: 'reg' },
            { label: 'Validity', value: app.validity, key: 'val' },
            { label: 'RTO Office', value: app.rtoOffice, key: 'rto' },
            { label: 'IMEI No', value: app.imei, key: 'imei' },
            { label: 'Manufacturer', value: app.manufacturer, key: 'manu' },
            { label: 'Customer Name', value: app.customerName, key: 'cust' },
            { label: 'Mobile Number', value: app.mobileNumber, key: 'mob' },
          ].map((field) => (
            <div key={field.key} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{field.label}</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{field.value}</p>
              </div>
              <button 
                onClick={() => handleCopy(field.value, field.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', color: '#334155' }}
              >
                {copiedField === field.key ? <><CheckCircle size={16} color="#10b981" /> Copied</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
          ))}
        </div>

        {app.status === 'Pending' && onApprove && (
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => onApprove(app.id)}
              style={{ width: '100%', padding: '1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '1.125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <CheckCircle size={20} /> Approve Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationDetailsModal;
