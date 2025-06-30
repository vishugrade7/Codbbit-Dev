
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-java';
import 'prismjs/themes/prism-tomorrow.css';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData } from "@/types";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { upsertProblemToFirestore } from "./actions";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, UploadCloud, Edit, Search } from "lucide-react";


// #region Schemas
const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  id: z.string().optional(),
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
// #endregion

type ViewMode = 'list' | 'form';
type FormMode = 'add' | 'edit';
type ProblemWithCategory = Problem & { categoryName: string };

export default function UploadProblemPage() {
    const { user: authUser, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [formMode, setFormMode] = useState<FormMode>('add');
    const [currentProblem, setCurrentProblem] = useState<ProblemWithCategory | null>(null);

    const isAuthorized = userData?.isAdmin || authUser?.email === 'gradevishu@gmail.com';

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page." });
            router.push('/');
        }
    }, [userData, authLoading, authUser, isAuthorized, router, toast]);

    if (authLoading || !isAuthorized) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    const handleAddNew = () => {
        setCurrentProblem(null);
        setFormMode('add');
        setViewMode('form');
    }
    
    const handleEdit = (problem: ProblemWithCategory) => {
        setCurrentProblem(problem);
        setFormMode('edit');
        setViewMode('form');
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1 container py-8">
                {viewMode === 'list' ? (
                    <ProblemList onEdit={handleEdit} onAddNew={handleAddNew} />
                ) : (
                    <ProblemForm 
                        formMode={formMode}
                        problem={currentProblem} 
                        onClose={() => setViewMode('list')} 
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}

// #region ProblemList
function ProblemList({ onEdit, onAddNew }: { onEdit: (p: ProblemWithCategory) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");

    useEffect(() => {
        const fetchProblems = async () => {
            setLoading(true);
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data().Category as ApexProblemsData;
                    const allProblems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );
                    setProblems(allProblems.sort((a,b) => a.title.localeCompare(b.title)));
                }
            } catch (error) {
                console.error("Error fetching problems:", error);
                toast({ variant: 'destructive', title: 'Failed to load problems' });
            } finally {
                setLoading(false);
            }
        };
        fetchProblems();
    }, [toast]);

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter]);

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
          case 'medium': return 'bg-primary/20 text-primary border-primary/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
        }
    };

    return (
        <div className="relative">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold font-headline">Problem Management</h1>
                    <p className="text-muted-foreground mt-2">
                        View, edit, or add new Apex coding challenges to the platform.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 my-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search problems by title..."
                        className="w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {["All", "Easy", "Medium", "Hard"].map((diff) => (
                    <Button
                        key={diff}
                        variant={difficultyFilter === diff ? "default" : "outline"}
                        onClick={() => setDifficultyFilter(diff)}
                        className="flex-1 md:flex-none"
                    >
                        {diff}
                    </Button>
                    ))}
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : filteredProblems.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProblems.map((problem) => (
                                <TableRow key={problem.id}>
                                    <TableCell className="font-medium">{problem.title}</TableCell>
                                    <TableCell>{problem.categoryName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                            {problem.difficulty}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => onEdit(problem)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No problems found for the selected criteria.</p>
                </div>
            )}
            
            <Button
                onClick={onAddNew}
                className="fixed top-24 right-8 rounded-full h-14 w-14 shadow-lg z-10"
                size="icon"
            >
                <PlusCircle className="h-7 w-7" />
                <span className="sr-only">Add New Problem</span>
            </Button>
        </div>
    );
}
// #endregion

