
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center container py-8">
      <SearchX className="h-24 w-24 text-primary mb-4" />
      <h1 className="text-6xl font-bold font-headline text-primary">404</h1>
      <h2 className="text-3xl font-semibold mt-4">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        Oops! The page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Go Back to Homepage</Link>
      </Button>
    </main>
  );
}
