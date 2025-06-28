"use client";

import { useState, useMemo } from "react";
import type { Project } from "@/types";
import ProjectCard from "./project-card";
import ProjectDetailModal from "./project-detail-modal";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Sparkles, X } from "lucide-react";

interface PortfolioSectionProps {
  projects: Project[];
  isPersonalized: boolean;
  onReset: () => void;
}

export default function PortfolioSection({ projects, isPersonalized, onReset }: PortfolioSectionProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const allCategories = projects.map(p => p.category);
    return ["All", ...Array.from(new Set(allCategories))];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeCategory === "All") return projects;
    return projects.filter(p => p.category === activeCategory);
  }, [projects, activeCategory]);

  const handleCardClick = (project: Project) => {
    setSelectedProject(project);
  };

  const closeModal = () => {
    setSelectedProject(null);
  };

  return (
    <section id="portfolio" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl text-primary">My Work</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              A selection of projects that showcase my skills in design and development.
            </p>
          </div>
        </div>

        {isPersonalized && (
            <Alert className="mt-8 bg-primary/10 border-primary/20 text-primary-foreground">
                <Sparkles className="h-4 w-4 !text-primary" />
                <AlertTitle className="font-headline text-primary">This view is personalized for you!</AlertTitle>
                <AlertDescription className="text-primary/80">
                    Projects have been reordered based on your interests.
                    <Button variant="ghost" size="sm" onClick={onReset} className="ml-4 text-primary hover:bg-primary/20">
                        <X className="mr-2 h-4 w-4" /> Reset View
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="my-8 flex justify-center flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} onCardClick={handleCardClick} />
          ))}
        </div>
      </div>
      <ProjectDetailModal isOpen={!!selectedProject} project={selectedProject} onClose={closeModal} />
    </section>
  );
}
