
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Rocket, BarChart, Database, Code, Trophy, ArrowRight } from "lucide-react";
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
            <div className="relative h-[600px] overflow-hidden">
              {/* Background */}
              <div className="absolute inset-0">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/showcase-canvas-rx61p.firebasestorage.app/o/cards%2Floop.png?alt=media&token=67c068c3-57e5-4ca8-a698-7ac895eebcde"
                  alt="Codbbit Platform Screenshot"
                  fill
                  className="object-cover rounded-xl"
                  data-ai-hint="development workspace"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-primary/10 to-transparent rounded-xl" />
              </div>

              {/* Foreground Chat */}
              <div className="absolute -bottom-[5%] -left-[10%] w-[45%] rounded-lg shadow-2xl ring-1 ring-border overflow-hidden transform-gpu transition-transform hover:scale-105">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/showcase-canvas-rx61p.firebasestorage.app/o/cards%2Frest.png?alt=media&token=2300655a-d354-4b79-8660-0de21d2a82a4"
                  alt="Codbbit AI chat"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  data-ai-hint="ai chat"
                />
              </div>
              
              {/* Foreground Mobile */}
              <div className="absolute top-[10%] -right-[5%] w-[30%] rounded-xl shadow-2xl ring-1 ring-border overflow-hidden transform-gpu transition-transform hover:scale-105">
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
          <div className="grid sm:grid-cols-3 border border-border rounded-lg overflow-hidden">
            {/* Card 1: SOQL Mastery */}
            <div className="flex flex-col justify-between p-8 h-[24rem] bg-card">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm text-muted-foreground">SOQL Mastery</h3>
                <p className="text-xl font-medium mt-2">
                  Practice complex queries with real-time validation and feedback.
                </p>
              </div>
            </div>

            {/* Card 2: Apex Development */}
            <div className="flex flex-col justify-between p-8 border-l border-border h-[24rem] bg-card">
              <Code className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm text-muted-foreground">Apex Development</h3>
                <p className="text-xl font-medium mt-2">
                  Write and execute Apex code with instant testing on live Salesforce orgs.
                </p>
              </div>
            </div>

            {/* Card 3: Competitive Learning */}
            <div className="relative flex flex-col justify-between p-8 border-l border-border h-[24rem] group bg-card overflow-hidden">
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
