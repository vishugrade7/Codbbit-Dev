"use client";

import Link from "next/link";
import { CodeXml } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
                <CodeXml className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">New App</span>
            </Link>
        </div>
      </div>
    </header>
  );
}
