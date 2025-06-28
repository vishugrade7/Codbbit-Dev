import Image from "next/image";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectDetailModal({ project, isOpen, onClose }: ProjectDetailModalProps) {
  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden mb-4">
            <Image
              src={project.imageUrl}
              alt={project.title}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              data-ai-hint="abstract tech"
            />
          </div>
          <DialogTitle className="font-headline text-3xl">{project.title}</DialogTitle>
           <Badge variant="secondary" className="w-fit">{project.category}</Badge>
          <DialogDescription className="pt-4 text-base">{project.description}</DialogDescription>
        </DialogHeader>
        {project.projectUrl && (
          <div className="mt-4">
            <Button asChild>
              <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2" />
                View Live Project
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
