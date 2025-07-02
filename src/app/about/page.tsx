import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Codbbit',
  description: 'Learn about Codbbit\'s mission to help developers master Salesforce through hands-on practice problems and expert-led courses on Apex and LWC.',
};

export default function About() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold">About Codbbit</h1>
        <p className="text-muted-foreground mt-2">
          Learn more about our mission to help developers master Salesforce.
        </p>
      </main>
      <Footer />
    </div>
  );
}
