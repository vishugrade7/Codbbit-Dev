
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Problem, ApexProblemsData, ProblemSheet } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getCache, setCache } from "@/lib/cache";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, ClipboardList, X, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type ProblemWithCategory = Problem & { categoryName: string };
const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

function CreateProblemSheetClient() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: authUser, userData } = useAuth();
    
    const sheetId = searchParams.get('id');
    const formMode = sheetId ? 'edit' : 'create';

    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");

    const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(new Set());
    const [sheetName, setSheetName] = useState("");
    const [sheetDescription, setSheetDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        const fetchProblemsAndSheet = async () => {
            setLoading(true);
            try {
                // Fetch all problems
                const processProblems = (data: ApexProblemsData | null) => {
                    if (!data) return;
                    const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );
                    setAllProblems(problems);
                };

                const cachedProblems = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
                if (cachedProblems) {
                    processProblems(cachedProblems);
                } else {
                    const apexDocRef = doc(db, "problems", "Apex");
                    const problemsSnap = await getDoc(apexDocRef);
                    if (problemsSnap.exists()) {
                        const data = problemsSnap.data().Category as ApexProblemsData;
                        await setCache(APEX_PROBLEMS_CACHE_KEY, data);
                        processProblems(data);
                    }
                }

                // If in edit mode, fetch sheet data
                if (formMode === 'edit' && sheetId) {
                    const sheetDocRef = doc(db, 'problem-sheets', sheetId);
                    const sheetSnap = await getDoc(sheetDocRef);
                    if (sheetSnap.exists()) {
                        const sheetData = sheetSnap.data() as ProblemSheet;
                        if (sheetData.createdBy !== authUser?.uid) {
                            toast({ variant: 'destructive', title: 'Unauthorized', description: "You can only edit sheets you have created." });
                            router.push('/problem-sheets');
                            return;
                        }
                        setSheetName(sheetData.name);
                        setSheetDescription(sheetData.description || "");
                        setSelectedProblemIds(new Set(sheetData.problemIds));
                    } else {
                        toast({ variant: 'destructive', title: 'Sheet not found' });
                        router.push('/problem-sheets');
                    }
                }
            } catch (error) {
                console.error("Error loading data:", error);
                toast({ variant: 'destructive', title: 'Failed to load data' });
            } finally {
                setLoading(false);
            }
        };
        fetchProblemsAndSheet();
    }, [toast, formMode, sheetId, authUser, router]);

    const uniqueCategories = useMemo(() => {
        if (!allProblems || allProblems.length === 0) return [];
        const categorySet = new Set(allProblems.map(p => p.categoryName));
        return Array.from(categorySet).sort();
    }, [allProblems]);
    
    const filteredProblems = useMemo(() => {
        return allProblems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => categoryFilter === "All" || p.categoryName === categoryFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProblems, searchTerm, difficultyFilter, categoryFilter]);

    const selectedProblems = useMemo(() => {
        return Array.from(selectedProblemIds).map(id => allProblems.find(p => p.id === id)).filter(Boolean) as ProblemWithCategory[];
    }, [selectedProblemIds, allProblems]);
    
    const handleToggleProblem = (problemId: string) => {
        const newSet = new Set(selectedProblemIds);
        if (newSet.has(problemId)) {
            newSet.delete(problemId);
        } else {
            newSet.add(problemId);
        }
        setSelectedProblemIds(newSet);
    };

    const handleSelectAllFiltered = (checked: boolean | 'indeterminate') => {
        const newSet = new Set(selectedProblemIds);
        if (checked) {
            filteredProblems.forEach(p => newSet.add(p.id));
        } else {
            filteredProblems.forEach(p => newSet.delete(p.id));
        }
        setSelectedProblemIds(newSet);
    };
    
    const isAllFilteredSelected = useMemo(() => {
        if (filteredProblems.length === 0) return false;
        const filteredIds = new Set(filteredProblems.map(p => p.id));
        const selectedFilteredCount = Array.from(selectedProblemIds).filter(id => filteredIds.has(id)).length;

        if (selectedFilteredCount === 0) return false;
        if (selectedFilteredCount === filteredProblems.length) return true;
        return 'indeterminate';
    }, [filteredProblems, selectedProblemIds]);


    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
          case 'medium': return 'bg-primary/20 text-primary border-primary/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
        }
    };
    
    const handleSaveSheet = async () => {
        if (!authUser || !userData) {
            toast({ variant: "destructive", title: "Please log in to save a sheet." });
            return;
        }
        if (!sheetName) {
            toast({ variant: "destructive", title: "Sheet name is required." });
            return;
        }
        if (selectedProblems.length === 0) {
            toast({ variant: "destructive", title: "Add at least one problem to the sheet." });
            return;
        }
        if (!db) {
            toast({ variant: "destructive", title: "Database not available." });
            return;
        }

        setIsSaving(true);
        const problemIds = selectedProblems.map(p => p.id);
        
        try {
            if (formMode === 'edit' && sheetId) {
                 const sheetDocRef = doc(db, 'problem-sheets', sheetId);
                 await updateDoc(sheetDocRef, {
                    name: sheetName,
                    description: sheetDescription,
                    problemIds: problemIds,
                 });
                 toast({ title: "Sheet updated successfully!" });
                 router.push(`/sheets/${sheetId}`);
            } else {
                const sheetsCollection = collection(db, 'problem-sheets');
                const newSheetDoc = await addDoc(sheetsCollection, {
                    name: sheetName,
                    description: sheetDescription,
                    problemIds: problemIds,
                    createdBy: authUser.uid,
                    creatorName: userData.name,
                    creatorUsername: userData.username.toLowerCase(),
                    creatorAvatarUrl: userData.avatarUrl,
                    createdAt: serverTimestamp(),
                    isPublic: true,
                });

                toast({ title: "Sheet created successfully!", description: "Redirecting you to your new sheet." });
                router.push(`/sheets/${newSheetDoc.id}`);
            }
        } catch (error) {
            console.error(`Error ${formMode}ing problem sheet:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            toast({ variant: "destructive", title: `Failed to ${formMode} sheet`, description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    const backUrl = formMode === 'edit' && sheetId ? `/sheets/${sheetId}` : '/problem-sheets';

    return (
        <main className="flex-1 container py-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
                 <Button variant="outline" onClick={() => router.push(backUrl)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {formMode === 'edit' ? 'Back to Sheet' : 'Back to All Sheets'}
                </Button>
            </div>
            <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                    {formMode === 'edit' ? 'Edit Problem Sheet' : 'Create New Problem Sheet'}
                </h1>
                <p className="text-muted-foreground mt-4 max-w-2xl">
                    {formMode === 'edit' ? 'Update the details of your problem sheet.' : 'Build a custom problem sheet to share with friends, for interviews, or for targeted practice.'}
                </p>
            </div>

            <ResizablePanelGroup direction="horizontal" className="rounded-lg border bg-card min-h-[70vh] flex-1">
                <ResizablePanel defaultSize={60}>
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search problems by title..."
                                        className="w-full pl-10 rounded-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-full md:w-[180px] rounded-full">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Categories</SelectItem>
                                        {uniqueCategories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                                    <SelectTrigger className="w-full md:w-[180px] rounded-full">
                                        <SelectValue placeholder="Difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Difficulties</SelectItem>
                                        <SelectItem value="Easy">Easy</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="flex justify-center items-center h-full py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                            ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                             <Checkbox 
                                                checked={isAllFilteredSelected}
                                                onCheckedChange={handleSelectAllFiltered}
                                                aria-label="Select all filtered problems"
                                             />
                                        </TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Difficulty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProblems.map((problem) => (
                                        <TableRow key={problem.id} data-state={selectedProblemIds.has(problem.id) ? "selected" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedProblemIds.has(problem.id)}
                                                    onCheckedChange={() => handleToggleProblem(problem.id)}
                                                    aria-label={`Select ${problem.title}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{problem.title}</TableCell>
                                            <TableCell><Badge variant="secondary">{problem.categoryName}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                    {problem.difficulty}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            )}
                            {!loading && filteredProblems.length === 0 && (
                                 <div className="text-center py-12">
                                    <p className="text-muted-foreground">No problems found for the selected criteria.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                   <Card className="h-full flex flex-col border-0 shadow-none rounded-none">
                        <CardHeader>
                            <CardTitle>{formMode === 'edit' ? 'Editing Sheet' : 'Your New Sheet'}</CardTitle>
                            <CardDescription>Select problems from the list to add them here.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            <Input
                                placeholder="Enter sheet name..."
                                value={sheetName}
                                onChange={(e) => setSheetName(e.target.value)}
                                className="rounded-full"
                            />
                            <Textarea
                                placeholder="Enter a short description..."
                                value={sheetDescription}
                                onChange={(e) => setSheetDescription(e.target.value)}
                                className="h-24 rounded-lg"
                            />
                            <p className="text-sm font-medium text-muted-foreground">
                                Selected Problems ({selectedProblems.length})
                            </p>
                            <ScrollArea className="flex-1 border rounded-md p-2">
                                {selectedProblems.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedProblems.map(problem => (
                                            <div key={problem.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{problem.title}</span>
                                                    <span className="text-xs text-muted-foreground">{problem.categoryName}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleProblem(problem.id)}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                                        <ClipboardList className="h-10 w-10 mb-4" />
                                        <p className="font-medium">Your sheet is empty</p>
                                        <p className="text-sm">Check problems on the left to add them.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveSheet} disabled={isSaving} className="w-full">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {formMode === 'edit' ? 'Save Changes' : 'Create & Share Sheet'}
                            </Button>
                        </CardFooter>
                   </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
        </main>
    );
}

export default function CreateProblemSheetPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center flex-1">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <CreateProblemSheetClient />
        </Suspense>
    );
}
