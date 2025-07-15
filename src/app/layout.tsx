
import type {Metadata} from 'next';
import { Source_Code_Pro } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/app-shell';
import DynamicFavicon from '@/components/dynamic-favicon';
import Script from 'next/script';

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
  weight: ['400'],
})

export const metadata: Metadata = {
  title: {
    default: 'Codbbit: Master Salesforce with Apex, LWC & SOQL',
    template: '%s | Codbbit',
  },
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
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TDJD2HMV');`}
        </Script>
      </head>
      <body className={cn(sourceCodePro.variable, "font-body text-foreground select-none no-print")}>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TDJD2HMV"
        height="0" width="0" style={{display:"none",visibility:"hidden"}}></iframe></noscript>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DynamicFavicon />
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
