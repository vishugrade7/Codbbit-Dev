
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Rocket, BarChart, Database, Code, Trophy } from "lucide-react";
import Testimonials from "@/components/testimonials";
import Image from "next/image";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Make it smaller as you scroll down, clamped between 0.8 and 1
  const scale = Math.max(0.8, 1 - scrollY * 0.0005);

  return (
    <>
      <section className="w-full py-20 md:py-32 lg:py-40">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
              Master Salesforce Development
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
            </p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
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

          <div
            className="mt-16 max-w-5xl mx-auto transition-transform duration-100 ease-out"
            style={{ transform: `scale(${scale})` }}
          >
            <div className="relative h-[600px]">
              {/* Background */}
              <div className="absolute inset-0">
                <Image
                  src="https://placehold.co/1200x800.png"
                  alt="Codbbit Platform Screenshot"
                  fill
                  className="object-cover rounded-xl"
                  data-ai-hint="development workspace"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-primary/10 to-transparent rounded-xl" />
              </div>

              {/* Foreground Chat */}
              <div className="absolute bottom-[10%] left-[-5%] w-[45%] rounded-lg shadow-2xl ring-1 ring-border overflow-hidden transform-gpu transition-transform hover:scale-105">
                <Image
                  src="https://placehold.co/600x400.png"
                  alt="Codbbit AI chat"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  data-ai-hint="ai chat"
                />
              </div>
              
              {/* Foreground Mobile */}
              <div className="absolute top-[10%] right-[5%] w-[30%] rounded-xl shadow-2xl ring-1 ring-border overflow-hidden transform-gpu transition-transform hover:scale-105">
                <Image
                  src="https://placehold.co/400x800.png"
                  alt="Codbbit mobile preview"
                  width={400}
                  height={800}
                  className="w-full h-auto"
                  data-ai-hint="mobile app"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-card/50">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card">
              <CardHeader className="items-center text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>SOQL Mastery</CardTitle>
                <CardDescription>
                  Practice complex queries with real-time validation and feedback.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card">
              <CardHeader className="items-center text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Code className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Apex Development</CardTitle>
                <CardDescription>
                  Write and execute Apex code with instant testing on live Salesforce orgs.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-card">
              <CardHeader className="items-center text-center">
                 <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Competitive Learning</CardTitle>
                <CardDescription>
                  Compete with developers worldwide and track your progress.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <Testimonials />
    </>
  );
}
