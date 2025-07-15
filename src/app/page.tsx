
'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import FeatureGrid from "@/components/feature-grid";
import Testimonials from "@/components/testimonials";

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="w-full home-hero-gradient">
        <div className="container min-h-screen grid grid-cols-1 md:grid-cols-2 items-center gap-8 py-12 md:py-24">
            <div className="flex flex-col items-start text-left">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                    Start Your Coding Journey with Codbbit
                </h1>
                <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
                    Join millions mastering top languages, cracking real-world problems & winning coding contests.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button asChild size="lg">
                    <Link href="/apex-problems">
                        Level Up Your Skills now
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

      {/* Testimonials Section */}
      <Testimonials />
    </main>
  );
}
