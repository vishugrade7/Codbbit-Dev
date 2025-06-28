// src/ai/flows/personalize-presentation.ts
'use server';

/**
 * @fileOverview A Genkit flow that personalizes the portfolio presentation based on the visitor's inferred interests.
 *
 * - personalizePresentation - A function that personalizes the portfolio presentation.
 * - PersonalizePresentationInput - The input type for the personalizePresentation function.
 * - PersonalizePresentationOutput - The return type for the personalizePresentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizePresentationInputSchema = z.object({
  visitorDescription: z
    .string()
    .describe(
      'A description of the visitor, including their interests and background.'
    ),
  portfolioProjects: z.array(
    z.object({
      title: z.string().describe('The title of the project.'),
      description: z.string().describe('A detailed description of the project.'),
      category: z.string().describe('The category of the project (e.g., web design, mobile app, etc.).'),
    })
  ).describe('An array of portfolio projects.'),
});

export type PersonalizePresentationInput = z.infer<typeof PersonalizePresentationInputSchema>;

const PersonalizePresentationOutputSchema = z.object({
  prioritizedProjects: z.array(
    z.object({
      title: z.string().describe('The title of the project.'),
      description: z.string().describe('A detailed description of the project.'),
      category: z.string().describe('The category of the project.'),
      relevanceScore: z.number().describe('A score indicating the relevance of the project to the visitor.'),
      reasoning: z.string().describe('Explanation of why the project is relevant to the user')
    })
  ).describe('An array of portfolio projects, prioritized based on relevance to the visitor.'),
});

export type PersonalizePresentationOutput = z.infer<typeof PersonalizePresentationOutputSchema>;

export async function personalizePresentation(input: PersonalizePresentationInput): Promise<PersonalizePresentationOutput> {
  return personalizePresentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizePresentationPrompt',
  input: {schema: PersonalizePresentationInputSchema},
  output: {schema: PersonalizePresentationOutputSchema},
  prompt: `You are an expert portfolio curator, skilled at understanding a visitor's interests and highlighting the most relevant projects in a portfolio.

You will receive a description of the visitor and a list of portfolio projects. Your task is to prioritize the projects based on their relevance to the visitor, providing a relevance score and reasoning for each.

Visitor Description: {{{visitorDescription}}}

Portfolio Projects:
{{#each portfolioProjects}}
- Title: {{{title}}}
  Description: {{{description}}}
  Category: {{{category}}}
{{/each}}

Prioritize the projects based on the visitor's interests.  Include the project title, description, category, relevance score, and reasoning for each project.
Set the relevanceScore between 0 and 1, where 1 is most relevant, and include your reasoning.
`, 
});

const personalizePresentationFlow = ai.defineFlow(
  {
    name: 'personalizePresentationFlow',
    inputSchema: PersonalizePresentationInputSchema,
    outputSchema: PersonalizePresentationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
