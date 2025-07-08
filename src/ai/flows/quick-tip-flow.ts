'use server';
/**
 * @fileOverview A flow to generate a quick Salesforce development tip.
 *
 * - getQuickTip - A function that returns a single development tip.
 * - QuickTipOutput - The return type for the getQuickTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuickTipOutputSchema = z.object({
  tip: z.string().describe("A concise tip for Salesforce developers about Apex or LWC."),
});
export type QuickTipOutput = z.infer<typeof QuickTipOutputSchema>;

export async function getQuickTip(): Promise<QuickTipOutput> {
  // Check if any models are available before running the flow.
  // This makes the AI feature optional.
  if (ai.listModels().length === 0) {
    return { tip: "AI features are disabled. Set GOOGLE_API_KEY to enable." };
  }
  
  try {
    return await quickTipFlow();
  } catch (error) {
    console.error("Error fetching quick tip:", error);
    return { tip: "Could not fetch an AI-generated tip at this time." };
  }
}

const prompt = ai.definePrompt({
  name: 'quickTipPrompt',
  output: {schema: QuickTipOutputSchema},
  prompt: `You are an expert Salesforce developer and mentor. 
  Generate a single, concise, and useful tip for a developer learning either Apex or Lightning Web Components (LWC).
  The tip should be practical and easy to understand.
  Examples: 
  - "In Apex, use SOQL for loops to efficiently process large data sets without hitting heap limits."
  - "In LWC, use @track for private reactive properties and @api for public properties exposed to parent components."
  Keep the tip to one sentence if possible.
  `,
});

const quickTipFlow = ai.defineFlow(
  {
    name: 'quickTipFlow',
    outputSchema: QuickTipOutputSchema,
  },
  async () => {
    const {output} = await prompt({});
    return output!;
  }
);
