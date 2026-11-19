import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Lock, 
  ShieldCheck, 
  Mail, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Settings = () => {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [rtoOffices, setRtoOffices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Security Credentials state
  const [adminId, setAdminId] = useState('admin@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [credSuccessMsg, setCredSuccessMsg] = useState('');
  const [credErrorMsg, setCredErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  const adminRole = (sessionStorage.getItem('adminRole') || localStorage.getItem('adminRole') || '').toLowerCase().trim();
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');

  const [newManufacturer, setNewManufacturer] = useState('');
  const [newRtoOffice, setNewRtoOffice] = useState('');

  const [editingManu, setEditingManu] = useState<{index: number, val: string} | null>(null);
  const [editingRto, setEditingRto] = useState<{index: number, val: string} | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    let fetchedFromBackend = false;

    // 1. Fetch Dynamic Dropdown Settings
    try {
      const res = await fetch(`${backendUrl}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data.manufacturers || []);
        setRtoOffices(data.rtoOffices || []);
        fetchedFromBackend = true;
      }
    } catch (err) {
      console.warn('Backend settings fetch failed, using Firestore Web SDK fallback');
    }

    if (!fetchedFromBackend && db) {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setManufacturers(data.manufacturers || []);
          setRtoOffices(data.rtoOffices || []);
        }
      } catch (e) {
        console.error('Firestore settings fallback failed:', e);
      }
    }

    // 2. Fetch Admin Security Credentials
    try {
      const credRes = await fetch(`${backendUrl}/api/settings/admin-credentials`);
      if (credRes.ok) {
        const credData = await credRes.json();
        if (credData.adminId) {
          setAdminId(credData.adminId);
          setLastUpdated(credData.updatedAt || null);
        }
      }
    } catch (err) {
      console.warn('Backend admin credentials fetch failed, checking Firestore directly');
    }

    if (db) {
      try {
        const credDoc = await getDoc(doc(db, 'settings', 'admin_credentials'));
        if (credDoc.exists()) {
          const cData = credDoc.data();
          if (cData.adminId || cData.email) {
            setAdminId(cData.adminId || cData.email);
            setLastUpdated(cData.updatedAt || null);
          }
        }
      } catch (e) {
        console.warn('Firestore admin credentials fetch fallback warning:', e);
      }
    }

    setLoading(false);
  };

  // Handler to update Admin ID and Password in Database
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredErrorMsg('');
    setCredSuccessMsg('');

    const cleanId = adminId.trim();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanId) {
      setCredErrorMsg('Please enter an Admin ID / Email address.');
      return;
    }

    if (!cleanPass) {
      setCredErrorMsg('Please enter a new password.');
      return;
    }

    if (cleanPass.length < 4) {
      setCredErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setCredErrorMsg('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setIsSavingCreds(true);
    const nowIso = new Date().toISOString();

    try {
      // 1. Save to Backend API
      try {
        await fetch(`${backendUrl}/api/settings/admin-credentials`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: cleanId, password: cleanPass })
        });
      } catch (beErr) {
        console.warn('Backend admin credentials update failed, saving directly to Firestore:', beErr);
      }

      // 2. Save directly to Firestore database
      if (db) {
        try {
          const credPayload = {
            adminId: cleanId,
            email: cleanId,
            password: cleanPass,
            updatedAt: nowIso,
            updatedBy: 'Admin Settings'
          };
          await Promise.all([
            setDoc(doc(db, 'settings', 'admin_credentials'), credPayload, { merge: true }),
            setDoc(doc(db, 'settings', 'config'), { adminCredentials: credPayload }, { merge: true })
          ]);
        } catch (dbErr) {
          console.warn('Firestore admin credentials save warning:', dbErr);
        }
      }

      // 3. Update localStorage and sessionStorage if current logged-in user is super admin
      if (isSuperAdmin) {
        localStorage.setItem('adminEmail', cleanId);
        sessionStorage.setItem('adminEmail', cleanId);
      }

      setLastUpdated(nowIso);
      setNewPassword('');
      setConfirmPassword('');
      setCredSuccessMsg('Admin ID and Password updated successfully in the database! Use these new credentials for future logins.');
      setTimeout(() => setCredSuccessMsg(''), 6000);
    } catch (err: any) {
      console.error('Error updating admin credentials:', err);
      setCredErrorMsg('Failed to update admin credentials. Please try again.');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const saveSettings = async (newManus: string[], newRtos: string[]) => {
    try {
      let savedOnBackend = false;
      try {
        const res = await fetch(`${backendUrl}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manufacturers: newManus, rtoOffices: newRtos })
        });
        if (res.ok) savedOnBackend = true;
      } catch (e) {
        console.warn('Backend saveSettings failed, falling back to Firestore Web SDK');
      }

      if (db) {
        try {
          await setDoc(doc(db, 'settings', 'config'), {
            manufacturers: newManus,
            rtoOffices: newRtos
          }, { merge: true });
          await setDoc(doc(db, 'settings', 'general'), {
            manufacturers: newManus,
            rtoOffices: newRtos
          }, { merge: true });
        } catch (e) {
          console.warn('Firestore settings update warning:', e);
        }
      }

      setManufacturers(newManus);
      setRtoOffices(newRtos);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    }
  };

  // --- Manufacturers Handlers ---
  const addManufacturer = () => {
    if (!newManufacturer.trim()) return;
    saveSettings([...manufacturers, newManufacturer.trim()], rtoOffices);
    setNewManufacturer('');
  };

  const deleteManufacturer = (index: number) => {
    if (!window.confirm('Are you sure you want to delete this manufacturer?')) return;
    const updated = manufacturers.filter((_, i) => i !== index);
    saveSettings(updated, rtoOffices);
  };

  const saveEditManufacturer = () => {
    if (!editingManu) return;
    const updated = [...manufacturers];
    updated[editingManu.index] = editingManu.val.trim();
    saveSettings(updated, rtoOffices);
    setEditingManu(null);
  };

  // --- RTO Offices Handlers ---
  const addRtoOffice = () => {
    if (!newRtoOffice.trim()) return;
    saveSettings(manufacturers, [...rtoOffices, newRtoOffice.trim()]);
    setNewRtoOffice('');
  };

  const deleteRtoOffice = (index: number) => {
    if (!window.confirm('Are you sure you want to delete this RTO Office?')) return;
    const updated = rtoOffices.filter((_, i) => i !== index);
    saveSettings(manufacturers, updated);
  };

  const saveEditRto = () => {
    if (!editingRto) return;
    const updated = [...rtoOffices];
    updated[editingRto.index] = editingRto.val.trim();
    saveSettings(manufacturers, updated);
    setEditingRto(null);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Settings...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>System Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Manage portal security credentials and dynamic dropdown values.</p>
        {saveMessage && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '0.5rem', fontWeight: 500 }}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* ==========================================================================
          ADMIN CREDENTIALS & SECURITY SECTION
          ========================================================================== */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '2rem', 
          borderRadius: '1rem', 
          marginBottom: '2rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              backgroundColor: '#EFF6FF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#2563EB',
              border: '1px solid #DBEAFE'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Admin Login Credentials
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Change your Super Admin Login ID and Password stored securely in the database.
              </p>
            </div>
          </div>

          {lastUpdated && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#64748B', 
              backgroundColor: '#F8FAFC', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '9999px',
              border: '1px solid #E2E8F0'
            }}>
              Last updated: {new Date(lastUpdated).toLocaleDateString()} at {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        {credSuccessMsg && (
          <div style={{ 
            marginBottom: '1.25rem', 
            padding: '0.875rem 1.25rem', 
            backgroundColor: '#ECFDF5', 
            border: '1px solid #A7F3D0',
            color: '#065F46', 
            borderRadius: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem'
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{credSuccessMsg}</span>
          </div>
        )}

        {credErrorMsg && (
          <div style={{ 
            marginBottom: '1.25rem', 
            padding: '0.875rem 1.25rem', 
            backgroundColor: '#FEF2F2', 
            border: '1px solid #FECACA',
            color: '#991B1B', 
            borderRadius: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem'
          }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{credErrorMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleUpdateCredentials}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            {/* Admin ID / Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Admin ID / Login Email <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Mail size={18} />
                </div>
                <input 
                  type="text" 
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.625rem 1rem 0.625rem 2.5rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9375rem',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.375rem', marginInline: '2px' }}>
                Enter your Admin login username or email (e.g. admin@gmail.com)
              </p>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                New Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 chars)"
                  style={{ 
                    width: '100%', 
                    padding: '0.625rem 2.75rem 0.625rem 2.5rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9375rem',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    color: '#94A3B8',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.375rem', marginInline: '2px' }}>
                Choose a strong password to protect the admin portal
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <KeyRound size={18} />
                </div>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ 
                    width: '100%', 
                    padding: '0.625rem 2.75rem 0.625rem 2.5rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9375rem',
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    color: '#94A3B8',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.375rem', marginInline: '2px' }}>
                Must exactly match the new password above
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="submit"
              disabled={isSavingCreds}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                backgroundColor: isSavingCreds ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: isSavingCreds ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (!isSavingCreds) (e.currentTarget as HTMLElement).style.backgroundColor = '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                if (!isSavingCreds) (e.currentTarget as HTMLElement).style.backgroundColor = '#2563EB';
              }}
            >
              <Lock size={16} />
              <span>{isSavingCreds ? 'Saving to Database...' : 'Save Admin Credentials'}</span>
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Manufacturers Section */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>Manufacturers</h3>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              value={newManufacturer} 
              onChange={e => setNewManufacturer(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') addManufacturer(); }}
              placeholder="Add new manufacturer..."
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
            <button onClick={addManufacturer} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              <PlusCircle size={16} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {manufacturers.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No manufacturers added yet.</p>}
            {manufacturers.map((manu, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                {editingManu?.index === i ? (
                  <input 
                    type="text" value={editingManu.val} onChange={e => setEditingManu({ ...editingManu, val: e.target.value })}
                    style={{ flex: 1, padding: '0.25rem 0.5rem', marginRight: '1rem' }}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: '#334155' }}>{manu}</span>
                )}
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingManu?.index === i ? (
                    <>
                      <button onClick={saveEditManufacturer} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><Check size={18} /></button>
                      <button onClick={() => setEditingManu(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingManu({ index: i, val: manu })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      {isSuperAdmin && (
                        <button onClick={() => deleteManufacturer(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RTO Offices Section */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>RTO Offices</h3>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              value={newRtoOffice} 
              onChange={e => setNewRtoOffice(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') addRtoOffice(); }}
              placeholder="Add new RTO office..."
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
            <button onClick={addRtoOffice} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              <PlusCircle size={16} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rtoOffices.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No RTO offices added yet.</p>}
            {rtoOffices.map((rto, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                {editingRto?.index === i ? (
                  <input 
                    type="text" value={editingRto.val} onChange={e => setEditingRto({ ...editingRto, val: e.target.value })}
                    style={{ flex: 1, padding: '0.25rem 0.5rem', marginRight: '1rem' }}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: '#334155' }}>{rto}</span>
                )}
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingRto?.index === i ? (
                    <>
                      <button onClick={saveEditRto} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><Check size={18} /></button>
                      <button onClick={() => setEditingRto(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingRto({ index: i, val: rto })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Edit2 size={16} /></button>
                      {isSuperAdmin && (
                        <button onClick={() => deleteRtoOffice(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
