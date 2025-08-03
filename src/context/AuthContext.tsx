
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User as AppUser, BrandingSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { clearCache } from '@/lib/cache';
import { getCachedImage, cacheImage } from '@/lib/image-cache';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
  isPro: boolean;
  brandingSettings: BrandingSettings | null;
  loadingBranding: boolean;
  promptForSfdcAuth: boolean;
  setPromptForSfdcAuth: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isPro: false,
  brandingSettings: null,
  loadingBranding: true,
  promptForSfdcAuth: false,
  setPromptForSfdcAuth: () => {},
});

const processCachedImages = async <T extends {}>(data: T, fields: (keyof T)[]): Promise<T> => {
    if (!data) return data;
    const processedData = { ...data };
    for (const field of fields) {
        const url = processedData[field] as string | undefined;
        if (url) {
            const cachedUrl = await getCachedImage(url);
            if (cachedUrl) {
                (processedData as any)[field] = cachedUrl;
            }
        }
    }
    return processedData;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(true);

  const [promptForSfdcAuth, setPromptForSfdcAuth] = useState(false);

  const isPro = useMemo(() => {
    if (!userData) return false;
    const isAdmin = userData.isAdmin || false;
    const status = userData.razorpaySubscriptionStatus;
    const endDate = userData.subscriptionEndDate?.toDate();
    const hasActiveSub = status === 'active' && endDate && new Date() < endDate;
    return isAdmin || hasActiveSub;
  }, [userData]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        sessionStorage.removeItem('appSessionId'); // Clear session on logout
        await clearCache('apexProblemsData'); // Clear problems cache on logout
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db) {
        setLoadingBranding(false);
        return;
    }
    const brandingDocRef = doc(db, 'settings', 'branding');
    const unsubscribeBranding = onSnapshot(brandingDocRef, async (doc) => {
        if (doc.exists()) {
            const settings = doc.data() as BrandingSettings;
            const cachedSettings = await processCachedImages(settings, ['logo_light', 'logo_dark', 'logo_pro_light', 'logo_pro_dark', 'favicon']);
            setBrandingSettings(cachedSettings);
        } else {
            setBrandingSettings(null);
        }
        setLoadingBranding(false);
    }, (error) => {
        console.error("Error fetching branding settings:", error);
        setLoadingBranding(false);
    });
    
    return () => unsubscribeBranding();
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    if (user && db) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribeSnapshot = onSnapshot(userDocRef, async (doc) => {
        const localSessionId = sessionStorage.getItem('appSessionId');
        const isLoggingIn = sessionStorage.getItem('isLoggingIn') === 'true';

        if (doc.exists()) {
          const currentData = doc.data() as AppUser;
          
          if (!isLoggingIn && localSessionId && currentData.activeSessionId && currentData.activeSessionId !== localSessionId) {
            auth?.signOut();
            toast({
              variant: 'destructive',
              title: 'Session Expired',
              description: 'Your account has been logged into from another device.',
            });
            return;
          }

          if (isLoggingIn && localSessionId && currentData.activeSessionId === localSessionId) {
              sessionStorage.removeItem('isLoggingIn');
          }
          
          const cachedUserData = await processCachedImages(currentData, ['avatarUrl', 'companyLogoUrl']);
          setUserData(cachedUserData);
          
          // Check if we should prompt for Salesforce auth
          if (isLoggingIn && !cachedUserData.sfdcAuth?.connected) {
              setPromptForSfdcAuth(true);
          }

        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setLoading(false);
      });
    } else {
        setLoading(false);
    }
    return () => unsubscribeSnapshot();
  }, [user, toast]);

  const value = useMemo(() => ({ user, userData, loading, isPro, brandingSettings, loadingBranding, promptForSfdcAuth, setPromptForSfdcAuth }), [user, userData, loading, isPro, brandingSettings, loadingBranding, promptForSfdcAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
