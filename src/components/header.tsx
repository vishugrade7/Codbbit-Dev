"use client";

import Link from "next/link";
import { CodeXml, Flame, BarChart, Rocket, Trophy, Database, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <CodeXml className="h-6 w-6" />
            <span className="text-lg font-bold">Codbbit</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="#" className="transition-colors hover:text-foreground">
              Apex Problems
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              Courses
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              Leaderboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Flame className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">0</span>
           <Avatar className="h-8 w-8">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>VG</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
