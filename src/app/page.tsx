
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    <div className="w-full flex items-center justify-center bg-background p-4 pt-24 md:pt-32 home-hero-gradient">
      <div className="container mx-auto flex flex-col items-center text-center gap-6">
        
        <motion.div custom={0} variants={heroVariants} initial="hidden" animate="visible" className="flex items-center gap-2">
            <div className="flex -space-x-2">
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://placehold.co/32x32.png" data-ai-hint="person" /></Avatar>
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://placehold.co/32x32.png" data-ai-hint="person" /></Avatar>
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://placehold.co/32x32.png" data-ai-hint="person" /></Avatar>
            </div>
            <p className="text-sm text-muted-foreground">Trusted by 500+ developers</p>
        </motion.div>

        <motion.div
          custom={1}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-4"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground/80">
            Master Salesforce with Codbbit
          </h1>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground font-headline">
            Bored of Theory? Let's Code.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            Join thousands of developers building skills, cracking interviews, and landing internships.
            Kickstart your coding journey—no boring lectures, just real practice!
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
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/courses">Explore Courses</Link>
          </Button>
        </motion.div>

        <motion.div
          custom={3}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-5xl mt-8"
        >
          <Image
            src="https://placehold.co/1200x740.png"
            alt="Dashboard preview of Codbbit platform"
            width={1200}
            height={740}
            data-ai-hint="dashboard course"
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
