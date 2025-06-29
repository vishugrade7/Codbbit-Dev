"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

type AuthContextType = {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // This effect handles listening to auth state changes from Firebase.
  // It is only responsible for setting the `user` object or null.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setLoading(true); // Whenever auth state changes, enter loading state.
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // This effect listens for changes to the `user` object.
  // If a user exists, it fetches their profile data from Firestore.
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData({ id: doc.id, ...doc.data() } as User);
        } else {
          setUserData(null);
        }
        setLoading(false); // We have our answer, stop loading.
      }, (error) => {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setLoading(false); // Also stop loading on error.
      });
      return () => unsubscribe();
    }
  }, [user]);

  const isAdmin = userData?.isAdmin ?? false;

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
