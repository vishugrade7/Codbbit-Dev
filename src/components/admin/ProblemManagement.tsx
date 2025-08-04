

"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, ProblemLayoutComponent } from "@/types";
import Image from "next/image";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import mermaid from "mermaid";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { upsertProblemToFirestore, bulkUpsertProblemsFromJSON, addCategory, getProblemCategories, updateCategoryDetails, deleteCategory, deleteProblemFromFirestore, bulkUpdateProblemCategory } from "@/app/upload-problem/actions";
import { testApexProblem } from "@/app/salesforce/actions";
import { problemFormSchema } from "@/lib/admin-schemas";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, UploadCloud, Edit, Search, GripVertical, Building, Download, ClipboardPaste, TestTube2, CheckCircle2, AlertTriangle, Replace, FileJson } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "../ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type ProblemWithCategory = Problem & { categoryName: string };
type CompanySuggestion = {
  name: string;
  domain: string;
  logo: string;
};
type TestFailureDetails = {
    methodName: string;
    message: string;
    stackTrace: string;
};


const CompanySuggestionItem = ({ suggestion, onClick }: { suggestion: CompanySuggestion, onClick: (suggestion: CompanySuggestion) => void }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <li>
      <button
        type="button"
        className="flex items-center w-full text-left px-3 py-2.5 cursor-pointer hover:bg-accent"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick(suggestion);
        }}
      >
        {logoError ? (
          <div className="h-[24px] w-[24px] mr-3 rounded-sm bg-muted flex items-center justify-center shrink-0">
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <Image
            src={suggestion.logo}
            alt={`${suggestion.name} logo`}
            width={24}
            height={24}
            className="mr-3 rounded-sm shrink-0"
            onError={() => setLogoError(true)}
          />
        )}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-foreground truncate">{suggestion.name}</p>
        </div>
        <p className="text-sm text-muted-foreground ml-4 shrink-0">{suggestion.domain}</p>
      </button>
    </li>
  );
};

const parseCsvToJson = (csv: string): any[] => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotedField = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];

        if (inQuotedField) {
            if (char === '"') {
                if (i + 1 < csv.length && csv[i + 1] === '"') {
                    // It's an escaped quote
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    // It's the end of the quoted field
                    inQuotedField = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotedField = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n' || char === '\r') {
                if (i > 0 && csv[i-1] !== '\n' && csv[i-1] !== '\r') {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
                 if (char === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') {
                    i++; // Handle CRLF
                }
            } else {
                currentField += char;
            }
        }
    }
    // Add the last field and row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    const result = [];

    for (let i = 1; i < rows.length; i++) {
        const line = rows[i];
        if (line.length !== headers.length) continue;

        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            let value: any = line[j]?.trim() || '';

            // Auto-detect and parse complex fields
            try {
                if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                    value = JSON.parse(value);
                } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                    value = value.toLowerCase() === 'true';
                }
            } catch (e) {
                // Keep as string if JSON.parse fails
            }
            obj[header] = value;
        }
        result.push(obj);
    }
    return result;
};


