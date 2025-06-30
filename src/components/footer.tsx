import Link from "next/link";
import { CodeXml } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t bg-card/50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <CodeXml className="h-6 w-6" />
              <span className="text-lg font-bold">Codbbit</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The ultimate playground for Apex developers.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Platform</h3>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Courses</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Leaderboard</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Apex Problems</Link>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Community</h3>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Discussions</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">GitHub</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Twitter</Link>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Company</h3>
            <Link href="#" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Contact</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Codbbit. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
