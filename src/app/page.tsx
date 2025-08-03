
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
import { ArrowRight, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from '@/context/AuthContext';

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
  const [userCount, setUserCount] = React.useState(500);
  const [loadingCount, setLoadingCount] = React.useState(true);
  const { user } = useAuth();
  const getStartedHref = user ? "/apex-problems" : "/signup";

  React.useEffect(() => {
    const fetchUserCount = async () => {
      if (!db) {
        setLoadingCount(false);
        return;
      }
      try {
        const usersCollection = collection(db, "users");
        const snapshot = await getDocs(usersCollection);
        setUserCount(500 + snapshot.size);
      } catch (error) {
        console.error("Error fetching user count:", error);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchUserCount();
  }, []);

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
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://images.unsplash.com/photo-1549692520-acc6669e2f0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMnx8Y29kZXJ8ZW58MHx8fHwxNzU0MjIyMzE4fDA&ixlib=rb-4.1.0&q=80&w=1080" data-ai-hint="person coder" /></Avatar>
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxtYW58ZW58MHx8fHwxNzU0MTQ2NDkwfDA&ixlib=rb-4.1.0&q=80&w=1080" data-ai-hint="person" /></Avatar>
                <Avatar className="h-6 w-6 border-2 border-background"><AvatarImage src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxtYW58ZW58MHx8fHwxNzU0MTQ2NDkwfDA&ixlib=rb-4.1.0&q=80&w=1080" data-ai-hint="person" /></Avatar>
            </div>
            <p className="text-sm text-muted-foreground">
              {loadingCount ? "Trusted by developers" : `Trusted by ${userCount}+ developers`}
            </p>
        </motion.div>

        <motion.div
          custom={1}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-4"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground/80">
            Codbbit – Build Your Code Habit
          </h1>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-primary font-headline">
            Practice Apex Coding Problems
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
            <Link href={getStartedHref}>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/leaderboard">View Leaderboard <Trophy className="ml-2 h-4 w-4" /></Link>
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
            src="https://images.unsplash.com/photo-1754220763477-97453f9e3d99?q=80&w=1559&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
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
