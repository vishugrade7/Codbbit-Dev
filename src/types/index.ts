export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  projectUrl?: string;
  relevanceScore?: number;
  reasoning?: string;
}
