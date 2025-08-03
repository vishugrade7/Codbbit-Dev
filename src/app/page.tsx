
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import FeatureGrid from '@/components/feature-grid';
import Testimonials from '@/components/testimonials';
import InteractivePlayground from '@/components/interactive-playground';
import CallToAction from '@/components/call-to-action';
import { motion, type Variants } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

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
    <div className="w-full flex items-center justify-center bg-background p-4 py-24 md:py-32 home-hero-gradient">
      <div className="container mx-auto flex flex-col items-center text-center gap-8">
        
        <motion.div
          custom={0}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-6"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            💻 Codbbit – Build Your Code Habit
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Tired of Theory? Practice Real Coding Every Day.
          </p>
        </motion.div>

        <motion.div
          custom={1}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-4"
        >
          <Button asChild size="lg">
            <Link href="/signup">Start with Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">Get Started</Link>
          </Button>
        </motion.div>

        <motion.div
          custom={2}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-5xl mt-8"
        >
          <Image
            src="https://images.unsplash.com/photo-1754220763477-97453f9e3d99?q=80&w=1559&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Dashboard preview"
            width={1200}
            height={600}
            className="rounded-lg border-2 border-primary/10 shadow-2xl shadow-primary/10"
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
      <Section><CallToAction /></Section>
    </main>
  );
}
