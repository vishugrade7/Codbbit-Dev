"use server";

import { personalizePresentation } from "@/ai/flows/personalize-presentation";
import { projects } from "@/lib/data";

export async function getPersonalizedProjects(visitorDescription: string) {
  try {
    const portfolioProjects = projects.map(({ title, description, category }) => ({
      title,
      description,
      category,
    }));

    const result = await personalizePresentation({
      visitorDescription,
      portfolioProjects,
    });
    
    return result.prioritizedProjects;
  } catch (error) {
    console.error("Error personalizing presentation:", error);
    // In a real app, you'd want more robust error handling
    return { error: "Failed to personalize presentation." };
  }
}
