import { Button } from "@/components/ui/button";
import { CodeXml } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <CodeXml className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg font-semibold">Codbbit</span>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="outline" size="sm">Sign In</Button>
          <Button size="sm">Sign Up</Button>
        </nav>
      </div>
    </header>
  );
}
