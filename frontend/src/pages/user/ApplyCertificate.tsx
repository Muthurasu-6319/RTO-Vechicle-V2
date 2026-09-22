import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import UploadButton from '../../components/UploadButton';
import { Camera, FileText } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useAuthUser, useUserApplications, useUserOrders, useUserSubscriptions } from '../../hooks/useUserData';

const ApplyCertificate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const userId = user?.uid;

  const { data: applications = [] } = useUserApplications(userId);
  const { data: orders = [] } = useUserOrders(userId);
  const { data: subscriptions = [] } = useUserSubscriptions(userId);

  // Compute live quota metrics directly from RAM cached data
  const totalQuota1Year = orders.reduce((sum: number, o: any) => sum + Number(o.quantity || 0), 0);
  const totalQuota2Year = subscriptions.reduce((sum: number, s: any) => sum + Number(s.subscriptionCount || 0), 0);

  const usedBalanceStock = applications.length;
  const usedAdditionalSub = applications.filter((app: any) => (app.validity || '').trim() === '2 Years').length;

  const remainingQuota = Math.max(0, totalQuota1Year - usedBalanceStock);
  const remainingQuota2Year = Math.max(0, totalQuota2Year - usedAdditionalSub);

  const quota = {
    totalQuota: totalQuota1Year,
    usedQuota: usedBalanceStock,
    remainingQuota,
    totalQuota2Year,
    usedQuota2Year: usedAdditionalSub,
    remainingQuota2Year
  };

  const [formData, setFormData] = useState({
    imei: '',
    vldSerial: '',
    vehicleNo: '',
    registrationDate: '',
    validity: '',
    manufacturer: '',
    rtoOffice: '',
    customerName: '',
    mobileNumber: '',
    barcodeUrl: '',
    rcUrl: ''
  });

  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    imei: '',
    vldSerial: '',
    vehicleNo: ''
  });

  // Dynamic Settings
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [rtoOffices, setRtoOffices] = useState<string[]>([]);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    // Fetch Settings
    const fetchSettings = async () => {
      let fetchedFromBackend = false;
      try {
        const res = await fetch(`${backendUrl}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if ((data.manufacturers && data.manufacturers.length > 0) || (data.rtoOffices && data.rtoOffices.length > 0)) {
            setManufacturers(data.manufacturers || []);
            setRtoOffices(data.rtoOffices || []);
            fetchedFromBackend = true;
          }
        }
      } catch (err) {
        console.warn('Backend settings fetch failed, using Firestore Web SDK fallback', err);
      }

      if (!fetchedFromBackend && db) {
        try {
          const configDoc = await getDoc(doc(db, 'settings', 'config'));
          const genDoc = await getDoc(doc(db, 'settings', 'general'));
          const configData = configDoc.exists() ? configDoc.data() : {};
          const genData = genDoc.exists() ? genDoc.data() : {};

          const manus = (genData.manufacturers && genData.manufacturers.length > 0)
            ? genData.manufacturers
            : (configData.manufacturers || []);

          const rtos = (genData.rtoOffices && genData.rtoOffices.length > 0)
            ? genData.rtoOffices
            : (configData.rtoOffices || []);

          setManufacturers(manus);
          setRtoOffices(rtos);
        } catch (e) {
          console.error('Firestore settings fallback failed:', e);
        }
      }
    };
    
    fetchSettings();
  }, []);

  // Logic to calculate Validity based on Registration Date
  useEffect(() => {
    if (formData.registrationDate) {
      // Up to 22/09/2018 => 1 Year; After 22/09/2018 (23/09/2018 onwards) => 2 Years
      if (formData.registrationDate <= '2018-09-22') {
        setFormData(prev => ({ ...prev, validity: '1 Year' }));
      } else {
        setFormData(prev => ({ ...prev, validity: '2 Years' }));
      }
    } else {
      setFormData(prev => ({ ...prev, validity: '' }));
    }
  }, [formData.registrationDate]);

  // Logic to calculate Manufacturer based on VLD S.No
  useEffect(() => {
    const upperVld = formData.vldSerial.toUpperCase();
    
    const getExactManu = (searchStr: string) => manufacturers.find(m => m.toUpperCase().includes(searchStr)) || '';
    const getExactHitech = () => manufacturers.find(m => {
      const u = m.toUpperCase().replace(/\s/g, '');
      return u.includes('HITECH') || u.includes('HITEH') || u.includes('HIITECH');
    }) || '';

    if (upperVld.startsWith('IRSN') || upperVld.startsWith('IRNS')) {
      const exactMercyda = getExactManu('MERCYDA');
      if (exactMercyda && formData.manufacturer !== exactMercyda) {
        setFormData(prev => ({ ...prev, manufacturer: exactMercyda }));
      }
    } else if (upperVld.startsWith('HITECH') || upperVld.startsWith('HITEH')) {
      const exactHitech = getExactHitech();
      if (exactHitech && formData.manufacturer !== exactHitech) {
        setFormData(prev => ({ ...prev, manufacturer: exactHitech }));
      }
    } else {
      const exactHitech = getExactHitech();
      const exactMercyda = getExactManu('MERCYDA');
      if (exactHitech && (formData.manufacturer === exactMercyda || formData.manufacturer === '')) {
        setFormData(prev => ({ ...prev, manufacturer: exactHitech }));
      }
    }
  }, [formData.vldSerial, manufacturers]);

  // Real-time Validation for Uniqueness (IMEI No, VLD S.No, Vehicle No)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const rawImei = formData.imei.trim();
      const rawVld = formData.vldSerial.trim();
      const rawVehicle = formData.vehicleNo.trim();

      const cleanImei = rawImei.length >= 5 ? rawImei.replace(/\s/g, '').toLowerCase() : '';
      const cleanVld = rawVld.length >= 3 ? rawVld.replace(/\s/g, '').toLowerCase() : '';
      const cleanVehicle = rawVehicle.length >= 3 ? rawVehicle.replace(/[\s\-_]/g, '').toUpperCase() : '';

      if (!cleanImei && !cleanVld && !cleanVehicle) {
        setErrors({ imei: '', vldSerial: '', vehicleNo: '' });
        return;
      }

      let imeiExists = false;
      let vldExists = false;
      let vehicleExists = false;

      // 1. Check via client-side Firestore Web SDK (direct connection to applications collection)
      if (db) {
        try {
          const appsRef = collection(db, 'applications');
          const snapshot = await getDocs(appsRef);
          const allApps = snapshot.docs.map(doc => doc.data());

          imeiExists = !!cleanImei && allApps.some((a: any) => {
            const val = String(a.imei || a.imeiNo || a.IMEI || a.imeiNumber || '').replace(/\s/g, '').toLowerCase();
            return val && val === cleanImei;
          });

          vldExists = !!cleanVld && allApps.some((a: any) => {
            const val = String(a.vldSerial || a.vldNo || a.vldSerialNo || a.serialNo || '').replace(/\s/g, '').toLowerCase();
            return val && val === cleanVld;
          });

          vehicleExists = !!cleanVehicle && allApps.some((a: any) => {
            const val = String(a.vehicleNo || a.regNo || a.registrationNo || a.vehicleNumber || a.vehicle_no || '').replace(/[\s\-_]/g, '').toUpperCase();
            return val && val === cleanVehicle;
          });
        } catch (e) {
          console.warn('Firestore uniqueness check error:', e);
        }
      }

      // 2. Also check Backend API
      try {
        const payload = { imei: rawImei, vldSerial: rawVld, vehicleNo: rawVehicle };
        const res = await fetch(`${backendUrl}/api/applications/check-unique`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.imeiExists) imeiExists = true;
          if (data.vldExists) vldExists = true;
          if (data.vehicleExists) vehicleExists = true;
        }
      } catch (err) {
        console.warn('Backend uniqueness check error:', err);
      }

      setErrors({
        imei: imeiExists ? 'This IMEI number is already registered.' : '',
        vldSerial: vldExists ? 'This VLD S.No is already registered.' : '',
        vehicleNo: vehicleExists ? 'This vehicle number is already registered.' : ''
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [formData.imei, formData.vldSerial, formData.vehicleNo, backendUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'validity') {
      return;
    }

    // Vehicle No Validation: Max 10 characters, always UPPERCASE
    if (name === 'vehicleNo') {
      if (value.length > 10) return;
      setFormData(prev => ({ ...prev, vehicleNo: value.toUpperCase() }));
      return;
    }
    
    // IMEI Validation: Max 15 characters
    if (name === 'imei' && value.length > 15) {
      return;
    }

    // Mobile Number Validation: Only digits, Max 10 characters
    if (name === 'mobileNumber') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 10) return;
      setFormData(prev => ({ ...prev, mobileNumber: digitsOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBarcodeUploadSuccess = async (url: string) => {
    setFormData(prev => ({ ...prev, barcodeUrl: url }));
    
    setIsScanning(true);
    try {
      const res = await fetch(`${backendUrl}/api/scan-barcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          imei: data.imei || prev.imei,
          vldSerial: data.vldSerial || prev.vldSerial
        }));
      } else {
        console.error('Failed to scan barcode', await res.text());
        alert('Failed to auto-scan barcode. Please enter details manually.');
      }
    } catch (err) {
      console.error('Scan error:', err);
      alert('Network error while scanning barcode.');
    } finally {
      setIsScanning(false);
    }
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
    if (quota.remainingQuota <= 0) {
      alert('your stock count 0');
      return;
    }

    // Quota Enforcement - 2 Years
    if (formData.validity === '2 Years' && quota.remainingQuota2Year <= 0) {
      alert('your Subscription count 0');
      return;
    }

    if (!formData.validity) {
      alert('Please enter Registration Date first to determine validity.');
      return;
    }

    if (formData.imei.length !== 15) {
      alert('IMEI Number must be exactly 15 characters long.');
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      alert('Mobile Number must be exactly 10 digits.');
      return;
    }
    
    if (errors.imei) {
      alert(errors.imei);
      return;
    }
    if (errors.vldSerial) {
      alert(errors.vldSerial);
      return;
    }
    if (errors.vehicleNo) {
      alert(errors.vehicleNo);
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
        // Invalidate applications & quota queries so RAM cache updates
        const currentUser = auth.currentUser;
        if (currentUser) {
          queryClient.invalidateQueries({ queryKey: ['applications', currentUser.uid] });
          queryClient.invalidateQueries({ queryKey: ['orders', currentUser.uid] });
          queryClient.invalidateQueries({ queryKey: ['subscriptions', currentUser.uid] });
        }

        // Reset form
        setFormData({
          imei: '',
          vldSerial: '',
          vehicleNo: '',
          registrationDate: '',
          validity: '',
          manufacturer: '',
          rtoOffice: '',
          customerName: '',
          mobileNumber: '',
          barcodeUrl: '',
          rcUrl: ''
        });
        // Automatically navigate to Installed page after successful submit
        navigate('/user/certificates/installed');
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

  const isStockZero = quota.remainingQuota <= 0;
  const isSubZeroFor2Year = quota.remainingQuota2Year <= 0 && formData.validity === '2 Years';

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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>IMEI No</label>
              <input 
                type="text" name="imei" value={formData.imei} onChange={handleChange} required 
                placeholder="15-character IMEI"
                disabled={isStockZero}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${errors.imei ? '#ef4444' : '#e2e8f0'}`, backgroundColor: '#f8fafc' }} 
              />
              {errors.imei && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>{errors.imei}</span>}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>VLD S.No</label>
              <input 
                type="text" name="vldSerial" value={formData.vldSerial} onChange={handleChange} required 
                disabled={isStockZero}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${errors.vldSerial ? '#ef4444' : '#e2e8f0'}`, backgroundColor: '#f8fafc' }} 
              />
              {errors.vldSerial && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>{errors.vldSerial}</span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vehicle No</label>
              <input 
                type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} required 
                placeholder="TN01AB1234"
                disabled={isStockZero}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${errors.vehicleNo || isStockZero ? '#ef4444' : '#e2e8f0'}`, textTransform: 'uppercase', backgroundColor: isStockZero ? '#fef2f2' : 'white' }} 
              />
              {isStockZero ? (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  your stock count 0
                </span>
              ) : errors.vehicleNo ? (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>{errors.vehicleNo}</span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Max 10 characters</span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Registration Date <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(DD/MM/YYYY)</span>
              </label>
              <input 
                type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} required 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
              />
              {formData.registrationDate && (
                <span style={{ fontSize: '0.75rem', color: '#4f46e5', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  Selected Date: {formData.registrationDate.split('-').reverse().join('/')}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Validity (Years)</label>
              <select 
                name="validity" value={formData.validity} onChange={handleChange} required
                disabled={true}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#1e293b', fontWeight: 600 }}
              >
                <option value="" disabled>— Enter Reg Date to auto-calculate —</option>
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Auto-calculated based on Reg Date</span>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Manufacturer</label>
              <select 
                name="manufacturer" value={formData.manufacturer} onChange={handleChange} required
                disabled={isStockZero}
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
                disabled={isStockZero || isSubZeroFor2Year}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${isSubZeroFor2Year ? '#ef4444' : '#e2e8f0'}`, backgroundColor: isSubZeroFor2Year ? '#fef2f2' : 'white', cursor: (isStockZero || isSubZeroFor2Year) ? 'not-allowed' : 'pointer' }}
              >
                <option value="">Select RTO Office</option>
                {rtoOffices.map((rto, i) => (
                  <option key={i} value={rto}>{rto}</option>
                ))}
              </select>
              {isSubZeroFor2Year && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  your Subscription count 0
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Customer Name</label>
              <input 
                type="text" name="customerName" value={formData.customerName} onChange={handleChange} required 
                disabled={isStockZero}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
              <input 
                type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required 
                placeholder="10-digit mobile number"
                maxLength={10}
                disabled={isStockZero}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${formData.mobileNumber.length > 0 && formData.mobileNumber.length < 10 ? '#f59e0b' : '#e2e8f0'}` }} 
              />
              {formData.mobileNumber.length > 0 && formData.mobileNumber.length < 10 && (
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>
                  {10 - formData.mobileNumber.length} more digit(s) needed
                </span>
              )}
              {formData.mobileNumber.length === 10 && (
                <span style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>✓ Valid mobile number</span>
              )}
            </div>

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={submitting || isStockZero || isSubZeroFor2Year || !!errors.imei || !!errors.vldSerial || !!errors.vehicleNo}
              style={{ padding: '0.75rem 2rem', backgroundColor: (submitting || isStockZero || isSubZeroFor2Year || !!errors.imei || !!errors.vldSerial || !!errors.vehicleNo) ? '#cbd5e1' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: (submitting || isStockZero || isSubZeroFor2Year || !!errors.imei || !!errors.vldSerial || !!errors.vehicleNo) ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
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
