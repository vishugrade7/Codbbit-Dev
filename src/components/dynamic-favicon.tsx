
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DynamicFavicon() {
  const { brandingSettings } = useAuth();

  useEffect(() => {
    const faviconUrl = brandingSettings?.favicon;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [brandingSettings]);

  return null; // This component doesn't render anything
}