// #region ProblemForm
function ProblemForm({ formMode, problem, onClose }: { formMode: FormMode, problem: ProblemWithCategory | null, onClose: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

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

    useEffect(() => {
        if (formMode === 'edit' && problem) {
            form.reset({
                id: problem.id,
                title: problem.title,
                description: problem.description,
                category: problem.categoryName,
                difficulty: problem.difficulty,
                metadataType: problem.metadataType,
                sampleCode: problem.sampleCode,
                testcases: problem.testcases,
                examples: problem.examples.map(e => ({...e})),
                hints: problem.hints.length > 0 ? problem.hints.map(h => ({ value: h })) : [{value: ""}],
            });
        } else {
            form.reset({
                title: "", description: "", category: "", difficulty: "Easy", metadataType: "Class",
                sampleCode: "", testcases: "",
                examples: [{ input: "", output: "", explanation: "" }],
                hints: [{ value: "" }],
            });
        }
    }, [problem, formMode, form]);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data && data.Category) {
                        const existingCategories = Object.keys(data.Category);
                        setCategories(existingCategories.sort());
                    }
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
                toast({ variant: "destructive", title: "Could not load categories." });
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [toast]);

    const { fields: exampleFields, append: appendExample, remove: removeExample } = useFieldArray({ control: form.control, name: "examples" });
    const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({ control: form.control, name: "hints" });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        const result = await upsertProblemToFirestore(values);
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            onClose();
        } else {
            toast({ variant: "destructive", title: "Upload Failed", description: result.error });
        }
        setIsSubmitting(false);
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                 <div>
                    <h1 className="text-4xl font-bold font-headline">{formMode === 'add' ? 'Upload New Problem' : 'Edit Problem'}</h1>
                    <p className="text-muted-foreground mt-2">
                        {formMode === 'add' ? 'Add a new Apex coding challenge to the platform.' : 'Update the details for this problem.'}
                    </p>
                 </div>
                 <Button variant="outline" onClick={onClose}>Back to List</Button>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Problem Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input placeholder="e.g., Two Sum" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => {
                                    const handleValueChange = (value: string) => {
                                        if (value === '---new-category---') {
                                            setIsAddingNewCategory(true);
                                            field.onChange('');
                                        } else {
                                            setIsAddingNewCategory(false);
                                            field.onChange(value);
                                        }
                                    };

                                    return (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            {isAddingNewCategory ? (
                                                <div className="flex items-center gap-2">
                                                    <FormControl><Input placeholder="Enter new category name..." {...field} autoFocus/></FormControl>
                                                    <Button type="button" variant="outline" onClick={() => { setIsAddingNewCategory(false); field.onChange(''); }}>Cancel</Button>
                                                </div>
                                            ) : (
                                                <Select onValueChange={handleValueChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {loadingCategories ? <SelectItem value="loading" disabled>Loading...</SelectItem> : categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                                                        <SelectSeparator />
                                                        <SelectItem value="---new-category---"><div className="flex items-center gap-2 text-primary"><PlusCircle className="h-4 w-4" /><span>Add new category</span></div></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (HTML supported)</FormLabel>
                                    <FormControl><Textarea placeholder="Provide a detailed description of the problem..." {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="difficulty" render={({ field }) => (
                                    <FormItem><FormLabel>Difficulty</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="metadataType" render={({ field }) => (
                                    <FormItem><FormLabel>Metadata Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Class">Class</SelectItem><SelectItem value="Trigger">Trigger</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Code & Tests</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                                <FormField control={form.control} name="sampleCode" render={({ field }) => (<FormItem><FormLabel>Sample Code</FormLabel><div className="editor-container rounded-md border w-full h-64 overflow-auto bg-[#282C34]"><Editor value={field.value} onValueChange={field.onChange} highlight={code => highlight(code, languages.java, 'java')} padding={16} className="font-code text-sm" style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14 }}/></div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="testcases" render={({ field }) => (<FormItem><FormLabel>Test Cases</FormLabel><div className="editor-container rounded-md border w-full h-64 overflow-auto bg-[#282C34]"><Editor value={field.value} onValueChange={field.onChange} highlight={code => highlight(code, languages.java, 'java')} padding={16} className="font-code text-sm" style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14 }}/></div><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Examples</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {exampleFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-md relative space-y-2">
                                    <h4 className="font-semibold">Example {index + 1}</h4>
                                    <FormField control={form.control} name={`examples.${index}.input`} render={({ field }) => (<FormItem><FormLabel>Input (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`examples.${index}.output`} render={({ field }) => (<FormItem><FormLabel>Output</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`examples.${index}.explanation`} render={({ field }) => (<FormItem><FormLabel>Explanation (Optional)</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                                    {exampleFields.length > 1 && (<Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeExample(index)}><Trash2 className="h-4 w-4" /></Button>)}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendExample({ input: '', output: '', explanation: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Example</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Hints (Optional)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {hintFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2">
                                    <FormField control={form.control} name={`hints.${index}.value`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field} placeholder={`Hint ${index + 1}`} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeHint(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendHint({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Hint</Button>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            {formMode === 'add' ? 'Upload Problem' : 'Update Problem'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
// #endregion