export function ProblemList({ onEdit, onAddNew }: { onEdit: (p: ProblemWithCategory) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isPasteJsonModalOpen, setIsPasteJsonModalOpen] = useState(false);
    const [problemToDelete, setProblemToDelete] = useState<ProblemWithCategory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [testingId, setTestingId] = useState<string | null>(null);
    const [failureDetails, setFailureDetails] = useState<TestFailureDetails | null>(null);
    const [isChangeCategoryOpen, setIsChangeCategoryOpen] = useState(false);

    const fetchProblems = useCallback(async () => {
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
    }, [toast]);

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    const handleDeleteConfirm = async () => {
        if (!problemToDelete) return;
        setIsDeleting(true);
        const result = await deleteProblemFromFirestore(problemToDelete.id, problemToDelete.categoryName);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            fetchProblems();
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(problemToDelete.id);
                return newSet;
            });
        } else {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
        }
        setIsDeleting(false);
        setProblemToDelete(null);
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        const promises = Array.from(selectedIds).map(id => {
            const problem = problems.find(p => p.id === id);
            if (problem) {
                return deleteProblemFromFirestore(problem.id, problem.categoryName);
            }
            return Promise.resolve({ success: false, error: `Problem with ID ${id} not found.` });
        });

        const results = await Promise.all(promises);
        const successfulDeletes = results.filter(r => r.success).length;
        const failedDeletes = results.length - successfulDeletes;

        if (successfulDeletes > 0) {
            toast({ title: "Success!", description: `${successfulDeletes} problem(s) deleted.` });
            fetchProblems();
            setSelectedIds(new Set());
        }

        if (failedDeletes > 0) {
            toast({ variant: 'destructive', title: "Some Deletions Failed", description: `${failedDeletes} problem(s) could not be deleted.` });
        }
        setIsDeleting(false);
    };


    const handleBulkUploadClick = () => {
        fileInputRef.current?.click();
    };

    const processAndTestProblems = async (data: any) => {
        if (!authUser) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to test problems.' });
            return;
        }

        const problemsData = Array.isArray(data) ? data : [data];

        setIsUploading(true);
        let successes = 0;
        let failures = 0;
        
        for (const problem of problemsData) {
            try {
                toast({ title: `Testing "${problem.title}"...`, description: 'This may take a moment.' });
                const testResult = await testApexProblem(authUser.uid, problem);
                
                if (testResult.success) {
                    const upsertData: z.infer<typeof problemFormSchema> = {
                        ...problem,
                        hints: problem.hints?.map((h: string) => ({ value: h })) || [],
                        isTested: true,
                    };
                    const upsertResult = await upsertProblemToFirestore(upsertData);
                    if (upsertResult.success) {
                        successes++;
                        toast({ title: 'Test Passed & Saved', description: `"${problem.title}" was added successfully.` });
                    } else {
                        failures++;
                        toast({ variant: 'destructive', title: 'Save Failed', description: `"${problem.title}" passed tests but failed to save: ${upsertResult.error}` });
                    }
                } else {
                    failures++;
                    setFailureDetails({
                        methodName: testResult.failureDetails?.methodName || 'Unknown Method',
                        message: testResult.message,
                        stackTrace: testResult.failureDetails?.stackTrace || 'No stack trace provided.'
                    });
                }
            } catch (error: any) {
                failures++;
                toast({ variant: 'destructive', title: `Error processing "${problem.title}"`, description: error.message, duration: 9000 });
            }
        }
        
        toast({ title: 'Upload Complete', description: `${successes} succeeded, ${failures} failed.` });
        fetchProblems();
        setIsUploading(false);
    };
    
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            let jsonData;

            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                jsonData = JSON.parse(content);
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                jsonData = parseCsvToJson(content);
            } else {
                throw new Error("Unsupported file type. Please upload a .json or .csv file.");
            }
            
            await processAndTestProblems(jsonData);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not process the file.', duration: 9000 });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const getSampleData = (forCSV = false) => {
      const examples = [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }];
      const hints = ["A really simple way to solve this is using a HashMap to store the numbers you've seen and their indices."];

      const baseData = {
          title: "Sample Problem: Two Sum",
          description: "Given an array of integers `nums` and an integer `target`,\nreturn indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.",
          category: "Arrays & Hashing",
          difficulty: "Easy",
          metadataType: "Class",
          triggerSObject: "",
          sampleCode: "public class Solution {\\n    public List<Integer> twoSum(List<Integer> nums, Integer target) {\\n        // Your code here\\n    }\\n}",
          testcases: "@isTest\\nprivate class SolutionTest {\\n    @isTest\\n    static void testTwoSum_basic() {\\n        Solution s = new Solution();\\n        List<Integer> result = s.twoSum(new List<Integer>{2, 7, 11, 15}, 9);\\n        System.assertEquals(new List<Integer>{0, 1}, result);\\n    }\\n}",
          company: "Google",
          companyLogoUrl: "https://logo.clearbit.com/google.com",
          isPremium: false,
          imageUrl: "",
          mermaidDiagram: "",
          displayOrder: ["description", "image", "mermaid"],
          isTested: false,
      };

      if (forCSV) {
          return {
              ...baseData,
              examples: JSON.stringify(examples),
              hints: JSON.stringify(hints),
              displayOrder: JSON.stringify(baseData.displayOrder)
          }
      }

      return { ...baseData, examples, hints };
    };

    const handleDownloadSampleJson = () => {
        const sampleData = [getSampleData(false)];
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(sampleData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "problem_sample.json";
        link.click();
    };

    const handleDownloadSelectedJson = () => {
        if (selectedIds.size === 0) {
            toast({ variant: 'destructive', title: 'No problems selected' });
            return;
        }

        const selectedProblemsData = problems
            .filter(p => selectedIds.has(p.id))
            .map(p => {
                // Convert to the format expected by the sample/bulk upload
                const { categoryName, ...rest } = p;
                return {
                    ...rest,
                    category: categoryName,
                    hints: p.hints || [],
                    examples: p.examples.map(({ id, ...ex }) => ex) // remove react key id
                };
            });
        
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(selectedProblemsData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "selected_problems.json";
        link.click();
    };

    const handleDownloadSampleCsv = () => {
        const sample = getSampleData(true);
        const headers = Object.keys(sample);
        const values = headers.map(header => {
            const value = (sample as any)[header];
            // Enclose in quotes if it contains commas, quotes, or newlines
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + values.join(',');
        const link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "problem_sample.csv";
        link.click();
    };


    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter]);

    const isAllFilteredSelected = useMemo(() => {
        if (filteredProblems.length === 0) return false;
        const filteredIds = new Set(filteredProblems.map(p => p.id));
        const selectedFilteredCount = Array.from(selectedIds).filter(id => filteredIds.has(id)).length;

        if (selectedFilteredCount === 0) return false;
        if (selectedFilteredCount === filteredProblems.length) return true;
        return 'indeterminate';
    }, [filteredProblems, selectedIds]);

    const handleToggleAll = useCallback((checked: boolean | 'indeterminate') => {
        const newSet = new Set(selectedIds);
        if (checked === true) {
            filteredProblems.forEach(p => newSet.add(p.id));
        } else {
            filteredProblems.forEach(p => newSet.delete(p.id));
        }
        setSelectedIds(newSet);
    }, [selectedIds, filteredProblems]);

    const handleTestProblem = async (problem: ProblemWithCategory) => {
        if (!authUser) {
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        setTestingId(problem.id);
        const result = await testApexProblem(authUser.uid, problem);
        if (result.success) {
            const updateResult = await upsertProblemToFirestore({ ...problem, hints: problem.hints?.map(h => ({ value: h })), isTested: true });
            if (updateResult.success) {
                toast({ title: `Test Passed for "${problem.title}"`, description: "Problem marked as tested." });
                fetchProblems();
            } else {
                toast({ variant: 'destructive', title: `Test Passed, but Save Failed`, description: updateResult.error });
            }
        } else {
            setFailureDetails({
                methodName: result.failureDetails?.methodName || 'Unknown Method',
                message: result.message,
                stackTrace: result.failureDetails?.stackTrace || 'No stack trace provided.'
            });
        }
        setTestingId(null);
    };

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-[#1ca350]/20 text-[#1ca350] border-[#1ca350]/30';
          case 'medium': return 'bg-primary/20 text-primary border-primary/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Problem Management</CardTitle>
                    <CardDescription>
                        View, edit, or add new Apex coding challenges to the platform.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                     <Button onClick={() => setIsManageModalOpen(true)} variant="secondary">
                        <Edit className="mr-2 h-4 w-4" />
                        Manage Categories
                    </Button>
                     <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4"/>
                                Download Sample
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleDownloadSampleJson}>Sample.json</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDownloadSampleCsv}>Sample.csv</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => setIsPasteJsonModalOpen(true)} variant="outline">
                        <ClipboardPaste className="mr-2 h-4 w-4" />
                        Paste JSON
                    </Button>
                    <Button onClick={handleBulkUploadClick} variant="outline" disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Bulk Upload
                    </Button>
                    <Button onClick={onAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Problem
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json,.csv" className="hidden" disabled={isUploading} />
                <AddCategoryModal isOpen={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen} onCategoryAdded={fetchProblems} />
                <ManageCategoriesModal isOpen={isManageModalOpen} onOpenChange={setIsManageModalOpen} onCategoriesUpdated={fetchProblems} />
                <PasteJsonModal isOpen={isPasteJsonModalOpen} onOpenChange={setIsPasteJsonModalOpen} onUploadAndTest={processAndTestProblems} />
                <TestFailureDialog failureDetails={failureDetails} onOpenChange={() => setFailureDetails(null)} />
                <ChangeCategoryDialog
                    isOpen={isChangeCategoryOpen}
                    onOpenChange={setIsChangeCategoryOpen}
                    selectedProblemIds={Array.from(selectedIds)}
                    onSuccess={() => {
                        fetchProblems();
                        setSelectedIds(new Set());
                    }}
                />
                <AlertDialog open={!!problemToDelete} onOpenChange={(open) => !open && setProblemToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the problem
                                "{problemToDelete?.title}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="flex flex-col md:flex-row gap-4 mt-4 border-t pt-6">
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

                 {selectedIds.size > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedIds.size} problem(s) selected</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsChangeCategoryOpen(true)}>
                                <Replace className="mr-2 h-4 w-4" /> Change Category
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadSelectedJson}>
                                <FileJson className="mr-2 h-4 w-4" /> Export as JSON
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Selected
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete {selectedIds.size} problem(s). This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Confirm Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )}
                
                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : filteredProblems.length > 0 ? (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={isAllFilteredSelected}
                                                onCheckedChange={handleToggleAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Difficulty</TableHead>
                                        <TableHead>Tested</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProblems.map((problem) => (
                                        <TableRow key={problem.id} data-state={selectedIds.has(problem.id) && "selected"}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(problem.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedIds(prev => {
                                                            const newSet = new Set(prev);
                                                            if (checked) {
                                                                newSet.add(problem.id);
                                                            } else {
                                                                newSet.delete(problem.id);
                                                            }
                                                            return newSet;
                                                        });
                                                    }}
                                                    aria-label={`Select row ${problem.title}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{problem.title}</TableCell>
                                            <TableCell>{problem.categoryName}</TableCell>
                                            <TableCell>
                                                <UiBadge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                    {problem.difficulty}
                                                </UiBadge>
                                            </TableCell>
                                            <TableCell>
                                                {problem.isTested && <CheckCircle2 className="h-5 w-5 text-[#1ca350]" />}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <GripVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleTestProblem(problem)} disabled={testingId === problem.id}>
                                                            {testingId === problem.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                                                            <span>Test</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => onEdit(problem)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setProblemToDelete(problem)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                </div>
            </CardContent>
        </Card>
    );
}

function ChangeCategoryDialog({ isOpen, onOpenChange, selectedProblemIds, onSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedProblemIds: string[], onSuccess: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchCats = async () => {
                setLoadingCategories(true);
                try {
                    const data = await getProblemCategories();
                    setCategories(data.map(c => c.name));
                } catch {
                    toast({ variant: 'destructive', title: "Could not load categories" });
                }
                setLoadingCategories(false);
            };
            fetchCats();
        }
    }, [isOpen, toast]);
    
    const handleSave = async () => {
        if (!newCategory) {
            toast({ variant: 'destructive', title: "Please select a category." });
            return;
        }
        setIsSaving(true);
        const result = await bulkUpdateProblemCategory(selectedProblemIds, newCategory);
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            onSuccess();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Category</DialogTitle>
                    <DialogDescription>
                        Move {selectedProblemIds.length} selected problem(s) to a new category.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Select value={newCategory} onValueChange={setNewCategory} disabled={loadingCategories}>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select a new category"} />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !newCategory}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Move Problems
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TestFailureDialog({ failureDetails, onOpenChange }: { failureDetails: TestFailureDetails | null, onOpenChange: () => void }) {
    if (!failureDetails) return null;

    return (
        <Dialog open={!!failureDetails} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        Test Execution Failed
                    </DialogTitle>
                    <DialogDescription>
                        The sample code failed to pass the provided test cases.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-sm">Failing Method</h4>
                        <p className="mt-1 text-sm font-mono p-2 bg-muted rounded-md">{failureDetails.methodName}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Error Message</h4>
                        <p className="mt-1 text-sm font-mono p-2 bg-muted rounded-md">{failureDetails.message}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Stack Trace</h4>
                        <pre className="mt-1 text-xs font-mono p-2 bg-muted rounded-md whitespace-pre-wrap">{failureDetails.stackTrace}</pre>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onOpenChange}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PasteJsonModal({ isOpen, onOpenChange, onUploadAndTest }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onUploadAndTest: (data: any) => Promise<void> }) {
    const [jsonContent, setJsonContent] = useState("");

    const handleUpload = async () => {
        if (!jsonContent.trim()) {
            return;
        }
        try {
            const jsonData = JSON.parse(jsonContent);
            await onUploadAndTest(jsonData);
            onOpenChange(false);
            setJsonContent("");
        } catch (error) {
            console.error("Invalid JSON:", error);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Paste and Upload JSON</DialogTitle>
                    <DialogDescription>Paste an array of problem objects in JSON format below.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        placeholder='[{"title": "My Problem", ...}]'
                        className="h-64 font-mono"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleUpload}>
                        Test & Upload
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCategoryModal({ isOpen, onOpenChange, onCategoryAdded }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onCategoryAdded: () => void }) {
    const [categoryName, setCategoryName] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!categoryName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Category name cannot be empty.' });
            return;
        }
        setIsSaving(true);
        const result = await addCategory(categoryName, imageUrl);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            setCategoryName("");
            setImageUrl("");
            onCategoryAdded();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>Enter the name for the new problem category.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                            id="category-name"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="e.g., SOQL"
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label htmlFor="category-image-url">Image URL (Optional)</Label>
                        <Input
                            id="category-image-url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://placehold.co/600x400.png"
                            className="mt-2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !categoryName.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Category
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type EditableCategory = {
    originalName: string;
    name: string;
    imageUrl?: string;
    problemCount: number;
}

function ManageCategoriesModal({ isOpen, onOpenChange, onCategoriesUpdated }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onCategoriesUpdated: () => void }) {
    const { toast } = useToast();
    const [editableCategories, setEditableCategories] = useState<EditableCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingState, setSavingState] = useState<{ [key: string]: boolean }>({});


    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProblemCategories();
            setEditableCategories(data.map(c => ({...c, originalName: c.name })));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to load categories.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen, fetchCategories]);
    
    const handleFieldChange = (index: number, field: 'name' | 'imageUrl', value: string) => {
        const updated = [...editableCategories];
        updated[index] = { ...updated[index], [field]: value };
        setEditableCategories(updated);
    };

    const handleSave = async (index: number) => {
        const category = editableCategories[index];
        setSavingState(prev => ({...prev, [category.originalName]: true}));
        
        const result = await updateCategoryDetails(category.originalName, category.name, category.imageUrl || '');
        if (result.success) {
            toast({ title: "Success", description: result.message });
            onCategoriesUpdated();
            // Refetch to get the latest state including new original names
            fetchCategories();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setSavingState(prev => ({...prev, [category.originalName]: false}));
    };
    
    const handleDelete = async (categoryName: string) => {
        const result = await deleteCategory(categoryName);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            fetchCategories();
            onCategoriesUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>Edit names, image URLs, or delete empty categories.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-4">
                            {editableCategories.map((cat, index) => (
                                <div key={cat.originalName} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Label htmlFor={`name-${index}`} className="text-xs">Category Name</Label>
                                                <Input
                                                    id={`name-${index}`}
                                                    value={cat.name}
                                                    onChange={e => handleFieldChange(index, 'name', e.target.value)}
                                                    placeholder="Category Name"
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-auto pb-2 whitespace-nowrap">({cat.problemCount} problems)</p>
                                        </div>
                                         <div>
                                            <Label htmlFor={`url-${index}`} className="text-xs">Image URL</Label>
                                            <Input
                                                id={`url-${index}`}
                                                value={cat.imageUrl}
                                                onChange={e => handleFieldChange(index, 'imageUrl', e.target.value)}
                                                placeholder="Image URL"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" onClick={() => handleSave(index)} disabled={savingState[cat.originalName]}>
                                            {savingState[cat.originalName] ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save"}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="destructive" disabled={cat.problemCount > 0}>Delete</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the "{cat.name}" category. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(cat.name)}>Continue</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                             {editableCategories.length === 0 && (
                                <p className="text-muted-foreground text-center py-8">No categories found.</p>
                            )}
                        </div>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const DisplayOrderManager = ({ control }: { control: any }) => {
    const { fields, move } = useFieldArray({
        control,
        name: "displayOrder",
    });

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            move(oldIndex, newIndex);
        }
    };
    
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                         <SortableDisplayOrderItem key={field.id} id={field.id} componentType={(field as any).value as ProblemLayoutComponent} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

const SortableDisplayOrderItem = ({ id, componentType }: { id: string, componentType: ProblemLayoutComponent }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const label = useMemo(() => {
        switch (componentType) {
            case 'description': return 'Description';
            case 'image': return 'Image';
            case 'mermaid': return 'Mermaid Diagram';
        }
    }, [componentType]);

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <Button type="button" variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...listeners} {...attributes}>
                <GripVertical className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm">{label}</span>
        </div>
    );
};

const LiveMermaidPreview = ({ chart }: { chart: string }) => {
    const { theme } = useTheme();
    const [svg, setSvg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
        });
    }, [theme]);

    useEffect(() => {
        if (!chart) {
            setSvg('');
            setError('');
            return;
        }

        const renderMermaid = async () => {
            try {
                // Unique ID for each render to avoid conflicts
                const id = `live-mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);
                setSvg(renderedSvg);
                setError('');
            } catch (e: any) {
                setError(e.message);
                setSvg('');
            }
        };

        const timer = setTimeout(renderMermaid, 300); // Debounce rendering
        return () => clearTimeout(timer);

    }, [chart, theme]);


    return (
        <div className="w-full h-full flex items-center justify-center">
            {error ? (
                <div className="p-4 text-destructive bg-destructive/10 rounded-md text-xs font-mono whitespace-pre-wrap w-full">
                    {error}
                </div>
            ) : (
                <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full" />
            )}
        </div>
    );
};


