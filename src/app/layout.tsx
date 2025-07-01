import type {Metadata} from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google'
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';
import Chatbot from '@/components/chatbot';

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
  title: 'Codbbit - Master Salesforce Development',
  description: 'The ultimate playground for Apex developers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, sourceCodePro.variable, "bg-background font-body text-foreground")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Chatbot />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
