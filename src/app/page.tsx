
'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import FeatureGrid from "@/components/feature-grid";
import Testimonials from "@/components/testimonials";
import InteractivePlayground from "@/components/interactive-playground";

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="w-full home-hero-gradient">
        <div className="container min-h-screen grid grid-cols-1 md:grid-cols-2 items-center gap-8 py-12 md:py-24">
            <div className="flex flex-col items-start text-left">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                    Master Salesforce with Apex, LWC & SOQL
                </h1>
                <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
                    Accelerate your career with our interactive courses and hands-on practice problems. The ultimate playground for Salesforce developers.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button asChild size="lg">
                    <Link href="/apex-problems">
                        Explore Practice Problems
                    </Link>
                    </Button>
                </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
                <Image 
                    src="https://placehold.co/500x500.png" 
                    alt="Developer coding on a laptop" 
                    width={500}
                    height={500}
                    data-ai-hint="developer illustration"
                    className="object-contain"
                />
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
