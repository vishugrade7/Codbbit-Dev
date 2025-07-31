
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
      <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col items-start text-left gap-6">
            <motion.div custom={0} variants={heroVariants} initial="hidden" animate="visible">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    Showcase Canvas
                </div>
            </motion.div>

            <motion.div custom={1} variants={heroVariants} initial="hidden" animate="visible" className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  Crafting Digital Experiences, One Pixel at a Time
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Welcome to my creative space. I design and build beautiful, intuitive, and high-performing web applications. Explore my work and see how I can bring your vision to life.
                </p>
            </motion.div>

            <motion.div
                custom={2}
                variants={heroVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-4"
            >
                <Button asChild size="lg">
                    <Link href="#portfolio">View My Work</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/contact">Get in Touch</Link>
                </Button>
            </motion.div>
        </div>
        
        <motion.div
            custom={3}
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="w-full"
        >
            <Image
                src="https://placehold.co/1024x768.png"
                alt="Portfolio showcase"
                width={1024}
                height={768}
                data-ai-hint="design portfolio"
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
      <Section><CallToAction /></Section>
    </main>
  );
}
