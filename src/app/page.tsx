
'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FeatureGrid from "@/components/feature-grid";
import Testimonials from "@/components/testimonials";

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
            Achieve <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">mastery</span>
            <br />
            through challenge
            </h1>
            <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Improve your development skills by training with your peers on code kata that continuously challenge and push your coding practice.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-blue-800 text-primary-foreground hover:opacity-90 transition-opacity">
                <Link href="/apex-problems">
                    Get Started
                </Link>
                </Button>
            </div>
        </div>

        {/* Bottom Decorative Card */}
        <aside className="absolute bottom-0 z-0 h-1/3 w-full max-w-7xl rounded-t-3xl bg-card/5 [mask-image:linear-gradient(to_top,white,transparent)]" />
      </section>

      {/* Feature Grid Section */}
      <FeatureGrid />

      {/* Testimonials Section */}
      <Testimonials />
    </main>
  );
}
