
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-java';
import 'prismjs/themes/prism-tomorrow.css';

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addProblemToFirestore } from "./actions";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Trash2, UploadCloud } from "lucide-react";


const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  metadataType: z.enum(["Class", "Trigger"]),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases are required."),
  examples: z.array(exampleSchema).min(1, "At least one example is required."),
  hints: z.array(z.object({ value: z.string().min(1, "Hint cannot be empty.") })).optional(),
});


export default function UploadProblemPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            category: "",
            difficulty: "Easy",
            metadataType: "Class",
            sampleCode: "",
            testcases: "",
            examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }],
            hints: [{ value: "" }],
        },
    });

    const { fields: exampleFields, append: appendExample, remove: removeExample } = useFieldArray({
        control: form.control,
        name: "examples",
    });

    const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({
        control: form.control,
        name: "hints",
    });

    useEffect(() => {
        if (!authLoading && !userData?.isAdmin) {
            toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page." });
            router.push('/');
        }
    }, [userData, authLoading, router, toast]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        const result = await addProblemToFirestore(values);
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            form.reset();
        } else {
            toast({ variant: "destructive", title: "Upload Failed", description: result.error });
        }
        setIsSubmitting(false);
    }
    
    if (authLoading || !userData?.isAdmin) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1 container py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold font-headline">Upload New Problem</h1>
                    <p className="text-muted-foreground mt-2">
                        Add a new Apex coding challenge to the platform. All fields are required unless marked optional.
                    </p>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Problem Details</CardTitle>
                                    <CardDescription>The core information about the problem.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl><Input placeholder="e.g., Two Sum" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="category" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <FormControl><Input placeholder="e.g., List, String, Trigger" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Textarea placeholder="Provide a detailed description of the problem..." {...field} rows={5} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="difficulty" render={({ field }) => (
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
                                        )} />
                                        <FormField control={form.control} name="metadataType" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Metadata Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select metadata type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Class">Class</SelectItem>
                                                        <SelectItem value="Trigger">Trigger</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                 <CardHeader>
                                    <CardTitle>Code & Tests</CardTitle>
                                    <CardDescription>Provide the sample code and the test cases for validation.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Controller
                                        name="sampleCode"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sample Code</FormLabel>
                                                <div className="editor-container rounded-md border w-full h-64 overflow-auto bg-[#282C34]">
                                                    <Editor
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        highlight={code => highlight(code, languages.java, 'java')}
                                                        padding={16}
                                                        className="font-code text-sm"
                                                        style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14 }}
                                                    />
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Controller
                                        name="testcases"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Test Cases</FormLabel>
                                                <div className="editor-container rounded-md border w-full h-64 overflow-auto bg-[#282C34]">
                                                    <Editor
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        highlight={code => highlight(code, languages.java, 'java')}
                                                        padding={16}
                                                        className="font-code text-sm"
                                                        style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14 }}
                                                    />
                                                </div>
                                                 <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader>
                                    <CardTitle>Examples</CardTitle>
                                    <CardDescription>Provide clear examples of inputs and outputs.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {exampleFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-md relative space-y-2">
                                            <h4 className="font-semibold">Example {index + 1}</h4>
                                             <FormField control={form.control} name={`examples.${index}.input`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Input (Optional)</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name={`examples.${index}.output`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Output</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name={`examples.${index}.explanation`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Explanation (Optional)</FormLabel>
                                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            {exampleFields.length > 1 && (
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeExample(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendExample({ input: '', output: '', explanation: '' })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Example
                                    </Button>
                                </CardContent>
                             </Card>

                             <Card>
                                <CardHeader>
                                    <CardTitle>Hints (Optional)</CardTitle>
                                    <CardDescription>Add hints to guide users if they get stuck.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {hintFields.map((field, index) => (
                                         <div key={field.id} className="flex items-center gap-2">
                                            <FormField control={form.control} name={`hints.${index}.value`} render={({ field }) => (
                                                <FormItem className="flex-1">
                                                     <FormControl><Input {...field} placeholder={`Hint ${index + 1}`} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                             <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeHint(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                         </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendHint({ value: '' })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Hint
                                    </Button>
                                </CardContent>
                             </Card>

                            <div className="flex justify-end">
                                <Button type="submit" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                    Upload Problem
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </main>
            <Footer />
        </div>
    );
}

