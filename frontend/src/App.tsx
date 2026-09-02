import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/admin/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminManagement from './pages/admin/AdminManagement';
import UserManagement from './pages/admin/UserManagement';
import Applications from './pages/admin/Applications';
import Certificates from './pages/admin/Certificates';
import ApprovedApplications from './pages/admin/ApprovedApplications';
import Orders from './pages/admin/Orders';
import Subscriptions from './pages/admin/Subscriptions';
import Settings from './pages/admin/Settings';
import UserLogin from './pages/auth/UserLogin';
import UserLayout from './layouts/UserLayout';
import UserDashboard from './pages/user/UserDashboard';
import ApplyCertificate from './pages/user/ApplyCertificate';
import Installed from './pages/user/Installed';
import Certified from './pages/user/Certified';
import Received from './pages/user/Received';
import UserSubscription from './pages/user/Subscription';

// Placeholder for other pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="glass-panel fade-in" style={{ padding: '2rem', borderRadius: '1rem', height: '100%' }}>
    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This module is currently under construction.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to user login */}
        <Route path="/" element={<Navigate to="/user/login" replace />} />
        
        {/* Admin Login Route */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* User Portal Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        
        {/* User Dashboard Routes inside Layout */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="certificates/apply" element={<ApplyCertificate />} />
          <Route path="certificates/installed" element={<Installed />} />
          <Route path="certificates/certified" element={<Certified />} />
          <Route path="received" element={<Received />} />
          <Route path="subscription" element={<UserSubscription />} />
        </Route>
        
        {/* Admin Dashboard Routes inside Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="management" element={<AdminManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="applications" element={<Applications />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="approved" element={<ApprovedApplications />} />
          <Route path="orders" element={<Orders />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
