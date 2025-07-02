import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Codbbit',
};

export default function Terms() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="mt-4 text-muted-foreground">
                Last Updated: July 2024
            </p>
            <div className="mt-8 space-y-6 text-muted-foreground">
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using Codbbit (the "Service"), you accept and agree to be bound by the terms and provision of this agreement.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">2. Service Description</h2>
                    <p>
                        Codbbit provides a platform for developers to practice and improve their Salesforce development skills, including SOQL, Apex, and Lightning Web Components. The Service is provided "as is" without any warranties.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">3. User Conduct</h2>
                    <p>
                        You are responsible for all your activity in connection with the Service. Any fraudulent, abusive, or otherwise illegal activity may be grounds for termination of your right to access or use the Service.
                    </p>
                </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">4. Intellectual Property</h2>
                    <p>
                        The site and its original content, features, and functionality are owned by Codbbit and are protected by international copyright, trademark, and other intellectual property laws.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">5. Changes to Terms</h2>
                    <p>
                        We reserve the right to modify these terms from time to time at our sole discretion. Therefore, you should review this page periodically. Your continued use of the Website or our service after any such change constitutes your acceptance of the new Terms.
                    </p>
                </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
