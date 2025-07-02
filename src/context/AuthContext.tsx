
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User as AppUser } from '@/types';
import { updateActiveSession } from '@/app/profile/actions';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isPro: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setIsPro(false);
        setLoading(false);
        sessionStorage.removeItem('appSessionId'); // Clear session on logout
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect to manage and update the user's active session
  useEffect(() => {
    if (user) {
      let sessionId = sessionStorage.getItem('appSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('appSessionId', sessionId);
      }
      updateActiveSession(user.uid, sessionId);
    }
  }, [user]);

  useEffect(() => {
    if (user && db) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        const localSessionId = sessionStorage.getItem('appSessionId');

        if (doc.exists()) {
          const currentData = doc.data() as AppUser;
          
          // Session validation: If a session ID exists locally and in the DB, but they don't match, log out.
          if (localSessionId && currentData.activeSessionId && currentData.activeSessionId !== localSessionId) {
            auth?.signOut();
            toast({
              variant: 'destructive',
              title: 'Session Expired',
              description: 'Your account has been logged into from another device.',
            });
            return; // Stop further processing to prevent flicker
          }

          setUserData(currentData);

          const isAdmin = currentData.isAdmin || false;
          const status = currentData.razorpaySubscriptionStatus;
          const endDate = currentData.subscriptionEndDate?.toDate();

          const hasActiveSub = status === 'active' && endDate && new Date() < endDate;
          
          setIsPro(isAdmin || hasActiveSub);

        } else {
          setUserData(null);
          setIsPro(false);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setIsPro(false);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    }
  }, [user, toast]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isPro }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
