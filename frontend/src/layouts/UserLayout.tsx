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
  ChevronDown
} from 'lucide-react';

const UserLayout = () => {
  const navigate = useNavigate();
  const [certMenuOpen, setCertMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/user/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={logo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', margin: 0 }}>V LINK PORTAL</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>User Panel</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink 
            to="/user/dashboard" 
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
                <NavLink to="/user/certificates/apply" style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={16} /> Apply New
                </NavLink>
                <NavLink to="/user/certificates/installed" style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={16} /> Installed
                </NavLink>
                <NavLink to="/user/certificates/certified" style={{ padding: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Certified
                </NavLink>
              </div>
            )}
          </div>

          <NavLink 
            to="/user/received" 
            className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            <Inbox size={20} /> Received
          </NavLink>

          <NavLink 
            to="/user/subscription" 
            className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            <CreditCard size={20} /> Subscription
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
      <main style={{ flex: 1, padding: '2rem', height: '100vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', zIndex: 10 }}>
          <NotificationBell isAdmin={false} />
        </div>
        <Outlet />
      </main>
      
    </div>
  );
};

export default UserLayout;
