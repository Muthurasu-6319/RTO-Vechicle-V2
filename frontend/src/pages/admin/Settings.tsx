import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Edit2, Check, X } from 'lucide-react';

const Settings = () => {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [rtoOffices, setRtoOffices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [newManufacturer, setNewManufacturer] = useState('');
  const [newRtoOffice, setNewRtoOffice] = useState('');

  const [editingManu, setEditingManu] = useState<{index: number, val: string} | null>(null);
  const [editingRto, setEditingRto] = useState<{index: number, val: string} | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data.manufacturers || []);
        setRtoOffices(data.rtoOffices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newManus: string[], newRtos: string[]) => {
    try {
      await fetch(`${backendUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturers: newManus, rtoOffices: newRtos })
      });
      setManufacturers(newManus);
      setRtoOffices(newRtos);
    } catch (err) {
      console.error(err);
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
        <p style={{ color: 'var(--text-secondary)' }}>Manage dynamic dropdown values used across the portal.</p>
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
                      <button onClick={() => deleteManufacturer(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
                      <button onClick={() => deleteRtoOffice(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
