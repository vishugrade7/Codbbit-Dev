import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discussions | Codbbit',
  description: 'Join the Codbbit community. Discuss Salesforce development, Apex problems, LWC, and share your knowledge with other developers.',
};

export default function Discussions() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold">Discussions</h1>
        <p className="text-muted-foreground mt-2">
          This feature is coming soon.
        </p>
      </main>
      <Footer />
    </div>
  );
}
