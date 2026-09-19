import React, { useState, useEffect } from 'react';
import { ShoppingCart, PlusCircle, Calendar, Hash, FileText, Trash2, Edit, CheckCircle, Package, CreditCard, UserPlus, Users, ArrowRight, Search, Download } from 'lucide-react';
import SearchableUserSelect from '../../components/SearchableUserSelect';
import SearchableManufacturerSelect from '../../components/SearchableManufacturerSelect';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PurchaseEntry = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [stockStats, setStockStats] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [selectedPurchaseEntry, setSelectedPurchaseEntry] = useState<any>(null);
  const [allocateForm, setAllocateForm] = useState({
    userId: '',
    stockQty: '',
    subQty: ''
  });
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    manufacturer: '',
    quantity: '',
    invoiceNo: '',
    remarks: ''
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const computeStockMap = (purchases: any[], ordersList: any[]) => {
    const map: Record<string, { manufacturer: string; totalPurchased: number; totalAllocated: number; currentStock: number }> = {};

    purchases.forEach(p => {
      const rawMfg = p.manufacturer ? String(p.manufacturer).trim() : '';
      if (!rawMfg) return;
      const key = rawMfg.toUpperCase();
      const qty = Number(p.quantity) || 0;
      if (!map[key]) {
        map[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      }
      map[key].totalPurchased += qty;
    });

    ordersList.forEach(o => {
      const rawMfg = o.item || o.manufacturer ? String(o.item || o.manufacturer).trim() : '';
      if (!rawMfg) return;
      const key = rawMfg.toUpperCase();
      const qty = Number(o.quantity) || 0;
      if (!map[key]) {
        map[key] = { manufacturer: rawMfg, totalPurchased: 0, totalAllocated: 0, currentStock: 0 };
      }
      map[key].totalAllocated += qty;
    });

    for (const key in map) {
      map[key].currentStock = map[key].totalPurchased - map[key].totalAllocated;
    }
    return map;
  };

  const fetchData = async () => {
    setLoading(true);
    let fetchedFromBackend = false;
    let purchases: any[] = [];
    let ordersList: any[] = [];
    try {
      const [entriesRes, settingsRes, statsRes, usersRes, ordersRes] = await Promise.all([
        fetch(`${backendUrl}/api/purchase-entries`),
        fetch(`${backendUrl}/api/settings`),
        fetch(`${backendUrl}/api/stats/manufacturer-stock`),
        fetch(`${backendUrl}/api/users`),
        fetch(`${backendUrl}/api/orders`)
      ]);
      
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        if (Array.isArray(data)) {
          purchases = data;
          setEntries(data);
          fetchedFromBackend = true;
        }
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          ordersList = ordersData;
        }
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setManufacturers(settingsData.manufacturers || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (Object.keys(statsData).length > 0) {
          setStockStats(statsData);
        } else {
          setStockStats(computeStockMap(purchases, ordersList));
        }
      } else {
        setStockStats(computeStockMap(purchases, ordersList));
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setUsers(usersData.filter((u: any) => u.role !== 'admin'));
        }
      }
    } catch (err) {
      console.warn('Backend purchase-entries fetch failed, using Firestore Web SDK fallback');
    }

    if (!fetchedFromBackend && db) {
      try {
        const [entriesSnap, settingsDoc, usersSnap, ordersSnap] = await Promise.all([
          getDocs(collection(db, 'purchaseEntries')),
          getDoc(doc(db, 'settings', 'config')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'orders'))
        ]);
        const allEntries = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allEntries.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setEntries(allEntries);

        const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStockStats(computeStockMap(allEntries, allOrders));

        if (settingsDoc.exists()) {
          setManufacturers(settingsDoc.data()?.manufacturers || []);
        }
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.role !== 'admin'));
      } catch (e) {
        console.error('Firestore purchase entries fallback failed:', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({ date: getTodayDate(), manufacturer: '', quantity: '', invoiceNo: '', remarks: '' });
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Purchase Entries</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track incoming stock and download reports.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '250px', flexShrink: 0 }}>
            <Search size={18} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input 
              type="text" placeholder="Search Invoice, Manufacturer..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button 
              onClick={downloadCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Download size={18} /> Download Report
            </button>
            
            <button 
              onClick={openCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <PlusCircle size={18} /> New Entry
            </button>
          </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {Object.keys(stockStats).map(mfgKey => {
              const item = stockStats[mfgKey];
              const mfgName = (typeof item === 'object' && item.manufacturer) ? item.manufacturer : mfgKey;
              const currentStock = typeof item === 'number' ? item : (item.currentStock ?? 0);
              const totalPurchased = typeof item === 'object' ? (item.totalPurchased ?? 0) : 0;
              const totalAllocated = typeof item === 'object' ? (item.totalAllocated ?? 0) : 0;
              return (
                <div key={mfgKey} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.875rem', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '0.75rem', flexShrink: 0 }}>
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{mfgName}</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {currentStock}
                      {(totalPurchased > 0 || totalAllocated > 0) && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
                          (In: {totalPurchased} | Used: {totalAllocated})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        {/* Pagination controls above table */}
        {filteredEntries.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
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
                {paginatedEntries.map((entry) => (
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
          backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '500px', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Add Purchase Entry</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              {/* Body */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Quantity</label>
                    <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Manufacturer</label>
                  <SearchableManufacturerSelect
                    manufacturers={manufacturers}
                    value={formData.manufacturer}
                    onChange={(val) => setFormData(prev => ({ ...prev, manufacturer: val }))}
                    placeholder="-- Choose Manufacturer --"
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Invoice No</label>
                  <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleChange} required style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}>Remarks (Optional)</label>
                  <textarea name="remarks" rows={2} value={formData.remarks} onChange={handleChange} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'none', fontSize: '0.875rem' }}></textarea>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexShrink: 0, backgroundColor: '#f8fafc' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={{ flex: 1, padding: '0.625rem', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.625rem', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>
                  Save Entry
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
