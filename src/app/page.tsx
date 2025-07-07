'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Rocket, BarChart, Database, Code, Trophy, ArrowRight, Layers, FileCode, BookOpen } from "lucide-react";
import Testimonials from "@/components/testimonials";
import { cn } from "@/lib/utils";


const FloatingCard = ({ positionClass, children }: { positionClass: string, children: React.ReactNode }) => (
    <div className={cn("absolute", positionClass)}>
        <div className="animate-counter-revolve h-full w-full">
            <Card className="p-3 rounded-lg shadow-xl bg-background/60 backdrop-blur-xl border-border/20 text-foreground h-full">
                {children}
            </Card>
        </div>
    </div>
);

export default function Home() {
  return (
    <>
      <section className="relative w-full overflow-hidden">
        <div className="container relative z-10 px-4 md:px-6 py-24 md:py-32 lg:py-40">
          <div className="relative max-w-4xl mx-auto h-[300px]">
            {/* Text in the center */}
            <div className="relative z-10 space-y-4 text-center max-w-3xl mx-auto flex flex-col items-center justify-center h-full">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Master Salesforce Development
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <Button asChild size="lg">
                    <Link href="/apex-problems">
                      <Rocket className="mr-2 h-5 w-5" />
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/leaderboard">
                      <BarChart className="mr-2 h-5 w-5" />
                      View Leaderboard
                    </Link>
                  </Button>
              </div>
            </div>
            
            {/* Revolving cards around the text */}
            <div className="absolute inset-0 animate-revolve hidden md:block" style={{ transformStyle: 'preserve-3d' }}>
                <FloatingCard positionClass="top-0 -left-16 w-48 h-auto">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-sky-500 dark:text-sky-400"/>
                        <h4 className="font-semibold">SOQL Query</h4>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">SELECT Name FROM Account</p>
                </FloatingCard>

                <FloatingCard positionClass="bottom-0 -right-16 w-56 h-auto">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-indigo-500 dark:text-indigo-400"/>
                        <h4 className="font-semibold">LWC Component</h4>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">&lt;lightning-card title="Hello"/&gt;</p>
                </FloatingCard>

                <FloatingCard positionClass="top-10 -right-24 w-40 h-auto">
                    <div className="flex items-center gap-2">
                        <FileCode className="h-5 w-5 text-rose-500 dark:text-rose-400"/>
                        <h4 className="font-semibold">Apex Class</h4>
                    </div>
                </FloatingCard>

                <FloatingCard positionClass="bottom-10 -left-24 w-32 h-auto">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500 dark:text-amber-400"/>
                        <h4 className="font-semibold">+10 Points</h4>
                    </div>
                </FloatingCard>

                <FloatingCard positionClass="bottom-20 -right-40 w-52 h-auto">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-purple-500 dark:text-purple-400"/>
                        <h4 className="font-semibold">Data Security</h4>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">Secure data with Shield</p>
                </FloatingCard>

                <FloatingCard positionClass="top-1/3 -left-40 w-48 h-auto">
                    <div className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-teal-500 dark:text-teal-400"/>
                        <h4 className="font-semibold">Code Analysis</h4>
                    </div>
                </FloatingCard>

                <FloatingCard positionClass="top-20 left-1/2 -translate-x-1/2 w-56 h-auto">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-green-500/20">
                            <BookOpen className="h-5 w-5 text-green-500 dark:text-green-400"/>
                        </div>
                        <h4 className="font-semibold">Interactive Courses</h4>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">Learn by doing</p>
                </FloatingCard>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-card/50">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-lg divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
            {/* Card 1: SOQL Mastery */}
            <div className="flex flex-col justify-between p-8 min-h-[18rem] bg-card">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm text-muted-foreground">SOQL Mastery</h3>
                <p className="text-xl font-medium mt-2">
                  Practice complex queries with real-time validation and feedback.
                </p>
              </div>
            </div>

            {/* Card 2: Apex Development */}
            <div className="flex flex-col justify-between p-8 min-h-[18rem] bg-card">
              <Code className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm text-muted-foreground">Apex Development</h3>
                <p className="text-xl font-medium mt-2">
                  Write and execute Apex code with instant testing on live Salesforce orgs.
                </p>
              </div>
            </div>

            {/* Card 3: Competitive Learning */}
            <div className="relative flex flex-col justify-between p-8 min-h-[18rem] group bg-card overflow-hidden">
              <div className="relative z-10">
                  <Trophy className="h-8 w-8 text-primary transition-colors duration-500" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm text-muted-foreground transition-colors duration-500 group-hover:text-foreground/80">Competitive Learning</h3>
                <p className="text-xl font-medium mt-2 transition-colors duration-500 group-hover:text-foreground">
                  Compete with developers worldwide and track your progress.
                </p>
                 <Link href="/leaderboard" className="inline-flex items-center text-sm font-medium text-primary mt-4 transition-colors duration-500 group-hover:text-primary group-hover:underline">
                    View Leaderboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />
    </>
  );
}
