import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logo from '../assets/image.png';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  Settings, 
  LogOut,
  Inbox,
  CreditCard,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import './UserLayout.css';

const UserLayout = () => {
  const navigate = useNavigate();
  const [certMenuOpen, setCertMenuOpen] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserName(user.displayName || 'Dealer');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/user/login');
  };

  return (
    <div className="user-layout">
      
      {/* Mobile Topbar */}
      <div className="user-topbar-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logo} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', margin: 0 }}>V LINK PORTAL</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <NotificationBell isAdmin={false} />
          <button className="user-mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`user-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`user-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '50%' }} />
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', margin: 0 }}>V LINK PORTAL</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Dealer Panel</p>
            </div>
          </div>
          <button className="user-mobile-toggle" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink 
            to="/user/dashboard" 
            onClick={() => setIsSidebarOpen(false)}
            className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>

          {/* Certificates Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              onClick={() => setCertMenuOpen(!certMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'none', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={20} /> Certificates
              </div>
              <ChevronDown size={16} style={{ transform: certMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            
            {certMenuOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '2.5rem', marginTop: '0.5rem', gap: '0.25rem' }}>
                <NavLink to="/user/certificates/apply" onClick={() => setIsSidebarOpen(false)} style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={16} /> Apply New
                </NavLink>
                <NavLink to="/user/certificates/installed" onClick={() => setIsSidebarOpen(false)} style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={16} /> Installed
                </NavLink>
                <NavLink to="/user/certificates/certified" onClick={() => setIsSidebarOpen(false)} style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Certified
                </NavLink>
              </div>
            )}
          </div>

          <NavLink 
            to="/user/received" 
            onClick={() => setIsSidebarOpen(false)}
            className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            <Inbox size={20} /> Received
          </NavLink>

          <NavLink 
            to="/user/subscription" 
            onClick={() => setIsSidebarOpen(false)}
            className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            <CreditCard size={20} /> Additional Subscription
          </NavLink>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', borderRadius: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="user-main-content">
        <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem' }} className="desktop-only-welcome">
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Welcome, {userName}</span>
          <NotificationBell isAdmin={false} />
        </div>
        <Outlet />
      </main>
      
    </div>
  );
};

export default UserLayout;
