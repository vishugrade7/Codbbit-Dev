import { Button } from "@/components/ui/button";
import { Mountain } from "lucide-react";

export default function Header() {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg font-semibold">Showcase Canvas</span>
        </div>
        <nav>
          <Button onClick={scrollToContact}>Contact</Button>
        </nav>
      </div>
    </header>
  );
}
