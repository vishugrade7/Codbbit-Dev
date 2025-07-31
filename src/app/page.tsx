
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
        delay: i * 0.15,
        duration: 0.5,
      },
    }),
  };

  return (
    <div className="w-full flex flex-col items-center justify-center bg-background p-4 pt-16 md:pt-24 home-hero-gradient">
      <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center max-w-6xl">
        <div className="flex flex-col items-start text-left gap-6">
            <motion.div
            custom={0}
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
            >
            <h1
                className="text-5xl md:text-7xl font-bold tracking-tight"
            >
                Master Salesforce with Interactive Challenges
            </h1>
            <p
                className="text-lg text-muted-foreground max-w-xl"
            >
                The ultimate platform for Salesforce developers to practice, compete, and improve their coding skills through real-world challenges.
            </p>
            </motion.div>

            <motion.div
            custom={1}
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-row items-center gap-4"
            >
            <Button asChild size="lg">
                <Link href="/apex-problems">Explore Problems</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
                <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            </motion.div>
        </div>
        
        <motion.div
          custom={2}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center"
        >
          <Image
            src="https://placehold.co/800x450.png"
            alt="Hero image showing the Codbbit platform"
            width={800}
            height={450}
            data-ai-hint="platform user interface"
            className="rounded-lg border shadow-lg"
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
