import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Lock, Mail, AlertCircle, Loader } from 'lucide-react';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify user exists and role in Firestore (Optional but good practice)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'user') {
          // Store token/session logic here if needed
          window.location.href = '/user/dashboard';
        } else {
          setError('Access denied. Only registered customers can login here.');
          auth.signOut();
        }
      } else {
        setError('User profile not found in database.');
        auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8fafc', flexDirection: 'row', flexWrap: 'wrap' }}>
      
      {/* Left Side: Welcome Text */}
      <div style={{ flex: '1 1 50%', minWidth: '300px', backgroundColor: '#0f172a', padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#3b82f6', borderRadius: '12px', marginBottom: '2rem' }}></div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            Welcome to the<br/><span style={{ color: '#3b82f6' }}>User Portal</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#cbd5e1', maxWidth: '450px', lineHeight: 1.6 }}>
            Manage your Vahan devices, apply for new certificates, and track your subscriptions securely all in one place.
          </p>
        </div>
        
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(15,23,42,0) 100%)', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'linear-gradient(45deg, rgba(59,130,246,0.15) 0%, rgba(15,23,42,0) 100%)', zIndex: 1 }}></div>
      </div>

      {/* Right Side: Login Form */}
      <div style={{ flex: '1 1 50%', minWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3rem 2.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Sign In</h2>
            <p style={{ color: '#64748b' }}>Enter your credentials to access your account</p>
          </div>

          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '1rem', backgroundColor: '#f8fafc', transition: 'all 0.2s' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '1rem', backgroundColor: '#f8fafc', transition: 'all 0.2s' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', padding: '0.875rem', backgroundColor: '#3b82f6', 
                color: 'white', borderRadius: '0.75rem', fontWeight: 600, fontSize: '1rem',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease', marginTop: '1rem', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
              }}
            >
              {loading ? <Loader className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
