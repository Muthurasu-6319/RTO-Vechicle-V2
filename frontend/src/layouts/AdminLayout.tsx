import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import logo from '../assets/image.png';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Award, 
  CheckCircle, 
  Inbox, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  Package,
  ShoppingCart,
  ChevronDown
} from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [certMenuOpen, setCertMenuOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminManufacturer');
    navigate('/admin');
  };

  let token = sessionStorage.getItem('adminToken');
  let role = sessionStorage.getItem('adminRole');
  let manufacturer = sessionStorage.getItem('adminManufacturer');
  let name = sessionStorage.getItem('adminName');
  let email = sessionStorage.getItem('adminEmail');

  // If sessionStorage is empty on new tab load, initialize once from localStorage
  if (!token && localStorage.getItem('adminToken')) {
    token = localStorage.getItem('adminToken') || '';
    role = localStorage.getItem('adminRole') || '';
    manufacturer = localStorage.getItem('adminManufacturer') || '';
    name = localStorage.getItem('adminName') || '';
    email = localStorage.getItem('adminEmail') || '';
    if (token) sessionStorage.setItem('adminToken', token);
    if (role) sessionStorage.setItem('adminRole', role);
    if (manufacturer) sessionStorage.setItem('adminManufacturer', manufacturer);
    if (name) sessionStorage.setItem('adminName', name);
    if (email) sessionStorage.setItem('adminEmail', email);
  }

  const adminRole = (role || 'full admin').toLowerCase().trim();
  const adminToken = token || '';
  const adminManufacturer = manufacturer || '';

  // Super Admin check: token matches super admin token or role contains 'full' or 'super'
  const isSuperAdmin = adminToken === 'mock-jwt-token-for-admin' || adminRole.includes('full') || adminRole.includes('super');
  const isStandard = !isSuperAdmin && adminRole.includes('standard');

  const displayName = name || (isStandard ? 'Standard Admin' : 'Super Admin');
  const displayEmail = email || (isStandard ? '' : 'admin@gmail.com');

  let navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Admin Management', path: '/admin/management', icon: <Users size={20} /> },
    { name: 'Manage Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Applications', path: '/admin/applications', icon: <FileText size={20} /> },
    { name: 'Certificates', path: '/admin/certificates', icon: <Award size={20} />, isDropdown: true },
    { name: 'Orders', path: '/admin/orders', icon: <Package size={20} /> },
    { name: 'Purchase Entry', path: '/admin/purchase-entry', icon: <ShoppingCart size={20} /> },
    { name: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  if (isStandard) {
    navItems = navItems.filter(item => 
      ['Overview', 'Applications', 'Certificates'].includes(item.name)
    );
  }

  return (
    <div className="admin-layout">
      {/* Mobile Overlay */}
      <div 
        className={`admin-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>V LINK PORTAL</h2>
          </div>
          <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => {
              if (item.isDropdown && item.name === 'Certificates') {
                const isCertActive = location.pathname.startsWith('/admin/certificates') || location.pathname.startsWith('/admin/approved');
                return (
                  <li key="Certificates" style={{ display: 'flex', flexDirection: 'column' }}>
                    <button 
                      onClick={() => setCertMenuOpen(!certMenuOpen)}
                      className={`nav-link ${isCertActive ? 'active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="nav-icon"><Award size={20} /></span>
                        <span className="nav-text">Certificates</span>
                      </div>
                      <ChevronDown size={16} style={{ transform: certMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-secondary)' }} />
                    </button>
                    
                    {certMenuOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '2.25rem', marginTop: '0.25rem', gap: '0.25rem' }}>
                        <NavLink 
                          to="/admin/certificates" 
                          className={({ isActive }) => `sub-nav-link ${isActive ? 'active' : ''}`}
                          style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', textDecoration: 'none',
                            color: isActive ? '#3b82f6' : 'var(--text-secondary)',
                            backgroundColor: isActive ? '#eff6ff' : 'transparent',
                            fontWeight: isActive ? 600 : 500
                          })}
                        >
                          <Settings size={16} />
                          <span>Installed</span>
                        </NavLink>
                        <NavLink 
                          to="/admin/approved" 
                          className={({ isActive }) => `sub-nav-link ${isActive ? 'active' : ''}`}
                          style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', textDecoration: 'none',
                            color: isActive ? '#3b82f6' : 'var(--text-secondary)',
                            backgroundColor: isActive ? '#eff6ff' : 'transparent',
                            fontWeight: isActive ? 600 : 500
                          })}
                        >
                          <CheckCircle size={16} />
                          <span>Certified</span>
                        </NavLink>
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.name}>
                  <NavLink 
                    to={item.path} 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={24} />
          </button>
          
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationBell isAdmin={true} />
            <div className="admin-profile">
              <div className="avatar">{(displayName || 'A').charAt(0).toUpperCase()}</div>
              <div className="admin-info" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span className="admin-name" style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.2 }}>
                  {displayName}
                </span>
                {displayEmail && (
                  <span className="admin-email" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, lineHeight: 1.2 }}>
                    {displayEmail}
                  </span>
                )}
                <span className="admin-role" style={{ fontSize: '0.7rem', color: isStandard ? '#4f46e5' : '#166534', fontWeight: 600, lineHeight: 1.2 }}>
                  {isStandard ? 'Standard Admin' : 'Super Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
