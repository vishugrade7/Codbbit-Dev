
"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Problem, ApexProblemsData } from "@/types";
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, ClipboardList, X } from "lucide-react";


type ProblemWithCategory = Problem & { categoryName: string };

export default function ProblemSheetsPage() {
    const { toast } = useToast();
    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");

    const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(new Set());
    const [sheetName, setSheetName] = useState("");
    
    useEffect(() => {
        const fetchProblems = async () => {
            setLoading(true);
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data().Category as ApexProblemsData;
                    const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );
                    setAllProblems(problems);
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
        return allProblems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProblems, searchTerm, difficultyFilter]);

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
    
    const handleCreateSheet = () => {
        if (!sheetName) {
            toast({ variant: "destructive", title: "Sheet name is required." });
            return;
        }
        if (selectedProblems.length === 0) {
            toast({ variant: "destructive", title: "Add at least one problem to the sheet." });
            return;
        }
        toast({ title: "Coming Soon!", description: "Sheet creation functionality will be implemented soon." });
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1 container py-8">
                 <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Problem Sheets</h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl">
                        Create custom problem sheets to share with friends, for interviews, or for targeted practice.
                    </p>
                </div>

                <ResizablePanelGroup direction="horizontal" className="rounded-lg border bg-card min-h-[70vh]">
                    <ResizablePanel defaultSize={60}>
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b">
                                <div className="flex flex-col md:flex-row gap-4">
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
                                <CardTitle>New Problem Sheet</CardTitle>
                                <CardDescription>Select problems from the list to add them here.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                                <Input
                                    placeholder="Enter sheet name..."
                                    value={sheetName}
                                    onChange={(e) => setSheetName(e.target.value)}
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
                                <Button className="w-full" onClick={handleCreateSheet}>
                                    Create & Share Sheet
                                </Button>
                            </CardFooter>
                       </Card>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
            <Footer />
        </div>
    );
}

