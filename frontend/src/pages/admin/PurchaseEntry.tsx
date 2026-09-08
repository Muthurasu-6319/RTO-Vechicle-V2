import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Trash2, Download, Package, UserPlus } from 'lucide-react';

const PurchaseEntry = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [stockStats, setStockStats] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedPurchaseEntry, setSelectedPurchaseEntry] = useState<any>(null);
  const [allocateForm, setAllocateForm] = useState({
    userId: '',
    stockQty: '',
    subQty: ''
  });
  const [formData, setFormData] = useState({
    date: '',
    manufacturer: '',
    quantity: '',
    invoiceNo: '',
    remarks: ''
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, settingsRes, statsRes, usersRes] = await Promise.all([
        fetch(`${backendUrl}/api/purchase-entries`),
        fetch(`${backendUrl}/api/settings`),
        fetch(`${backendUrl}/api/stats/manufacturer-stock`),
        fetch(`${backendUrl}/api/users`)
      ]);
      
      if (entriesRes.ok) {
        setEntries(await entriesRes.json());
      }
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setManufacturers(settingsData.manufacturers || []);
      }

      if (statsRes.ok) {
        setStockStats(await statsRes.json());
      }

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({ date: '', manufacturer: '', quantity: '', invoiceNo: '', remarks: '' });
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity)
      };
      
      const res = await fetch(`${backendUrl}/api/purchase-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchData();
      } else {
        alert("Failed to add purchase entry.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase entry?")) return;
    try {
      const res = await fetch(`${backendUrl}/api/purchase-entries/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAllocateModal = (entry: any) => {
    setSelectedPurchaseEntry(entry);
    setAllocateForm({ userId: '', stockQty: entry.quantity?.toString() || '0', subQty: entry.quantity?.toString() || '0' });
    setAllocateModalOpen(true);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateForm.userId) {
      alert("Please select a User");
      return;
    }
    
    const user = users.find(u => u.id === allocateForm.userId);
    const userName = user ? (user.fullName || user.name) : 'Unknown User';
    const userEmail = user ? user.email : '';
    
    const stockQty = Number(allocateForm.stockQty);
    const subQty = Number(allocateForm.subQty);
    
    try {
      if (stockQty > 0) {
        const orderData = {
          userId: allocateForm.userId,
          userName,
          userEmail,
          item: selectedPurchaseEntry.manufacturer,
          quantity: stockQty,
          orderedDate: new Date().toISOString().split('T')[0],
          managerApproval: true,
          accountsApproval: true,
          dispatched: true,
          batch: selectedPurchaseEntry.invoiceNo || '',
          orderId: `ORD-${Date.now()}`
        };
        await fetch(`${backendUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
      }

      if (subQty > 0) {
        const subData = {
          userId: allocateForm.userId,
          userName,
          userEmail,
          subscriptionCount: subQty,
          date: new Date().toISOString().split('T')[0],
          remarks: `Allocated from Purchase Entry: ${selectedPurchaseEntry.invoiceNo || 'N/A'}`
        };
        await fetch(`${backendUrl}/api/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subData)
        });
      }
      
      alert("Stocks and Subscriptions allocated successfully!");
      setAllocateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Allocation Error:", err);
      alert("Failed to allocate.");
    }
  };

  const downloadCSV = () => {
    if (entries.length === 0) {
      alert("No data available to download.");
      return;
    }
    
    const headers = ["Date,Manufacturer,Quantity,Invoice No,Remarks,Created At"];
    const rows = entries.map(entry => {
      return `"${entry.date}","${entry.manufacturer}","${entry.quantity}","${entry.invoiceNo}","${entry.remarks}","${entry.createdAt}"`;
    });
    
    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Purchase_Entries_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter(entry => {
    const q = searchQuery.toLowerCase();
    return (
      (entry.manufacturer && entry.manufacturer.toLowerCase().includes(q)) ||
      (entry.invoiceNo && entry.invoiceNo.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Purchase Entries</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track incoming stock and download reports.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '250px' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Invoice, Manufacturer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
          
          <button 
            onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            <Download size={18} /> Download Report
          </button>
          
          <button 
            onClick={openCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            <PlusCircle size={18} /> New Entry
          </button>
        </div>
      </div>

      {/* Manufacturer Stock Overview Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Stock Overview</h3>
        {Object.keys(stockStats).length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '1rem' }}>
            No stock data available yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {Object.keys(stockStats).map(mfg => (
              <div key={mfg} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.75rem' }}>
                  <Package size={24} />
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{mfg}</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stockStats[mfg].currentStock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No purchase entries found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Manufacturer</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Invoice No</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Remarks</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{entry.date}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{entry.manufacturer}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                        {entry.quantity}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{entry.invoiceNo || '-'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{entry.remarks || '-'}</td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={() => openAllocateModal(entry)}
                        title="Allocate to User"
                        style={{ padding: '0.4rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginRight: '0.5rem' }}
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        title="Delete Entry"
                        style={{ padding: '0.4rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Add Purchase Entry</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Quantity</label>
                  <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Manufacturer</label>
                <select 
                  name="manufacturer" value={formData.manufacturer} onChange={handleChange} required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Manufacturer --</option>
                  {manufacturers.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Invoice No</label>
                <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Remarks (Optional)</label>
                <textarea name="remarks" rows={2} value={formData.remarks} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {allocateModalOpen && selectedPurchaseEntry && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Allocate to User</h3>
              <button onClick={() => setAllocateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}><strong>Manufacturer:</strong> {selectedPurchaseEntry.manufacturer}</p>
              <p style={{ fontSize: '0.875rem', color: '#475569' }}><strong>Available Qty in Entry:</strong> {selectedPurchaseEntry.quantity}</p>
            </div>

            <form onSubmit={handleAllocateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Select User</label>
                <select 
                  name="userId" value={allocateForm.userId} onChange={(e) => setAllocateForm(prev => ({ ...prev, userId: e.target.value }))} required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName || u.name} ({u.email || u.mobile})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Stock Quantity</label>
                  <input type="number" min="0" value={allocateForm.stockQty} onChange={(e) => setAllocateForm(prev => ({ ...prev, stockQty: e.target.value }))} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Subscription Qty</label>
                  <input type="number" min="0" value={allocateForm.subQty} onChange={(e) => setAllocateForm(prev => ({ ...prev, subQty: e.target.value }))} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setAllocateModalOpen(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseEntry;
