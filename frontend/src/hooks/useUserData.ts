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
      const appsRef = collection(db, 'applications');
      const q = query(appsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by createdAt descending
      return allApps.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    enabled: !!userId,
  });
}

/**
 * TanStack React Query for User Orders (Backend API)
 * Caches orders using queryKey: ['orders', userId]
 */
export function useUserOrders(userId?: string) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${backendUrl}/api/orders/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user orders');
      return await res.json();
    },
    enabled: !!userId,
  });
}

/**
 * TanStack React Query for User Subscriptions (Backend API)
 * Caches subscriptions using queryKey: ['subscriptions', userId]
 */
export function useUserSubscriptions(userId?: string) {
  return useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${backendUrl}/api/subscriptions/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user subscriptions');
      return await res.json();
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
      const res = await fetch(`${backendUrl}/api/users/${userId}/quota`);
      if (!res.ok) throw new Error('Failed to fetch user quota');
      return await res.json();
    },
    enabled: !!userId,
  });
}
