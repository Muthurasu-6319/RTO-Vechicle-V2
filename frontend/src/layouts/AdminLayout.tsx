import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  Package
} from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminManufacturer');
    navigate('/admin');
  };

  const adminRole = localStorage.getItem('adminRole') || 'standard';

  let navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Admin Management', path: '/admin/management', icon: <Users size={20} /> },
    { name: 'Manage Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Applications', path: '/admin/applications', icon: <FileText size={20} /> },
    { name: 'Certificates', path: '/admin/certificates', icon: <Award size={20} /> },
    { name: 'Approved', path: '/admin/approved', icon: <CheckCircle size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <Package size={20} /> },
    { name: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  if (adminRole === 'standard') {
    navItems = navItems.filter(item => 
      ['Applications', 'Certificates', 'Approved'].includes(item.name)
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>V LINK PORTAL</h2>
          </div>
          <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                </NavLink>
              </li>
            ))}
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
              <div className="avatar">A</div>
              <div className="admin-info">
                <span className="admin-name">Admin User</span>
                <span className="admin-role">Super Admin</span>
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
