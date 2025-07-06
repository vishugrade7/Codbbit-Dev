
import type {Metadata} from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/app-shell';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
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
       <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={cn(inter.variable, sourceCodePro.variable, "font-body text-foreground select-none no-print")}>
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
