
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import FeatureGrid from "@/components/feature-grid";
import Testimonials from "@/components/testimonials";
import InteractivePlayground from "@/components/interactive-playground";
import { ArrowRight, BookOpen, Code, FlaskConical, Play, Rocket } from "lucide-react";

export default function Home() {
  const features = [
    { name: 'Practice', description: 'Hands-on Problems', icon: Code },
    { name: 'Learn', description: 'Interactive Courses', icon: BookOpen },
    { name: 'Test', description: 'Instant Feedback', icon: FlaskConical },
    { name: 'Deploy', description: 'Real-world Scenarios', icon: Rocket },
  ];

  return (
    <main className="w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="w-full home-hero-gradient">
        <div className="container min-h-screen flex flex-col items-center justify-center text-center gap-8 py-12 md:py-24">
            <div className="relative w-full h-64 md:h-96">
                <Image
                    src="https://images.unsplash.com/photo-1555421689-d68471e189f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxN3x8c2FsZXNmb3JjZXxlbnwwfHx8fDE3NTI3MTc5OTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Illustration of a developer coding"
                    fill
                    className="object-contain"
                    data-ai-hint="developer coding"
                />
            </div>
            <div className="flex flex-col items-center text-center gap-6">
                 <div className="inline-block rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
                    A NEW WAY TO
                </div>
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                    MASTER APEX, LWC, AND SOQL
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
                  {features.map((feature, index) => (
                    <React.Fragment key={feature.name}>
                      <div className="flex flex-col items-center gap-1">
                        <feature.icon className="h-5 w-5 text-foreground" />
                        <span className="font-bold text-foreground">{feature.name}</span>
                        <span className="text-xs">{feature.description}</span>
                      </div>
                      {index < features.length - 1 && <ArrowRight className="h-4 w-4 hidden md:block" />}
                    </React.Fragment>
                  ))}
                </div>
                <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground md:text-xl">
                    Codbbit combines an interactive editor, a new stateful learning format, and a blazing-fast Salesforce integration. This end-to-end pipeline guarantees that what you build in our editor is exactly what ships in your orgs.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <Button asChild size="lg">
                      <Link href="/signup">
                        Get Started
                      </Link>
                    </Button>
                     <Button asChild size="lg" variant="outline">
                      <Link href="/apex-problems">
                        <Play className="mr-2 h-4 w-4" />
                        Explore Problems
                      </Link>
                    </Button>
                </div>
            </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <FeatureGrid />

      {/* Interactive Playground Section */}
      <InteractivePlayground />

      {/* Testimonials Section */}
      <Testimonials />
    </main>
  );
}
