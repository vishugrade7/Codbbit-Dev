
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import FeatureGrid from '@/components/feature-grid';
import Testimonials from '@/components/testimonials';
import InteractivePlayground from '@/components/interactive-playground';
import CallToAction from '@/components/call-to-action';
import { motion } from 'framer-motion';

export default function Home() {
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };
  
  const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i:number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
      },
    }),
  };

  return (
    <main>
      <div className="w-full flex flex-col items-center justify-center bg-background p-4 py-16 md:py-24">
        <div className="container mx-auto flex flex-col items-center text-center gap-8 max-w-4xl">
          <div className="flex flex-col gap-6">
            <motion.h1
              custom={0}
              variants={heroVariants}
              initial="hidden"
              animate="visible"
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              Master Salesforce with Interactive Challenges in{' '}
              <span className="relative inline-block whitespace-nowrap text-primary before:absolute before:inset-0 before:z-0 before:bg-gradient-to-r before:from-cyan-400 before:to-blue-600 before:bg-clip-text before:text-transparent before:animate-bg-shine">
                <span className="relative z-10">Apex</span>
              </span>
            </motion.h1>
             <motion.p
              custom={1}
              variants={heroVariants}
              initial="hidden"
              animate="visible"
              className="text-lg text-muted-foreground max-w-2xl"
            >
              The ultimate platform for Salesforce developers to practice, compete, and improve their coding skills through real-world challenges.
            </motion.p>
          </div>

          <motion.div
            custom={2}
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-row items-center gap-4"
          >
            <Button
              asChild
            >
              <Link href="/apex-problems">Explore Problems</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </motion.div>
        </div>
      </div>
       <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <FeatureGrid />
      </motion.div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <Testimonials />
      </motion.div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <InteractivePlayground />
      </motion.div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
        <CallToAction />
      </motion.div>
    </main>
  );
}
