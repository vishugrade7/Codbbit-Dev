
"use client";

import type { Metadata } from 'next';
import SettingsContent from '@/components/settings-content';


export default function Settings() {
  
  return (
    <>
      <title>Settings</title>
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
            <SettingsContent />
        </div>
      </main>
    </>
  );
}
