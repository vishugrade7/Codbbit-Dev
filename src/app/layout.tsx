import type {Metadata} from 'next';
import { Poppins, PT_Sans } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/app-shell';

const poppins = Poppins({ 
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

const ptSans = PT_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '700']
})

export const metadata: Metadata = {
  title: 'Codbbit: Master Apex, LWC & Salesforce Development',
  description: 'Accelerate your career with our interactive courses and practice problems in Apex, LWC, and SOQL. The ultimate playground for Salesforce developers.',
  keywords: ['codbbit', 'apex coding', 'lwc learn', 'lwc course', 'learn salesforce', 'salesforce developer', 'soql practice', 'salesforce interview'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(poppins.variable, ptSans.variable, "bg-background font-body text-foreground select-none no-print")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
