

import { z } from "zod";

// #region Problem Schemas
export const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, 'Output is required'),
  explanation: z.string().optional(),
});

export const hintSchema = z.object({
  value: z.string().min(1, "Hint cannot be empty"),
});

// Base schema without refinement
const baseProblemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  examples: z.array(exampleSchema).min(1, "At least one example is required."),
  hints: z.array(hintSchema).optional(),
  metadataType: z.enum(["Class", "Trigger"]),
  triggerSObject: z.string().optional(),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases are required."),
  company: z.string().optional(),
  companyLogoUrl: z.string().url().optional().or(z.literal('')),
  isPremium: z.boolean().optional(),
});

// Refined schema for the form
export const problemFormSchema = baseProblemSchema.refine(data => {
    if (data.metadataType === 'Trigger') {
        return !!data.triggerSObject;
    }
    return true;
}, {
    message: "Trigger SObject is required when metadata type is Trigger.",
    path: ["triggerSObject"],
});

// Schema for bulk import, omitting the ID from the base schema
export const bulkProblemSchema = baseProblemSchema.omit({ id: true });
export const bulkUploadSchema = z.array(bulkProblemSchema);
// #endregion

// #region Course Schemas
export const contentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'video', 'code', 'problem', 'interactive']),
  content: z.string(),
  language: z.string().optional(),
  caption: z.string().optional(),
});

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Lesson title is required."),
  isFree: z.boolean().optional(),
  contentBlocks: z.array(contentBlockSchema),
});

export const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Module title is required."),
  lessons: z.array(lessonSchema),
});

export const courseFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  thumbnailUrl: z.string().url("Must be a valid URL."),
  isPublished: z.boolean(),
  isPremium: z.boolean().optional(),
  modules: z.array(moduleSchema),
});
// #endregion

// #region Settings Schemas
export const navLinkSchema = z.object({
    id: z.string(),
    label: z.string().min(1, "Label is required"),
    href: z.string().min(1, "URL is required"),
    isEnabled: z.boolean(),
    isProtected: z.boolean(),
});
export const navLinksSchema = z.array(navLinkSchema);

export const badgeFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Badge name is required"),
    description: z.string().min(1, "Description is required"),
    type: z.enum(['STREAK', 'POINTS', 'TOTAL_SOLVED', 'CATEGORY_SOLVED', 'ACTIVE_DAYS']),
    value: z.number().min(1, "Value must be positive"),
    category: z.string().optional(),
});

export const brandingSchema = z.object({
    colors: z.object({
        primary: z.string().min(1, "Primary color is required."),
        accent: z.string().min(1, "Accent color is required."),
        background: z.string().min(1, "Background color is required."),
    }),
    fonts: z.object({
        headline: z.string().min(1, "Headline font is required."),
        body: z.string().min(1, "Body font is required."),
    }),
});

export const pricingPlanSchema = z.object({
    id: z.string(),
    active: z.boolean(),
    prices: z.object({
        inr: z.number().min(0),
        usd: z.number().min(0),
    }),
    features: z.array(z.object({ value: z.string() })),
});

// #endregion
