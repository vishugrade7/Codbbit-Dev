import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discussions | Codbbit',
  description: 'Join the Codbbit community. Discuss Salesforce development, Apex problems, LWC, and share your knowledge with other developers.',
};

export default function Discussions() {
  return (
    <main className="flex-1 container py-8">
      <h1 className="text-4xl font-bold">Discussions</h1>
      <p className="text-muted-foreground mt-2">
        This feature is coming soon.
      </p>
    </main>
  );
}
