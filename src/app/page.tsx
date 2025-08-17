import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


export default function Home() {
  return (
    <main>
      <section className="w-full py-20 md:py-32 lg:py-40">
        <div className="container px-4 md:px-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="flex -space-x-2 overflow-hidden">
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 1" data-ai-hint="woman face" />
                    <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 2" data-ai-hint="man face" />
                    <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 3" data-ai-hint="woman portrait" />
                    <AvatarFallback>U3</AvatarFallback>
                </Avatar>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Trusted by 503+ developers</p>
          </div>
          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-primary font-semibold">Codbbit – Build Your Code Habit</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              Practice <span className="text-primary">{'{Apex}'}</span> Coding Problems
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Join thousands of developers building skills, cracking interviews, and landing internships. Kickstart your coding journey—no boring lectures, just real practice!
            </p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/apex-problems">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/leaderboard">
                View Leaderboard <KeyRound className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="container px-4 md:px-6">
        <div className="relative aspect-[16/9] md:aspect-[2.4/1] overflow-hidden rounded-t-xl border">
          <Image
            src="https://placehold.co/1200x500.png"
            alt="Hero Image"
            fill
            className="object-cover"
            data-ai-hint="person teaching"
          />
        </div>
      </section>
    </main>
  );
}
