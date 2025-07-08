import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: Plugin<any>[] = [];

// Only add the Google AI plugin if the API key is provided and not a placeholder.
if (
  process.env.GOOGLE_API_KEY &&
  !process.env.GOOGLE_API_KEY.includes('REPLACE_WITH')
) {
  plugins.push(googleAI());
} else {
  // Check on the server side if the key is missing and log a warning.
  if (typeof window === 'undefined') {
    console.warn(
      'GOOGLE_API_KEY is not set or is a placeholder. Genkit AI features will be disabled.'
    );
  }
}

export const ai = genkit({
  plugins,
  // This model will only be available if the googleAI() plugin is loaded.
  // Genkit handles this gracefully if the model is not found.
  model: 'googleai/gemini-2.0-flash',
});