export function ProblemForm({ problem, onClose }: { problem: ProblemWithCategory | null, onClose: () => void }) {
    const { toast } = useToast();
    const { resolvedTheme } = useTheme();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const formMode = problem ? 'edit' : 'add';

    const [companyLogo, setCompanyLogo] = useState<string | null>(problem?.companyLogoUrl || null);
    const [logoError, setLogoError] = useState(false);
    const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(problem?.company || null);

    const form = useForm<z.infer<typeof problemFormSchema>>({
        resolver: zodResolver(problemFormSchema),
    });
    
    useEffect(() => {
        const defaultValues: z.infer<typeof problemFormSchema> = {
            id: problem?.id || undefined,
            title: problem?.title || "",
            description: problem?.description || "",
            category: problem?.categoryName || "",
            difficulty: problem?.difficulty || "Easy",
            metadataType: problem?.metadataType || "Class",
            triggerSObject: problem?.triggerSObject || "",
            sampleCode: problem?.sampleCode || "",
            testcases: problem?.testcases || "",
            examples: problem?.examples?.length ? problem.examples.map(e => ({...e})) : [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }],
            hints: problem?.hints?.length ? problem.hints.map(h => ({ value: h })) : [{value: ""}],
            company: problem?.company || "",
            companyLogoUrl: problem?.companyLogoUrl || "",
            isPremium: problem?.isPremium || false,
            imageUrl: problem?.imageUrl || "",
            mermaidDiagram: problem?.mermaidDiagram || "",
            displayOrder: problem?.displayOrder || ['description', 'image', 'mermaid'],
            isTested: problem?.isTested || false,
        };
        form.reset(defaultValues);
        
        setCompanyLogo(problem?.companyLogoUrl || null);
        setSelectedCompanyName(problem?.company || null);

    }, [problem, form.reset]);

    const metadataTypeValue = form.watch("metadataType");
    const companyValue = form.watch("company");
    const mermaidDiagramValue = form.watch("mermaidDiagram");
    const isPremiumValue = form.watch("isPremium");
    const isTestedValue = form.watch("isTested");

    useEffect(() => {
        if (companyValue !== selectedCompanyName) {
            setCompanyLogo(null);
            setSelectedCompanyName(null);
            form.setValue('companyLogoUrl', '');
        }

        if (!companyValue || companyValue.trim().length < 2 || companyValue === selectedCompanyName) {
            setSuggestions([]);
            setIsSuggestionsOpen(false);
            return;
        }

        const handler = setTimeout(async () => {
            try {
                const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyValue)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data) && data.length > 0) {
                        setSuggestions(data);
                        setIsSuggestionsOpen(true);
                    } else {
                        setSuggestions([]);
                        setIsSuggestionsOpen(false);
                    }
                } else {
                    setSuggestions([]);
                    setIsSuggestionsOpen(false);
                }
            } catch (error) {
                console.error("Failed to fetch company suggestions:", error);
                setSuggestions([]);
                setIsSuggestionsOpen(false);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [companyValue, selectedCompanyName, form]);

    const handleSuggestionClick = (suggestion: CompanySuggestion) => {
        form.setValue('company', suggestion.name, { shouldValidate: true });
        form.setValue('companyLogoUrl', suggestion.logo, { shouldValidate: true });
        setCompanyLogo(suggestion.logo);
        setSelectedCompanyName(suggestion.name);
        setLogoError(false);
        setIsSuggestionsOpen(false);
        setSuggestions([]);
    };

    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        try {
            const data = await getProblemCategories();
            setCategories(data.map(c => c.name));
        } catch (error) {
            toast({ variant: "destructive", title: "Could not load categories." });
        } finally {
            setLoadingCategories(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const { fields: exampleFields, append: appendExample, remove: removeExample } = useFieldArray({ control: form.control, name: "examples" });
    const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({ control: form.control, name: "hints" });

    async function onSubmit(values: z.infer<typeof problemFormSchema>) {
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>{formMode === 'add' ? 'Upload New Problem' : 'Edit Problem'}</CardTitle>
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
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {loadingCategories ? <SelectItem value="loading" disabled>Loading...</SelectItem> : categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="company" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company (Optional)</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        {companyLogo && !logoError ? (
                                                            <Image
                                                                src={companyLogo}
                                                                alt="Company Logo"
                                                                width={20}
                                                                height={20}
                                                                onError={() => setLogoError(true)}
                                                            />
                                                        ) : (
                                                            <Building className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <Input
                                                        placeholder="e.g., Google, Amazon"
                                                        {...field}
                                                        className="pl-10"
                                                        autoComplete="off"
                                                        onFocus={() => companyValue && suggestions.length > 0 && setIsSuggestionsOpen(true)}
                                                        onBlur={() => setIsSuggestionsOpen(false)}
                                                    />
                                                </div>
                                            </FormControl>
                                            {isSuggestionsOpen && suggestions.length > 0 && (
                                                <Card className="absolute z-10 w-full mt-1 bg-popover border-border shadow-lg">
                                                    <CardContent className="p-0">
                                                        <ul className="flex flex-col">
                                                            {suggestions.map((suggestion) => (
                                                                <CompanySuggestionItem key={suggestion.domain} suggestion={suggestion} onClick={handleSuggestionClick} />
                                                            ))}
                                                        </ul>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Premium Problem</FormLabel>
                                        <FormDescription>
                                            Mark this problem as premium content.
                                        </FormDescription>
                                    </div>
                                    <Tabs
                                      defaultValue={isPremiumValue ? 'premium' : 'free'}
                                      onValueChange={(val) => form.setValue('isPremium', val === 'premium')}
                                      className="w-auto"
                                    >
                                      <TabsList>
                                        <TabsTrigger value="free">Free</TabsTrigger>
                                        <TabsTrigger value="premium">Premium</TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                </FormItem>
                            </div>
                             <FormItem>
                                <FormLabel>Content Display Order</FormLabel>
                                <DisplayOrderManager control={form.control} />
                                <FormDescription>Drag to reorder how the main content appears on the problem page.</FormDescription>
                            </FormItem>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (HTML supported)</FormLabel>
                                    <FormControl><Textarea placeholder="Provide a detailed description of the problem..." {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image URL (Optional)</FormLabel>
                                    <FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField
                                control={form.control}
                                name="mermaidDiagram"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mermaid Diagram (Optional)</FormLabel>
                                        <ResizablePanelGroup direction="horizontal" className="min-h-[300px] max-w-full rounded-lg border">
                                            <ResizablePanel defaultSize={50}>
                                                <FormControl className="h-full">
                                                    <Textarea 
                                                        placeholder={'graph TD;\n    A-->B;'} 
                                                        {...field} 
                                                        className="font-mono h-full w-full resize-none border-none rounded-none focus-visible:ring-0 p-2"
                                                    />
                                                </FormControl>
                                            </ResizablePanel>
                                            <ResizableHandle withHandle />
                                            <ResizablePanel defaultSize={50}>
                                                <div className="flex flex-col h-full bg-muted/30">
                                                    <p className="p-2.5 text-xs font-semibold text-muted-foreground border-b">Live Preview</p>
                                                    <div className="flex-1 p-4 overflow-auto">
                                                        <LiveMermaidPreview chart={mermaidDiagramValue} />
                                                    </div>
                                                </div>
                                            </ResizablePanel>
                                        </ResizablePanelGroup>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="difficulty" render={({ field }) => (
                                    <FormItem><FormLabel>Difficulty</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="metadataType" render={({ field }) => (
                                    <FormItem><FormLabel>Metadata Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Class">Class</SelectItem><SelectItem value="Trigger">Trigger</SelectItem><SelectItem value="Test Class">Test Class</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                {metadataTypeValue === 'Trigger' && (
                                     <FormField control={form.control} name="triggerSObject" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trigger SObject</FormLabel>
                                            <FormControl><Input placeholder="e.g., Account, Contact" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Code & Tests</CardTitle>
                            <CardDescription>Provide starter code and test cases.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResizablePanelGroup direction="horizontal" className="min-h-[40rem] max-w-full rounded-lg border">
                                <ResizablePanel defaultSize={50}>
                                    <FormField
                                        control={form.control}
                                        name="sampleCode"
                                        render={({ field }) => (
                                        <FormItem className="h-full flex flex-col">
                                            <FormLabel className="p-2.5 font-semibold">Sample Code</FormLabel>
                                            <Separator />
                                            <FormControl className="flex-1">
                                                <div className="h-full">
                                                    <MonacoEditor
                                                        height="100%"
                                                        language="java"
                                                        value={field.value}
                                                        onChange={(value) => field.onChange(value || "")}
                                                        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                                        options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)'}}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="p-2 text-xs" />
                                        </FormItem>
                                        )}
                                    />
                                </ResizablePanel>
                                <ResizableHandle withHandle />
                                <ResizablePanel defaultSize={50}>
                                    <FormField
                                        control={form.control}
                                        name="testcases"
                                        render={({ field }) => (
                                        <FormItem className="h-full flex flex-col">
                                            <FormLabel className="p-2.5 font-semibold">Test Cases</FormLabel>
                                            <Separator />
                                            <FormControl className="flex-1">
                                                <div className="h-full">
                                                    <MonacoEditor
                                                        height="100%"
                                                        language="java"
                                                        value={field.value}
                                                        onChange={(value) => field.onChange(value || "")}
                                                        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                                        options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)'}}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="p-2 text-xs" />
                                        </FormItem>
                                        )}
                                    />
                                </ResizablePanel>
                            </ResizablePanelGroup>
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
                            {formMode === 'add' ? 'Upload Problem' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
