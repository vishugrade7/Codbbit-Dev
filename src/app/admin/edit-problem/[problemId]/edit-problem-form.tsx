
"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { crypto } from "crypto";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateProblem } from "@/app/admin/actions";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Problem } from "@/types";

const exampleSchema = z.object({
  id: z.string(), // for useFieldArray
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  sampleCode: z.string().min(10, "Sample code is required."),
  testcases: z.string().min(1, "Test cases are required."),
  metadataType: z.string().min(1, "Metadata type is required."),
  hints: z.array(z.object({ id: z.string(), value: z.string().min(1, "Hint cannot be empty.") })),
  examples: z.array(exampleSchema),
});

type ProblemFormValues = z.infer<typeof formSchema>;

interface EditProblemFormProps {
    categoryName: string;
    problem: Problem;
}

export function EditProblemForm({ categoryName, problem }: EditProblemFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProblemFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: problem?.title || "",
            description: problem?.description || "",
            difficulty: problem?.difficulty || "Easy",
            sampleCode: problem?.sampleCode || "public class Solution {\n    // Start your code here\n}",
            testcases: problem?.testcases || "",
            metadataType: problem?.metadataType || "Class",
            hints: problem?.hints.map(h => ({ id: crypto.randomUUID(), value: h })) || [],
            examples: problem?.examples.map(e => ({...e, id: e.id || crypto.randomUUID()})) || [],
        },
    });

    const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({
        control: form.control,
        name: "hints",
    });

    const { fields: exampleFields, append: appendExample, remove: removeExample } = useFieldArray({
        control: form.control,
        name: "examples",
    });

    async function onSubmit(values: ProblemFormValues) {
        setIsLoading(true);
        const problemData = { 
            ...values, 
            hints: values.hints.map(h => h.value),
            examples: values.examples.map(({id, ...rest}) => rest),
        };
        
        const result = await updateProblem(problem.id, categoryName, problemData);

        setIsLoading(false);

        if (result.success) {
            toast({ title: "Problem updated successfully!" });
            router.push("/admin");
        } else {
            toast({ variant: "destructive", title: "Failed to update problem", description: result.error });
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="e.g. Two Sum" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Problem Description</FormLabel>
                        <FormControl><Textarea placeholder="Provide a detailed description of the problem..." {...field} rows={5} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Easy">Easy</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                        <FormField
                        control={form.control}
                        name="metadataType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Metadata Type</FormLabel>
                            <FormControl><Input placeholder="e.g. Class" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="sampleCode"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sample Code</FormLabel>
                        <FormControl><Textarea placeholder="Provide starter code for the user..." {...field} rows={8} className="font-code" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="testcases"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Test Cases</FormLabel>
                        <FormControl><Textarea placeholder="Provide test cases to validate the solution..." {...field} rows={5} className="font-code" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div>
                    <FormLabel>Hints</FormLabel>
                    <div className="space-y-2 mt-2">
                        {hintFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name={`hints.${index}.value`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder={`Hint #${index + 1}`} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeHint(index)}><Trash2 /></Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendHint({ id: crypto.randomUUID(), value: "" })}><PlusCircle className="mr-2" /> Add Hint</Button>
                </div>
                
                <div>
                    <FormLabel>Examples</FormLabel>
                        <div className="space-y-4 mt-2">
                            {exampleFields.map((field, index) => (
                            <Card key={field.id} className="p-4 bg-card/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold">Example {index + 1}</h4>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeExample(index)}><Trash2 /></Button>
                                </div>
                                <div className="space-y-4">
                                <FormField control={form.control} name={`examples.${index}.input`} render={({ field }) => (<FormItem><FormLabel>Input</FormLabel><FormControl><Input placeholder="e.g. nums = [2, 7, 11, 15], target = 9" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`examples.${index}.output`} render={({ field }) => (<FormItem><FormLabel>Output</FormLabel><FormControl><Input placeholder="e.g. [0, 1]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`examples.${index}.explanation`} render={({ field }) => (<FormItem><FormLabel>Explanation</FormLabel><FormControl><Textarea placeholder="Optional explanation..." {...field} rows={2}/></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </Card>
                            ))}
                        </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendExample({ id: crypto.randomUUID(), input: "", output: "" })}><PlusCircle className="mr-2" /> Add Example</Button>
                </div>

                    <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
}
