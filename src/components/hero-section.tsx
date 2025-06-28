"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import PersonalizeModal from "./personalize-modal";
import type { Project } from "@/types";
import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  onPersonalize: (projects: Project[]) => void;
}

export default function HeroSection({ onPersonalize }: HeroSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToPortfolio = () => {
    document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" });
  };
  
  return (
    <>
      <section className="w-full py-20 md:py-32 lg:py-40 bg-card border-b">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary">
                  Creative Developer & Designer
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  I build beautiful, functional, and user-centric digital experiences. Explore my work and see how I can bring your ideas to life.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" onClick={scrollToPortfolio}>
                  View My Work
                </Button>
                <Button size="lg" variant="outline" onClick={() => setIsModalOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Personalize My View
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
               <div className="w-full max-w-md aspect-square bg-gradient-to-tr from-primary to-accent rounded-full animate-pulse opacity-20 blur-3xl" />
            </div>
          </div>
        </div>
      </section>
      <PersonalizeModal open={isModalOpen} onOpenChange={setIsModalOpen} onPersonalize={onPersonalize} />
    </>
  );
}
