
'use client';

import { z } from "zod";

// #region Problem Schemas
export const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

export const problemFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  metadataType: z.enum(["Class", "Trigger"]),
  triggerSObject: z.string().optional(),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases is required."),
  examples: z.array(exampleSchema).min(1, "At least one example is required."),
  hints: z.array(z.object({ value: z.string() })).optional(),
  company: z.string().optional(),
  companyLogoUrl: z.string().url().optional().or(z.literal('')),
  isPremium: z.boolean().optional(),
}).refine(data => {
    if (data.metadataType === 'Trigger') {
        return !!data.triggerSObject && data.triggerSObject.length > 0;
    }
    return true;
}, {
    message: "Trigger SObject is required when Metadata Type is Trigger.",
    path: ["triggerSObject"],
});

export const bulkProblemSchema = problemFormSchema.omit({ id: true });
export const bulkUploadSchema = z.array(bulkProblemSchema);
// #endregion

// #region Course Schemas
export type ActionContentBlock = {
    id: string;
    type: 'text' | 'image' | 'video' | 'code' | 'problem' | 'interactive' | 'columns';
    content: string;
    language?: string | undefined;
    caption?: string | undefined;
    columnData?: { blocks: ActionContentBlock[] }[] | undefined;
};

export const contentBlockSchema: z.ZodType<ActionContentBlock> = z.lazy(() => z.object({
    id: z.string(),
    type: z.enum(['text', 'image', 'video', 'code', 'problem', 'interactive', 'columns']),
    content: z.string(),
    language: z.string().optional(),
    caption: z.string().optional(),
    columnData: z.array(z.object({
        blocks: z.array(z.lazy(() => contentBlockSchema))
    })).optional()
}).refine(data => {
    if (data.type === 'columns') return true;
    return !!data.content;
}, {
    message: "Content cannot be empty for this block type.",
    path: ["content"],
}));


export const lessonSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Lesson title is required'),
    isFree: z.boolean().optional(),
    contentBlocks: z.array(contentBlockSchema),
});

export const moduleSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    lessons: z.array(lessonSchema),
});

export const courseFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Course title is required'),
    description: z.string().min(1, 'Course description is required'),
    category: z.string().min(1, 'Course category is required'),
    thumbnailUrl: z.string().url('Must be a valid URL').min(1, 'Thumbnail URL is required'),
    modules: z.array(moduleSchema).min(1, 'At least one module is required'),
    isPublished: z.boolean(),
    isPremium: z.boolean().optional(),
});
// #endregion

// #region Navigation Schema
export const navLinksSchema = z.object({
    links: z.array(z.object({
        id: z.string(),
        label: z.string().min(1, 'Label is required'),
        href: z.string().min(1, 'Href is required').refine(val => val.startsWith('/'), { message: 'Href must start with /' }),
        isEnabled: z.boolean(),
        isProtected: z.boolean(),
    }))
});
// #endregion

// #region Badge Schema
export const badgeFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Badge name is required."),
    description: z.string().min(1, "Description is required."),
    type: z.enum(['STREAK', 'POINTS', 'TOTAL_SOLVED', 'CATEGORY_SOLVED', 'ACTIVE_DAYS']),
    value: z.coerce.number().min(1, "Value must be at least 1."),
    category: z.string().optional(),
}).refine(data => {
    if (data.type === 'CATEGORY_SOLVED') {
        return !!data.category && data.category.length > 0;
    }
    return true;
}, {
    message: "Category is required for CATEGORY_SOLVED type badges.",
    path: ["category"],
});
// #endregion
