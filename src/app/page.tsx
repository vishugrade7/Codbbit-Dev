
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import FeatureGrid from '@/components/feature-grid';
import Testimonials from '@/components/testimonials';
import InteractivePlayground from '@/components/interactive-playground';
import CallToAction from '@/components/call-to-action';
import { motion, type Variants } from 'framer-motion';
import ProfileTrackerShowcase from '@/components/profile-tracker-showcase';
import Image from 'next/image';
import { Rocket } from 'lucide-react';

const Section = ({ children }: { children: React.ReactNode }) => {
  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      {children}
    </motion.div>
  );
};

const HeroSection = () => {
  const heroVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  };

  return (
    <div className="w-full flex flex-col items-center justify-center bg-background p-4 py-24 md:py-32 home-hero-gradient">
      <div className="container mx-auto flex flex-col items-center text-center gap-8 max-w-4xl">
        
        <motion.div custom={0} variants={heroVariants} initial="hidden" animate="visible">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            Smarter Code, Less Effort <Rocket className="h-4 w-4"/>
          </div>
        </motion.div>

        <motion.div custom={1} variants={heroVariants} initial="hidden" animate="visible">
           <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Supercharge Your Codebase with an AI Coding Agent
            </h1>
        </motion.div>

        <motion.div custom={2} variants={heroVariants} initial="hidden" animate="visible">
            <p className="text-lg text-muted-foreground max-w-2xl">
                Your AI pair programmer write, debug, and refactor code faster with a fully integrated development agent.
            </p>
        </motion.div>

        <motion.div
          custom={3}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-row items-center gap-4"
        >
          <Button asChild size="lg">
            <Link href="/signup">Get started →</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Watch a demo</Link>
          </Button>
        </motion.div>
        
        <motion.div
          custom={4}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-3xl mt-8"
        >
          <Image
            src="https://placehold.co/1024x576.png"
            alt="AI coding agent interface"
            width={1024}
            height={576}
            data-ai-hint="dark editor user interface"
            className="rounded-lg border shadow-2xl shadow-primary/10"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <main>
      <HeroSection />
      <Section><FeatureGrid /></Section>
      <Section><Testimonials /></Section>
      <Section><InteractivePlayground /></Section>
      <Section><ProfileTrackerShowcase /></Section>
      <Section><CallToAction /></Section>
    </main>
  );
}
