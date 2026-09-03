import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  isAdmin?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ isAdmin = false }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
      } else {
        setCurrentUserUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchNotifications = async (uid: string | null) => {
    try {
      const fetchUid = isAdmin ? 'admin' : uid;
      
      if (!fetchUid) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${backendUrl}/api/notifications/${fetchUid}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentUserUid);

    // Poll every 1 minute for new notifications
    const interval = setInterval(() => {
      fetchNotifications(currentUserUid);
    }, 60000);

    return () => clearInterval(interval);
  }, [isAdmin, currentUserUid]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      
      await fetch(`${backendUrl}/api/notifications/${id}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      fetchNotifications(currentUserUid); // revert on failure
    }
  };

  const markAllAsRead = async () => {
    try {
      const uid = isAdmin ? 'admin' : currentUserUid;
      if (!uid) return;

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      await fetch(`${backendUrl}/api/notifications/user/${uid}/readAll`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      fetchNotifications(currentUserUid);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-wrapper" style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Bell size={24} color="var(--text-secondary)" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '0.5rem',
          width: '320px',
          maxHeight: '400px',
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', margin: 0 }}>Loading...</p>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Bell size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                <p style={{ color: '#94a3b8', margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: notif.read ? 'white' : '#eff6ff',
                    cursor: notif.read ? 'default' : 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: notif.read ? 'transparent' : '#3b82f6',
                    marginTop: '0.4rem',
                    flexShrink: 0
                  }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: notif.read ? '#475569' : '#0f172a' }}>
                      {notif.title}
                    </h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(notif.createdAt).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
