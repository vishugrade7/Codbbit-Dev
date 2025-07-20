
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { Skeleton } from './ui/skeleton';

export default function SplashScreen() {
  const { brandingSettings, loadingBranding, isPro, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  const logoSrc = useMemo(() => {
    if (!brandingSettings) return "/favicon.ico";
    const isDark = theme === 'dark';
    if (isPro) {
      if (isDark) {
        return brandingSettings.logo_pro_dark || brandingSettings.logo_pro_light || brandingSettings.logo_dark || brandingSettings.logo_light || '/favicon.ico';
      }
      return brandingSettings.logo_pro_light || brandingSettings.logo_light || '/favicon.ico';
    }
    
    if (isDark) {
      return brandingSettings.logo_dark || brandingSettings.logo_light || '/favicon.ico';
    }
    return brandingSettings.logo_light || '/favicon.ico';
  }, [brandingSettings, isPro, theme]);

  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (splashShown === 'true' || authLoading) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('splashShown', 'true');
    }, 2000); // Minimum splash time

    return () => clearTimeout(timer);
  }, [authLoading]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15, // Lower damping makes it more bouncy
              delay: 0.2,
            }}
          >
            {loadingBranding ? (
              <Skeleton className="h-24 w-24 rounded-2xl" />
            ) : (
              <Image src={logoSrc} alt="Codbbit logo" width={96} height={96} priority />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
