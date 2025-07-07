'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Rocket, BarChart, Database, Code, Trophy, ArrowRight, Layers, FileCode } from "lucide-react";
import Testimonials from "@/components/testimonials";
import { cn } from "@/lib/utils";


const FloatingCard = ({ className, children, delay }: { className?: string, children: React.ReactNode, delay?: string }) => (
    <Card 
        className={cn("absolute p-3 rounded-lg shadow-xl backdrop-blur-sm bg-black/20 border-white/10 animate-float text-white", className)} 
        style={{ animationDelay: delay, animationDuration: '8s' }}
    >
        {children}
    </Card>
);

export default function Home() {
  return (
    <>
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 animate-gradient-bg" style={{backgroundSize: '200% 200%'}}/>
        <div className="absolute inset-0 opacity-10 dark:opacity-5 [background-image:radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/80 via-transparent to-transparent"/>
        
        <div className="container relative z-10 px-4 md:px-6 py-24 md:py-32 lg:py-40">
            <div className="max-w-3xl mx-auto space-y-4 text-center">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  Master Salesforce Development
                </h1>
                <p className="text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
                </p>
            </div>
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

            <div className="relative mt-20 max-w-5xl mx-auto h-[400px]">
                {/* Central Element */}
                <Card className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-4 shadow-2xl bg-black/30 backdrop-blur-md border-white/10 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-3 w-3 rounded-full bg-red-500"></span>
                        <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                        <span className="h-3 w-3 rounded-full bg-green-500"></span>
                    </div>
                    <pre className="text-sm text-green-300 font-code overflow-x-auto">
                        <code>
                            <span className="text-purple-400">@isTest</span><br/>
                            <span className="text-blue-400">private class</span> <span className="text-teal-300">AccountTriggerTest</span> &#123;<br/>
                            {'  '}<span className="text-purple-400">@isTest</span><br/>
                            {'  '}<span className="text-blue-400">static void</span> <span className="text-yellow-300">testAccountUpdate</span>() &#123;<br/>
                            {'    '}<span className="text-gray-400">// Your test logic here...</span><br/>
                            {'  '}&#125;<br/>
                            &#125;
                        </code>
                    </pre>
                </Card>

                {/* Floating Elements */}
                <FloatingCard className="top-10 left-5 w-48" delay="0s">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-sky-300"/>
                        <h4 className="font-semibold text-white">SOQL Query</h4>
                    </div>
                    <p className="text-xs mt-1 text-sky-200/80">SELECT Name FROM Account</p>
                </FloatingCard>

                 <FloatingCard className="bottom-5 right-0 w-56" delay="0.5s">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-indigo-300"/>
                        <h4 className="font-semibold text-white">LWC Component</h4>
                    </div>
                    <p className="text-xs mt-1 text-indigo-200/80">&lt;lightning-card title="Hello"/&gt;</p>
                </FloatingCard>

                <FloatingCard className="top-0 right-10 w-40" delay="1s">
                    <div className="flex items-center gap-2">
                        <FileCode className="h-5 w-5 text-rose-300"/>
                        <h4 className="font-semibold text-white">Apex Class</h4>
                    </div>
                </FloatingCard>

                <FloatingCard className="bottom-16 left-0 w-32" delay="1.5s">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-300"/>
                        <h4 className="font-semibold text-white">+10 Points</h4>
                    </div>
                </FloatingCard>
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
              <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/20 via-card to-card" />
              
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
