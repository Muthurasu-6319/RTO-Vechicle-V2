import React, { useState, useEffect } from 'react';
import UploadButton from '../../components/UploadButton';
import { Camera, FileText } from 'lucide-react';
import { auth } from '../../firebase';

const ApplyCertificate = () => {
  const [formData, setFormData] = useState({
    imei: '',
    vldSerial: '',
    vehicleNo: '',
    registrationDate: '',
    validity: '1 Year',
    manufacturer: '',
    rtoOffice: '',
    customerName: '',
    mobileNumber: '',
    barcodeUrl: '',
    rcUrl: ''
  });

  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Settings
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [rtoOffices, setRtoOffices] = useState<string[]>([]);
  
  // Quota Management
  const [quota, setQuota] = useState<{ totalQuota: number, usedQuota: number, remainingQuota: number, totalQuota2Year: number, usedQuota2Year: number, remainingQuota2Year: number } | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setManufacturers(data.manufacturers || []);
          setRtoOffices(data.rtoOffices || []);
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    
    fetchSettings();

    // Wait for auth state, then fetch quota
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const res = await fetch(`${backendUrl}/api/users/${user.uid}/quota`);
        if (res.ok) {
          const data = await res.json();
          setQuota(data);
        }
      } catch (err) {
        console.error('Failed to fetch quota', err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Logic to calculate Validity based on Registration Date
  useEffect(() => {
    if (formData.registrationDate) {
      const regDate = new Date(formData.registrationDate);
      const today = new Date();
      
      // Exact calculation: add 8 years to registration date
      const thresholdDate = new Date(regDate);
      thresholdDate.setFullYear(thresholdDate.getFullYear() + 8);

      // If today has passed the threshold date, it's more than 8 years
      if (today > thresholdDate) {
        setFormData(prev => ({ ...prev, validity: '2 Years' }));
      } else {
        setFormData(prev => ({ ...prev, validity: '1 Year' }));
      }
    }
  }, [formData.registrationDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Vehicle No Validation: Max 10 characters
    if (name === 'vehicleNo' && value.length > 10) {
      return;
    }
    
    // IMEI Validation: Max 15 characters
    if (name === 'imei' && value.length > 15) {
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleBarcodeUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, barcodeUrl: url }));
    
    // Mocking the AI Scan delay
    setIsScanning(true);
    setTimeout(() => {
      setFormData(prev => ({ 
        ...prev, 
        imei: '868123456789012', 
        vldSerial: 'VLD-9982-XYZ' 
      }));
      setIsScanning(false);
    }, 1500);
  };

  const handleRcUploadSuccess = (url: string) => {
    setFormData(prev => ({ ...prev, rcUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barcodeUrl || !formData.rcUrl) {
      alert("Please upload both photos.");
      return;
    }
    
    // Quota Enforcement - 1 Year
    if (formData.validity === '1 Year' && quota && quota.remainingQuota <= 0) {
      alert('Limit reached! You have exhausted your 1-Year certificate limit. Please subscribe for more quantity.');
      return;
    }

    // Quota Enforcement - 2 Years
    if (formData.validity === '2 Years' && quota && quota.remainingQuota2Year <= 0) {
      alert('Limit reached! You have exhausted your 2-Year certificate limit. Please subscribe for more quantity.');
      return;
    }

    if (formData.imei.length !== 15) {
      alert('IMEI Number must be exactly 15 characters long.');
      return;
    }
    
    setSubmitting(true);
    try {
      // Include userId in form data
      const user = auth.currentUser;
      const submitData = { ...formData, userId: user ? user.uid : '' };

      const res = await fetch(`${backendUrl}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (res.ok) {
        alert('Application Submitted Successfully!');
        // Re-fetch quota to update UI immediately
        const currentUser = auth.currentUser;
        if (currentUser) {
          const quotaRes = await fetch(`${backendUrl}/api/users/${currentUser.uid}/quota`);
          if (quotaRes.ok) {
            const quotaData = await quotaRes.json();
            setQuota(quotaData);
          }
        }
        // Reset form
        setFormData({
          imei: '',
          vldSerial: '',
          vehicleNo: '',
          registrationDate: '',
          validity: '1 Year',
          manufacturer: '',
          rtoOffice: '',
          customerName: '',
          mobileNumber: '',
          barcodeUrl: '',
          rcUrl: ''
        });
      } else {
        const errorData = await res.json();
        alert('Failed to submit: ' + errorData.error);
      }
    } catch (err) {
      console.error('Submit error', err);
      alert('Network error while submitting application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Apply New Certificate</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Fill out the application details below.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* File Upload Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Camera color="var(--primary-color)" />
              <label style={{ fontWeight: 600 }}>Upload Bar Code Photo (Auto-detects IMEI with AI)</label>
            </div>
            <UploadButton onUploadSuccess={handleBarcodeUploadSuccess} />
            {isScanning && <p style={{ color: '#f59e0b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Scanning Barcode...</p>}
            {formData.barcodeUrl && !isScanning && <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.5rem' }}>✓ Scanned Successfully</p>}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileText color="var(--primary-color)" />
              <label style={{ fontWeight: 600 }}>Upload Vehicle RC Photo</label>
            </div>
            <UploadButton onUploadSuccess={handleRcUploadSuccess} />
            {formData.rcUrl && <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.5rem' }}>✓ RC Uploaded Successfully</p>}
          </div>
        </div>

        {/* Form Fields Section */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', flex: 2 }}>
        {/* Quota Exceeded Message - 1 Year */}
        {quota && quota.remainingQuota <= 0 && formData.validity === '1 Year' && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #f87171',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              Limit reached! You cannot submit another 1‑Year certificate. Please contact admin for more quota.
            </div>
          )}

        {/* Quota Exceeded Message - 2 Years */}
        {quota && quota.remainingQuota2Year <= 0 && formData.validity === '2 Years' && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #f87171',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              Limit reached! You cannot submit another 2‑Year certificate. Please subscribe for additional quota.
            </div>
          )}

        {/* 1-Year Quota Banner */}
        {quota && formData.validity === '1 Year' && (
          <div style={{ padding: '1rem', backgroundColor: quota.remainingQuota <= 5 ? '#fee2e2' : '#e0e7ff', borderRadius: '0.5rem', marginBottom: '1.5rem', border: `1px solid ${quota.remainingQuota <= 5 ? '#f87171' : '#818cf8'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontWeight: 600, color: quota.remainingQuota <= 5 ? '#991b1b' : '#3730a3', margin: 0 }}>Total Stocks</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: quota.remainingQuota <= 5 ? '#b91c1c' : '#4f46e5' }}>Total Allocated: {quota.totalQuota} | Used: {quota.usedQuota}</p>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: quota.remainingQuota <= 0 ? '#ef4444' : '#4f46e5' }}>
              {quota.remainingQuota} Left
            </div>
          </div>
        )}

        {/* 2-Year Quota Banner */}
        {quota && formData.validity === '2 Years' && (
          <div style={{ padding: '1rem', backgroundColor: quota.remainingQuota2Year <= 5 ? '#fee2e2' : '#f3e8ff', borderRadius: '0.5rem', marginBottom: '1.5rem', border: `1px solid ${quota.remainingQuota2Year <= 5 ? '#f87171' : '#a78bfa'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontWeight: 600, color: quota.remainingQuota2Year <= 5 ? '#991b1b' : '#5b21b6', margin: 0 }}>Additional Subscriptions</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: quota.remainingQuota2Year <= 5 ? '#b91c1c' : '#7c3aed' }}>Total Allocated: {quota.totalQuota2Year} | Used: {quota.usedQuota2Year}</p>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: quota.remainingQuota2Year <= 0 ? '#ef4444' : '#7c3aed' }}>
              {quota.remainingQuota2Year} Left
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>IMEI No</label>
              <input 
                type="text" name="imei" value={formData.imei} onChange={handleChange} required 
                placeholder="15-character IMEI"
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>VLD S.No</label>
              <input 
                type="text" name="vldSerial" value={formData.vldSerial} onChange={handleChange} required 
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vehicle No</label>
              <input 
                type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} required 
                placeholder="TN01AB1234"
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textTransform: 'uppercase' }} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Max 10 characters</span>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Registration Date</label>
              <input 
                type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} required 
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Validity (Years)</label>
              <select 
                name="validity" value={formData.validity} onChange={handleChange} required
                disabled={true}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              >
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Auto-calculated based on Reg Date</span>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Manufacturer</label>
              <select 
                name="manufacturer" value={formData.manufacturer} onChange={handleChange} required
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              >
                <option value="">Select Manufacturer</option>
                {manufacturers.map((manu, i) => (
                  <option key={i} value={manu}>{manu}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>RTO Office</label>
              <select 
                name="rtoOffice" value={formData.rtoOffice} onChange={handleChange} required
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
              >
                <option value="">Select RTO Office</option>
                {rtoOffices.map((rto, i) => (
                  <option key={i} value={rto}>{rto}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Customer Name</label>
              <input 
                type="text" name="customerName" value={formData.customerName} onChange={handleChange} required 
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
              <input 
                type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required 
                disabled={quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
              />
            </div>

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={submitting || (quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0)))}
              style={{ padding: '0.75rem 2rem', backgroundColor: (submitting || (quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0)))) ? '#cbd5e1' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: (submitting || (quota !== null && ((formData.validity === '1 Year' && quota.remainingQuota <= 0) || (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0)))) ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default ApplyCertificate;
