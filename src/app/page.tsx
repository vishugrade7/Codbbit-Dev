"use client";

import { useState, useEffect } from "react";
import type { Project } from "@/types";
import { projects as initialProjects } from "@/lib/data";
import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import AboutSection from "@/components/about-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import PortfolioSection from "@/components/portfolio-section";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isClient, setIsClient] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePersonalize = (personalizedProjects: Project[]) => {
    const projectMap = new Map(personalizedProjects.map(p => [p.title, p]));
    const sortedProjects = [...initialProjects]
      .map(p => {
        const personalizedData = projectMap.get(p.title);
        if (personalizedData) {
          return { ...p, relevanceScore: personalizedData.relevanceScore, reasoning: personalizedData.reasoning };
        }
        return { ...p, relevanceScore: 0, reasoning: "This project was not prioritized for you."};
      })
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    
    setProjects(sortedProjects);
    setIsPersonalized(true);
  };

  const resetPersonalization = () => {
    setProjects(initialProjects.map(p => ({...p, relevanceScore: undefined, reasoning: undefined})));
    setIsPersonalized(false);
  };

  if (!isClient) {
    return <div className="w-full h-screen bg-background flex items-center justify-center"><Skeleton className="h-24 w-1/2" /></div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection onPersonalize={handlePersonalize} />
        <PortfolioSection projects={projects} isPersonalized={isPersonalized} onReset={resetPersonalization} />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
