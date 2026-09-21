import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Custom hook to track Firebase Auth state
 */
export function useAuthUser() {
  const [user, setUser] = useState<any>(auth.currentUser);
  const [loading, setLoading] = useState<boolean>(!auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * TanStack React Query for User Applications (Firestore)
 * Caches application data in RAM using queryKey: ['applications', userId]
 */
export function useUserApplications(userId?: string) {
  return useQuery({
    queryKey: ['applications', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // 1. Try Backend API first
      try {
        const res = await fetch(`${backendUrl}/api/applications?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const userApps = data.filter((app: any) => app && app.userId === userId);
            userApps.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return userApps;
          }
        }
      } catch (err) {
        console.warn('Backend user applications fetch failed, using Firestore fallback', err);
      }

      // 2. Client-side Firestore Fallback
      if (db) {
        const appsRef = collection(db, 'applications');
        const q = query(appsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const userApps = allApps.filter((app: any) => app && app.userId === userId);
        return userApps.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      return [];
    },
    enabled: !!userId,
  });
}

/**
 * TanStack React Query for User Orders (Backend API + Firestore Web SDK Fallback)
 * Caches orders using queryKey: ['orders', userId]
 */
export function useUserOrders(userId?: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const res = await fetch(`${backendUrl}/api/orders/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch (err) {
        console.warn('Backend user orders fetch failed, using Firestore fallback', err);
      }

      if (db) {
        const ordersRef = collection(db, 'orders');
        const q1 = query(ordersRef, where('userId', '==', userId));
        const snapshot1 = await getDocs(q1);
        let list = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const currentUserEmail = auth.currentUser?.email;
        if (list.length === 0 && currentUserEmail) {
          const q2 = query(ordersRef, where('userEmail', '==', currentUserEmail));
          const snapshot2 = await getDocs(q2);
          const emailList = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list = emailList;
        }

        return list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      return [];
    },
    enabled: !!userId,
  });
}

/**
 * TanStack React Query for User Subscriptions (Backend API + Firestore Web SDK Fallback)
 * Caches subscriptions using queryKey: ['subscriptions', userId]
 */
export function useUserSubscriptions(userId?: string) {
  return useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const res = await fetch(`${backendUrl}/api/subscriptions/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch (err) {
        console.warn('Backend user subscriptions fetch failed, using Firestore fallback', err);
      }

      if (db) {
        const subsRef = collection(db, 'subscriptions');
        const q1 = query(subsRef, where('userId', '==', userId));
        const snapshot1 = await getDocs(q1);
        let list = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const currentUserEmail = auth.currentUser?.email;
        if (list.length === 0 && currentUserEmail) {
          const q2 = query(subsRef, where('userEmail', '==', currentUserEmail));
          const snapshot2 = await getDocs(q2);
          const emailList = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list = emailList;
        }

        return list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      return [];
    },
    enabled: !!userId,
  });
}

/**
 * TanStack React Query for User Quota (Backend API)
 * Caches quota stats using queryKey: ['quota', userId]
 */
export function useUserQuota(userId?: string) {
  return useQuery({
    queryKey: ['quota', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const res = await fetch(`${backendUrl}/api/users/${userId}/quota`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend quota fetch failed', err);
      }
      return null;
    },
    enabled: !!userId,
  });
}
