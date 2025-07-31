
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center text-center p-4">
      <div className="space-y-4">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          404 - Page Not Found
        </h1>
        <p className="text-base text-muted-foreground">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </main>
  );
}
