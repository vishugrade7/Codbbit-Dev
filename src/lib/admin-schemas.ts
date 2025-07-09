

'use client';

import { z } from "zod";
import type { ContentBlock } from "@/types";

// #region Problem Schemas
export const problemExampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

const baseProblemObjectSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  metadataType: z.enum(["Class", "Trigger"]),
  triggerSObject: z.string().optional(),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases is required."),
  examples: z.array(problemExampleSchema).min(1, "At least one example is required."),
  hints: z.array(z.object({ value: z.string().min(1, "Hint cannot be empty.") })).optional(),
  company: z.string().optional(),
  companyLogoUrl: z.string().url().optional().or(z.literal('')),
  isPremium: z.boolean().optional(),
});

const triggerRefinement = (data: z.infer<typeof baseProblemObjectSchema>) => {
    if (data.metadataType === 'Trigger') {
        return !!data.triggerSObject && data.triggerSObject.length > 0;
    }
    return true;
};

const triggerRefinementOptions = {
    message: "Trigger SObject is required when Metadata Type is Trigger.",
    path: ["triggerSObject"],
};

export const problemFormSchema = baseProblemObjectSchema
    .extend({ id: z.string().optional() })
    .refine(triggerRefinement, triggerRefinementOptions);

export const bulkUploadSchema = z.array(baseProblemObjectSchema.refine(triggerRefinement, triggerRefinementOptions));
// #endregion

// #region Course Schemas
const contentBlockSchema: z.ZodType<ContentBlock> = z.lazy(() => z.discriminatedUnion("type", [
    z.object({ id: z.string(), type: z.literal("text"), content: z.string().min(1, 'Text content cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("code"), content: z.object({ code: z.string().min(1, 'Code cannot be empty.'), language: z.string() }), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("heading1"), content: z.string().min(1, 'Heading cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("heading2"), content: z.string().min(1, 'Heading cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("heading3"), content: z.string().min(1, 'Heading cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("quote"), content: z.string().min(1, 'Quote cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("callout"), content: z.object({ text: z.string().min(1, 'Callout text cannot be empty.'), icon: z.string() }), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("divider"), content: z.literal("").default(""), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("bulleted-list"), content: z.string().min(1, 'List cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("numbered-list"), content: z.string().min(1, 'List cannot be empty.'), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({
        id: z.string(),
        type: z.literal("todo-list"),
        content: z.array(z.object({ id: z.string(), text: z.string().min(1, 'To-do item text cannot be empty.'), checked: z.boolean() })).min(1, "To-do list must have at least one item."),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("toggle-list"),
        content: z.object({ title: z.string().min(1, 'Toggle title cannot be empty.'), text: z.string().min(1, 'Toggle content cannot be empty.') }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("problem"),
        content: z.object({ problemId: z.string().min(1, "A problem must be selected."), title: z.string(), categoryName: z.string(), metadataType: z.string().optional() }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({ id: z.string(), type: z.literal("image"), content: z.string().url("Must be a valid URL").min(1, "Image URL is required."), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("video"), content: z.string().url("Must be a valid URL").min(1, "Video URL is required."), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("audio"), content: z.string().url("Must be a valid URL").min(1, "Audio URL is required."), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({
        id: z.string(),
        type: z.literal("table"),
        content: z.object({
            headers: z.array(z.string().min(1, "Header cannot be empty.")).min(1, "Table must have at least one header."),
            rows: z.array(z.object({ values: z.array(z.string()) }))
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("mcq"),
        content: z.object({
            question: z.string().min(1, "Question is required."),
            options: z.array(z.object({
                id: z.string(),
                text: z.string().min(1, "Option text cannot be empty.")
            })).min(2, "MCQ must have at least two options."),
            correctAnswerIndex: z.number().int().min(0, "A correct answer must be selected."),
            explanation: z.string().optional()
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("breadcrumb"),
        content: z.array(z.object({ id: z.string(), text: z.string(), href: z.string().optional() })),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({ id: z.string(), type: z.literal("mermaid"), content: z.string().min(1, "Mermaid diagram cannot be empty."), backgroundColor: z.string().optional(), textColor: z.string().optional() }),
    z.object({
        id: z.string(),
        type: z.literal("two-column"),
        content: z.object({
            column1: z.array(contentBlockSchema),
            column2: z.array(contentBlockSchema)
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("three-column"),
        content: z.object({
            column1: z.array(contentBlockSchema),
            column2: z.array(contentBlockSchema),
            column3: z.array(contentBlockSchema)
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
     z.object({
        id: z.string(),
        type: z.literal("interactive-code"),
        content: z.object({
            title: z.string().optional(),
            description: z.string().min(1, 'Description is required.'),
            defaultCode: z.string().min(1, 'Default code is required.'),
            executionType: z.enum(['anonymous', 'soql', 'class']).default('anonymous'),
            testClassCode: z.string().optional(),
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
    z.object({
        id: z.string(),
        type: z.literal("stepper"),
        content: z.object({
            title: z.string().optional(),
            steps: z.array(z.object({
                id: z.string(),
                title: z.string().min(1, "Step title is required."),
                content: z.string().min(1, "Step content is required."),
            })).min(1, "Stepper must have at least one step."),
        }),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
    }),
]));


const lessonSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Lesson title is required'),
    isFree: z.boolean().optional(),
    contentBlocks: z.array(contentBlockSchema).min(1, "A lesson must have at least one content block."),
});

const moduleSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    lessons: z.array(lessonSchema).min(1, "A module must have at least one lesson."),
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

// #region Badge Schemas
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

// #region Pricing and Voucher Schemas
export const pricingFormSchema = z.object({
    inr: z.object({
        monthly: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
        biannually: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
        annually: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
    }),
    usd: z.object({
        monthly: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
        biannually: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
        annually: z.object({ price: z.coerce.number(), total: z.coerce.number() }),
    }),
});

export const voucherFormSchema = z.object({
    id: z.string().optional(),
    code: z.string().min(1, 'Code is required').toUpperCase(),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().min(0, 'Value must be positive.'),
    isActive: z.boolean(),
    expiresAt: z.date().optional(),
    oneTimeUse: z.boolean().optional(),
});
// #endregion
