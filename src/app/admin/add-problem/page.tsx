
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addProblem } from "../actions";
import { Loader2, PlusCircle, Trash2, ArrowLeft } from "lucide-react";

const exampleSchema = z.object({
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
  hints: z.array(z.object({ value: z.string().min(1, "Hint cannot be empty.") })),
  examples: z.array(exampleSchema),
});


export default function AddProblemPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            difficulty: "Easy",
            sampleCode: "public class Solution {\n    // Start your code here\n}",
            testcases: "",
            metadataType: "Class",
            hints: [],
            examples: [],
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


    if (!categoryId || !categoryName) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-destructive">Invalid Category</h1>
                        <p className="text-muted-foreground">Please go back to the admin page and select a category.</p>
                        <Button asChild className="mt-4"><Link href="/admin">Go Back</Link></Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const hints = values.hints.map(h => h.value);
        const result = await addProblem(categoryId as string, { ...values, hints });
        setIsLoading(false);

        if (result.success) {
            toast({ title: "Problem added successfully!" });
            router.push("/admin");
        } else {
            toast({ variant: "destructive", title: "Failed to add problem", description: result.error });
        }
    }
    
    return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12">
            <div className="max-w-3xl mx-auto">
             <Button variant="ghost" asChild className="mb-4">
                <Link href="/admin"><ArrowLeft className="mr-2" /> Back to Problem Management</Link>
             </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Add New Problem</CardTitle>
                    <CardDescription>Adding a problem to the &quot;{decodeURIComponent(categoryName)}&quot; category.</CardDescription>
                </CardHeader>
                <CardContent>
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
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendHint({ value: "" })}><PlusCircle className="mr-2" /> Add Hint</Button>
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
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendExample({ input: "", output: "" })}><PlusCircle className="mr-2" /> Add Example</Button>
                            </div>

                             <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Add Problem
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            </div>
        </div>
      </main>
      <Footer />
    </div>
    )
}
