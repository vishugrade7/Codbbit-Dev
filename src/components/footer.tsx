import Link from "next/link";
import { CodeXml } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full py-8 border-t bg-card">
      <div className="container grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2">
            <CodeXml className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg font-semibold">Codbbit</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            The ultimate playground for Apex developers.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold">Platform</h4>
          <Link href="/courses" className="text-sm text-muted-foreground hover:text-primary">Courses</Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-primary">Leaderboard</Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Apex Problems</Link>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold">Community</h4>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Discussions</Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">GitHub</Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Twitter</Link>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold">Company</h4>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">About</Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
        </div>
      </div>
      <div className="container mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Codbbit. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
