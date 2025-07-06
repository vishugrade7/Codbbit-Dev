import { Wrench } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Under Maintenance | Codbbit',
};

export default function MaintenancePage() {
  return (
    <main className="flex-1 container flex items-center justify-center text-center">
      <div>
        <Wrench className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-4xl font-bold mt-4">Under Maintenance</h1>
        <p className="text-muted-foreground mt-2">
          Codbbit is currently undergoing scheduled maintenance. We'll be back shortly.
        </p>
      </div>
    </main>
  );
}
