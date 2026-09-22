import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import './Login.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const setAdminSession = (token: string, role: string, manufacturer?: string, name?: string, email?: string) => {
    sessionStorage.setItem('adminToken', token);
    sessionStorage.setItem('adminRole', role);
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminRole', role);

    if (name) {
      sessionStorage.setItem('adminName', name);
      localStorage.setItem('adminName', name);
    } else {
      sessionStorage.removeItem('adminName');
      localStorage.removeItem('adminName');
    }

    if (email) {
      sessionStorage.setItem('adminEmail', email);
      localStorage.setItem('adminEmail', email);
    } else {
      sessionStorage.removeItem('adminEmail');
      localStorage.removeItem('adminEmail');
    }

    if (manufacturer && !role.toLowerCase().includes('full')) {
      sessionStorage.setItem('adminManufacturer', manufacturer);
      localStorage.setItem('adminManufacturer', manufacturer);
    } else {
      sessionStorage.removeItem('adminManufacturer');
      localStorage.removeItem('adminManufacturer');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    // 0. Instant Super Admin Check
    if (cleanEmail === 'admin@gmail.com' && cleanPassword === 'admin') {
      setAdminSession('mock-jwt-token-for-admin', 'full admin', '', 'Super Admin', 'admin@gmail.com');
      navigate('/admin/dashboard');
      setIsLoading(false);
      return;
    }

    // 1. Try Backend API first
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      if (res.ok) {
        const data = await res.json();
        const role = cleanEmail === 'admin@gmail.com' ? 'full admin' : (data.role || 'standard');
        setAdminSession(data.token, role, data.manufacturer, data.name || cleanEmail, data.email || cleanEmail);
        
        const isStandard = role.toLowerCase().includes('standard');
        if (isStandard) {
          navigate('/admin/applications');
        } else {
          navigate('/admin/dashboard');
        }
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend login request failed, attempting client-side Firestore fallback:', err);
    }

    // 2. Client-side Firestore Fallback
    if (db) {
      try {
        const snapshot = await getDocs(collection(db, 'admins'));
        let validAdmin: any = null;

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const dEmail = (data.email || '').toLowerCase().trim();
          const dPassword = (data.password || '').trim();

          if (dEmail === cleanEmail && dPassword === cleanPassword) {
            validAdmin = { id: docSnap.id, ...data };
          }
        });

        if (validAdmin) {
          const role = cleanEmail === 'admin@gmail.com' ? 'full admin' : (validAdmin.role || 'standard');
          setAdminSession('mock-jwt-token-for-admin-' + validAdmin.id, role, validAdmin.manufacturer, validAdmin.name || cleanEmail, validAdmin.email || cleanEmail);

          const isStandard = role.toLowerCase().includes('standard');
          if (isStandard) {
            navigate('/admin/applications');
          } else {
            navigate('/admin/dashboard');
          }
          setIsLoading(false);
          return;
        }
      } catch (fErr) {
        console.error('Firestore client fallback login error:', fErr);
      }
    }

    setError('Invalid email or password. Please try again.');
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo"></div>
          <h1>RTO Portal</h1>
        </div>
        <div className="login-showcase">
          <h2>Welcome back to the Admin Dashboard</h2>
          <p>Manage users, applications, and certificates all in one place with a modern, efficient workflow.</p>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-box glass-panel fade-in">
          <h2>Admin Login</h2>
          <p className="login-subtitle">Enter your credentials to access your account</p>

          {error && (
            <div className="error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={20} />
                <input 
                  type="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={20} />
                <input 
                  type="password" 
                  id="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
