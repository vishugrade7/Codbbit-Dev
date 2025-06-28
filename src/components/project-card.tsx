import Image from "next/image";
import type { Project } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onCardClick: (project: Project) => void;
}

export default function ProjectCard({ project, onCardClick }: ProjectCardProps) {
  return (
    <Card 
      className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      onClick={() => onCardClick(project)}
      role="button"
      aria-label={`View details for ${project.title}`}
    >
      <CardHeader className="p-0">
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={project.title}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="abstract tech"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <CardTitle className="font-headline text-xl mb-2">{project.title}</CardTitle>
          {project.reasoning && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-5 w-5 text-accent" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{project.reasoning}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Badge variant="secondary">{project.category}</Badge>
      </CardFooter>
    </Card>
  );
}
