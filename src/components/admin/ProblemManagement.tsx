

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot, Timestamp, collection, getDocs, deleteDoc, addDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { Problem, ApexProblemsData, Course, User as AppUser, NavLink, Badge, Module, Lesson, ContentBlock } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { 
    upsertProblemToFirestore, 
    bulkUpsertProblemsFromJSON, 
    deleteProblemFromFirestore, 
    addCategory, 
    getProblemCategories, 
    updateCategoryDetails, 
    deleteCategory,
    upsertCourseToFirestore,
    deleteCourseFromFirestore,
    getAllUsers,
    setAdminStatus,
    getNavigationSettings,
    updateNavigationSettings,
    getBadges,
    upsertBadge,
    deleteBadge,
    updateBrandingSettings,
    getPricingPlans,
    updatePricingPlans,
    bulkUpdateProblems
} from "@/app/upload-problem/actions";
import { validateProblemInSalesforce } from '@/app/salesforce/actions';
import { problemFormSchema, courseFormSchema, navLinksSchema, badgeFormSchema, pricingSettingsSchema, voucherSchema } from '@/lib/admin-schemas';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from "date-fns";


import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Upload, Trash, Pencil, Search, Image as ImageIcon, MoreHorizontal, Download, FileJson2, Edit, GripVertical, Palette, IndianRupee, DollarSign, Calendar as CalendarIcon, TestTube2, Layers, Award, AppWindow, icons, ChevronsUpDown, Check, Code, BookOpen, BrainCircuit, MousePointerClick, Video } from "lucide-react";
import { ProblemForm } from '@/app/upload-problem/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import shortid from 'shortid';
import Image from 'next/image';
import { Progress } from '../ui/progress';


type ProblemWithCategoryName = Problem & { categoryName: string };

type AdminContextType = {
    problemsByCategory: { [category: string]: Problem[] };
    allProblems: ProblemWithCategoryName[];
    categories: Awaited<ReturnType<typeof getProblemCategories>>;
    loading: boolean;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [problemsByCategory, setProblemsByCategory] = useState<{ [category: string]: Problem[] }>({});
    const [allProblems, setAllProblems] = useState<ProblemWithCategoryName[]>([]);
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getProblemCategories>>>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (userData === null && user) {
            setLoading(true);
        } else if (!user || !userData?.isAdmin) {
             router.replace('/');
        }
    }, [user, userData, router]);
    
    // Fetch all problems and categories at once
    useEffect(() => {
        if (!db || !user || !userData?.isAdmin) return;

        setLoading(true);
        const apexDocRef = doc(db, "problems", "Apex");
        const unsubscribe = onSnapshot(apexDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data().Category as ApexProblemsData;
                const problemMap: { [category: string]: Problem[] } = {};
                const flatProblems: ProblemWithCategoryName[] = [];
                
                const categoryList = Object.entries(data).map(([name, details]) => {
                    const questions = details.Questions || [];
                    problemMap[name] = questions;
                    questions.forEach(q => flatProblems.push({ ...q, categoryName: name }));

                    return {
                        name,
                        imageUrl: details.imageUrl || '',
                        problemCount: questions.length
                    };
                }).sort((a,b) => a.name.localeCompare(b.name));
                
                setProblemsByCategory(problemMap);
                setAllProblems(flatProblems);
                setCategories(categoryList);
            } else {
                setProblemsByCategory({});
                setAllProblems([]);
                setCategories([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching problems data:", error);
            setProblemsByCategory({});
            setAllProblems([]);
            setCategories([]);
            setLoading(false);
        });
        
        return unsubscribe;
    }, [user, userData?.isAdmin]);

    const value = {
        problemsByCategory,
        allProblems,
        categories,
        loading,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

// #region Sub-components
const CategoryManager = ({ onSelectCategory, activeCategory }: { onSelectCategory: (name: string) => void; activeCategory: string | null }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { categories, loading, problemsByCategory } = useAdmin();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newImageUrl, setNewImageUrl] = useState("");
    const [editingCategory, setEditingCategory] = useState<Awaited<ReturnType<typeof getProblemCategories>>[0] | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleAddCategory = async () => {
        if (!user || !newCategoryName) return;
        setIsSubmitting(true);
        const result = await addCategory(user.uid, newCategoryName, newImageUrl);
        if (result.success) {
            toast({ title: "Category added!" });
            setIsAddOpen(false);
            setNewCategoryName("");
            setNewImageUrl("");
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    };

    const handleUpdateCategory = async () => {
        if (!user || !editingCategory || !newCategoryName) return;
        setIsSubmitting(true);
        const result = await updateCategoryDetails(user.uid, editingCategory.name, newCategoryName, newImageUrl);
        if (result.success) {
            toast({ title: "Category updated!" });
            setIsEditOpen(false);
            setEditingCategory(null);
            setNewCategoryName("");
            setNewImageUrl("");
            if (activeCategory === editingCategory.name && editingCategory.name !== newCategoryName) {
                onSelectCategory(newCategoryName);
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const handleDeleteCategory = async (categoryName: string) => {
        if (!user) return;
        setIsSubmitting(true);
        const result = await deleteCategory(user.uid, categoryName);
        if (result.success) {
            toast({ title: "Category deleted!" });
            if (activeCategory === categoryName) {
                onSelectCategory(categories.length > 1 ? categories.filter(c => c.name !== categoryName)[0].name : "");
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Manage Categories</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>Add, edit, or remove problem categories.</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-2">
                        {categories.map(category => (
                            <li key={category.name} className="flex items-center justify-between p-2 rounded-md border">
                                <span className="font-medium">{category.name} ({problemsByCategory[category.name]?.length || 0})</span>
                                <div className='flex items-center gap-2'>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                        setEditingCategory(category);
                                        setNewCategoryName(category.name);
                                        setNewImageUrl(category.imageUrl);
                                        setIsEditOpen(true);
                                    }}><Pencil className="h-4 w-4" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the category and all problems within it. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteCategory(category.name)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <DialogFooter>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Category</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category-name" className="text-right">Name</Label>
                                    <Input id="category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="image-url" className="text-right">Image URL</Label>
                                    <Input id="image-url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleAddCategory} disabled={isSubmitting}>{isSubmitting ? <Loader2 className='animate-spin'/> : 'Save'}</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                    {/* Edit Dialog */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Edit Category: {editingCategory?.name}</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-category-name" className="text-right">Name</Label>
                                    <Input id="edit-category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-image-url" className="text-right">Image URL</Label>
                                    <Input id="edit-image-url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleUpdateCategory} disabled={isSubmitting}>{isSubmitting ? <Loader2 className='animate-spin'/> : 'Update'}</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const BulkEditDialog = ({ 
    problemIds, 
    categories,
    onClose,
}: { 
    problemIds: string[], 
    categories: string[],
    onClose: () => void,
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [newCategory, setNewCategory] = useState<string | undefined>();
    const [newDifficulty, setNewDifficulty] = useState<string | undefined>();
    const [newIsPremium, setNewIsPremium] = useState<boolean | undefined>();

    const handleBulkUpdate = async () => {
        if (!user || problemIds.length === 0) return;
        if (newCategory === undefined && newDifficulty === undefined && newIsPremium === undefined) {
            toast({ variant: 'destructive', title: 'No changes selected', description: 'Please select a field to update.' });
            return;
        }

        setIsUpdating(true);
        const result = await bulkUpdateProblems(user.uid, problemIds, {
            categoryName: newCategory,
            difficulty: newDifficulty as any,
            isPremium: newIsPremium,
        });

        if (result.success) {
            toast({ title: 'Bulk update successful!', description: `${problemIds.length} problems have been updated.` });
            onClose();
        } else {
            toast({ variant: 'destructive', title: 'Bulk update failed', description: result.error });
        }
        setIsUpdating(false);
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Edit Problems</DialogTitle>
                    <DialogDescription>
                        Update {problemIds.length} selected problem(s). Only fill the fields you want to change.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>New Category</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                            <SelectTrigger><SelectValue placeholder="- No Change -" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>New Difficulty</Label>
                        <Select value={newDifficulty} onValueChange={setNewDifficulty}>
                            <SelectTrigger><SelectValue placeholder="- No Change -" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>New Premium Status</Label>
                        <Select value={newIsPremium === undefined ? undefined : String(newIsPremium)} onValueChange={(val) => setNewIsPremium(val === 'true' ? true : val === 'false' ? false : undefined)}>
                            <SelectTrigger><SelectValue placeholder="- No Change -" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Premium</SelectItem>
                                <SelectItem value="false">Not Premium</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleBulkUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Update Problems
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const ProblemList = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { problemsByCategory, categories, loading: contextLoading } = useAdmin();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testResult, setTestResult] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    
    const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].name);
        } else if (categories.length === 0 && activeCategory) {
            setActiveCategory(null);
        }
    }, [categories, activeCategory]);

    const problems = useMemo(() => {
        if (!activeCategory) return [];
        return problemsByCategory[activeCategory] || [];
    }, [problemsByCategory, activeCategory]);

    const handleUpsertProblem = async (values: z.infer<typeof problemFormSchema>) => {
        if (!user) return;
        setLoading(true);
        const { categoryName, ...problemData } = values;

        const result = await upsertProblemToFirestore(user.uid, categoryName, problemData);
        if (result.success) {
            toast({ title: `Problem ${editingProblem ? 'updated' : 'added'} successfully!` });
            setIsFormOpen(false);
            setEditingProblem(null);
        } else {
            toast({ variant: 'destructive', title: `Error ${editingProblem ? 'updating' : 'adding'} problem`, description: result.error });
        }
        setLoading(false);
    };

    const handleDeleteProblem = async (problemId: string) => {
        if (!user || !activeCategory) return;
        setLoading(true);
        const result = await deleteProblemFromFirestore(user.uid, activeCategory, problemId);
        if (result.success) {
            toast({ title: 'Problem deleted successfully!' });
        } else {
            toast({ variant: 'destructive', title: 'Error deleting problem', description: result.error });
        }
        setLoading(false);
    };
    
    const handleTestProblem = async (problem: Problem) => {
        if (!user) return;
        setIsTesting(true);
        setTestResult("");
        setIsTestModalOpen(true);
        
        const fullProblem = { ...problem, categoryName: activeCategory! };
        const result = await validateProblemInSalesforce(user.uid, fullProblem);
        
        setTestResult(result.details || result.message);
        setIsTesting(false);
    };
    
    const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !activeCategory) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const problemsJSON = JSON.parse(e.target?.result as string);
                // Schema validation can be added here if needed
                const result = await bulkUpsertProblemsFromJSON(user.uid, activeCategory!, problemsJSON);
                if (result.success) {
                    toast({ title: 'Bulk Upload Successful', description: result.message });
                } else {
                    throw new Error(result.error);
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Invalid JSON file', description: error.message });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadSample = () => {
        const sampleProblem = [{
            id: "sample-problem-1",
            title: "Sample: Add Two Numbers",
            description: "Given two integers, return their sum.",
            difficulty: "Easy",
            metadataType: "Class",
            sampleCode: "public class Solution {\n    public static Integer add(Integer a, Integer b) {\n        // Your code here\n        return null;\n    }\n}",
            testcases: "@isTest\nprivate class SolutionTest {\n    @isTest\n    static void testPositiveNumbers() {\n        System.assertEquals(5, Solution.add(2, 3), 'Test with positive numbers failed.');\n    }\n\n    @isTest\n    static void testNegativeNumbers() {\n        System.assertEquals(-5, Solution.add(-2, -3), 'Test with negative numbers failed.');\n    }\n}",
            examples: [{
                input: "a = 2, b = 3",
                output: "5",
                explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
            }],
            hints: ["Use the '+' operator."],
            isPremium: false
        }];

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(sampleProblem, null, 2)
        )}`;

        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "sample-problems.json";
        link.click();
    };

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter]);
    
    const handleSelectProblem = (problemId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedProblemIds(prev => [...prev, problemId]);
        } else {
            setSelectedProblemIds(prev => prev.filter(id => id !== problemId));
        }
    }
    
    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedProblemIds(filteredProblems.map(p => p.id));
        } else {
            setSelectedProblemIds([]);
        }
    }

    if (isFormOpen) {
        return <ProblemForm 
                    onSubmit={handleUpsertProblem} 
                    isLoading={loading} 
                    categories={categories.map(c => c.name)}
                    initialData={editingProblem ? { ...editingProblem, categoryName: activeCategory! } : { categoryName: activeCategory! } as any}
                    onCancel={() => { setIsFormOpen(false); setEditingProblem(null); }}
                />;
    }
    
    return (
        <div className="space-y-6">
            {isBulkEditOpen && (
                <BulkEditDialog 
                    problemIds={selectedProblemIds}
                    categories={categories.map(c => c.name)}
                    onClose={() => {
                        setIsBulkEditOpen(false);
                        setSelectedProblemIds([]);
                    }}
                />
            )}
            <div>
                <h1 className="text-2xl font-bold">Problem Management</h1>
                <p className="text-muted-foreground">View, edit, or add new Apex coding challenges to the platform.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                     <CategoryManager onSelectCategory={setActiveCategory} activeCategory={activeCategory} />
                </div>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".json" className="hidden" />
                    <Button variant="outline" onClick={handleDownloadSample}><Download className="mr-2 h-4 w-4"/> Download Sample</Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                         Bulk Upload
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)} disabled={!activeCategory}><PlusCircle className="mr-2 h-4 w-4" /> Add New Problem</Button>
                </div>
            </div>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 flex items-center gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search problems..."
                            className="w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                     <Select value={activeCategory ?? ''} onValueChange={(value) => setActiveCategory(value)} disabled={categories.length === 0}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {selectedProblemIds.length > 0 && (
                        <Button variant="outline" onClick={() => setIsBulkEditOpen(true)}>
                            <Layers className="mr-2 h-4 w-4"/>
                            Bulk Edit ({selectedProblemIds.length})
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-full">
                    <Button variant={difficultyFilter === 'All' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDifficultyFilter('All')} className="shadow-sm">All</Button>
                    <Button variant={difficultyFilter === 'Easy' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDifficultyFilter('Easy')}>Easy</Button>
                    <Button variant={difficultyFilter === 'Medium' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDifficultyFilter('Medium')}>Medium</Button>
                    <Button variant={difficultyFilter === 'Hard' ? 'secondary' : 'ghost'} size="sm" onClick={() => setDifficultyFilter('Hard')}>Hard</Button>
                </div>
             </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox 
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    checked={filteredProblems.length > 0 && selectedProblemIds.length === filteredProblems.length}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Premium</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contextLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : filteredProblems.length > 0 ? (
                            filteredProblems.map((problem) => (
                            <TableRow key={problem.id} data-state={selectedProblemIds.includes(problem.id) ? "selected" : ""}>
                                <TableCell>
                                    <Checkbox
                                        onCheckedChange={(checked) => handleSelectProblem(problem.id, checked as boolean)}
                                        checked={selectedProblemIds.includes(problem.id)}
                                        aria-label="Select row"
                                     />
                                </TableCell>
                                <TableCell className="font-medium">{problem.title}</TableCell>
                                <TableCell>{activeCategory}</TableCell>
                                <TableCell>
                                    <UiBadge 
                                        variant='outline' 
                                        className={cn(
                                            problem.difficulty === 'Easy' && 'text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-600/60 dark:bg-green-500/10',
                                            problem.difficulty === 'Medium' && 'text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-600/60 dark:bg-blue-500/10',
                                            problem.difficulty === 'Hard' && 'text-red-600 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-600/60 dark:bg-red-500/10',
                                        )}
                                    >
                                        {problem.difficulty}
                                    </UiBadge>
                                </TableCell>
                                <TableCell>{problem.isPremium ? 'Yes' : 'No'}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setEditingProblem(problem); setIsFormOpen(true); }}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleTestProblem(problem)}>
                                                <TestTube2 className="mr-2 h-4 w-4" /> Test
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash className="mr-2 h-4 w-4" /> 
                                                        Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the problem.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteProblem(problem.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))) : (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No problems found for &quot;{activeCategory}&quot;.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Test Results</DialogTitle>
                        <DialogDescription>Validation results from Salesforce org.</DialogDescription>
                    </DialogHeader>
                    <div className="my-4 max-h-[60vh] overflow-y-auto bg-muted/50 p-4 rounded-md">
                        {isTesting ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Running tests in Salesforce...</span>
                            </div>
                        ) : (
                           <pre className="text-sm text-foreground whitespace-pre-wrap font-code">{testResult}</pre>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsTestModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const CourseForm = ({ initialData, onCancel }: { initialData?: Course; onCancel: () => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { allProblems } = useAdmin();
    
    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: initialData || {
            title: '',
            description: '',
            category: '',
            thumbnailUrl: '',
            isPublished: false,
            isPremium: false,
            modules: [],
        },
    });

    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });

    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = moduleFields.findIndex((m) => m.id === active.id);
            const newIndex = moduleFields.findIndex((m) => m.id === over.id);
            moveModule(oldIndex, newIndex);
        }
    };
    
    const onSubmit = async (data: z.infer<typeof courseFormSchema>) => {
        if (!user) return;
        setIsLoading(true);
        const result = await upsertCourseToFirestore(user.uid, data);
        if (result.success) {
            toast({ title: `Course ${initialData ? 'updated' : 'created'} successfully!` });
            onCancel();
        } else {
            toast({ variant: 'destructive', title: 'Error saving course', description: result.error });
        }
        setIsLoading(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                                <FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="flex items-center gap-8">
                            <FormField control={form.control} name="isPublished" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormLabel>Published</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="isPremium" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormLabel>Premium</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Course Content</CardTitle></CardHeader>
                    <CardContent>
                        <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={handleModuleDragEnd}>
                            <SortableContext items={moduleFields.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4">
                                    {moduleFields.map((module, moduleIndex) => (
                                        <ModuleForm key={module.id} form={form} module={module} moduleIndex={moduleIndex} control={form.control} removeModule={removeModule} allProblems={allProblems} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                        <Button type="button" variant="outline" className="mt-4" onClick={() => appendModule({ id: shortid.generate(), title: `New Module ${moduleFields.length + 1}`, lessons: [] })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Module
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Course'}</Button>
                </div>
            </form>
        </Form>
    );
};

const ModuleForm = ({ form, module, moduleIndex, control, removeModule, allProblems }: { form: any; module: Module; moduleIndex: number; control: any, removeModule: (index: number) => void; allProblems: ProblemWithCategoryName[] }) => {
    const { fields: lessonFields, append: appendLesson, remove: removeLesson, move: moveLesson } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons` });
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });

    const style = { transform: CSS.Transform.toString(transform), transition };
    
    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = lessonFields.findIndex((l) => l.id === active.id);
            const newIndex = lessonFields.findIndex((l) => l.id === over.id);
            moveLesson(oldIndex, newIndex);
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1" className="border-none">
                    <Card className="bg-muted/50">
                        <CardHeader className="flex flex-row items-center p-4">
                            <Button type="button" variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...attributes} {...listeners}><GripVertical className="h-5 w-5" /></Button>
                            <div className="flex-1">
                                <FormField control={control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                                    <Input {...field} className="text-lg font-semibold bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring"/>
                                )} />
                            </div>
                            <AccordionTrigger className="w-auto p-2" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeModule(moduleIndex)}><Trash className="h-4 w-4" /></Button>
                        </CardHeader>
                        <AccordionContent className="p-4 pt-0">
                            <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={handleLessonDragEnd}>
                                <SortableContext items={lessonFields.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {lessonFields.map((lesson, lessonIndex) => (
                                            <LessonForm key={lesson.id} form={form} lesson={lesson} moduleIndex={moduleIndex} lessonIndex={lessonIndex} control={control} removeLesson={removeLesson} allProblems={allProblems} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendLesson({ id: shortid.generate(), title: `New Lesson ${lessonFields.length + 1}`, isFree: false, contentBlocks: [] })}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Add Lesson
                            </Button>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

const LessonForm = ({ form, lesson, moduleIndex, lessonIndex, control, removeLesson, allProblems }: { form: any; lesson: Lesson; moduleIndex: number; lessonIndex: number; control: any, removeLesson: (index: number) => void; allProblems: ProblemWithCategoryName[] }) => {
     const { fields: blockFields, append: appendBlock, remove: removeBlock, move: moveBlock } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks` });
     const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
     const style = { transform: CSS.Transform.toString(transform), transition };
     
     const handleBlockDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = blockFields.findIndex((b) => b.id === active.id);
            const newIndex = blockFields.findIndex((b) => b.id === over.id);
            moveBlock(oldIndex, newIndex);
        }
    };
     
    return (
        <div ref={setNodeRef} style={style} className="ml-8">
             <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1" className="border-none">
                     <Card className="bg-card">
                         <CardHeader className="flex flex-row items-center p-3">
                             <Button type="button" variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...attributes} {...listeners}><GripVertical className="h-5 w-5" /></Button>
                             <div className="flex-1">
                                 <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                                    <Input {...field} className="font-medium bg-transparent border-0 focus-visible:ring-1"/>
                                )}/>
                             </div>
                              <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.isFree`} render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0"><FormLabel className="text-xs">Free</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>
                            )}/>
                            <AccordionTrigger className="w-auto p-2" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLesson(lessonIndex)}><Trash className="h-4 w-4" /></Button>
                         </CardHeader>
                          <AccordionContent className="p-4 pt-0">
                                <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={handleBlockDragEnd}>
                                <SortableContext items={blockFields.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {blockFields.map((block, blockIndex) => (
                                            <ContentBlockForm key={block.id} form={form} block={block} moduleIndex={moduleIndex} lessonIndex={lessonIndex} blockIndex={blockIndex} control={control} removeBlock={removeBlock} allProblems={allProblems} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                             <div className="mt-4">
                                <Button size="sm" variant="outline" type="button" onClick={() => appendBlock({ id: shortid.generate(), type: 'text', content: ''})}><PlusCircle className="mr-2 h-4 w-4"/> Add Text Block</Button>
                             </div>
                         </AccordionContent>
                     </Card>
                </AccordionItem>
            </Accordion>
        </div>
    )
};

const ContentBlockForm = ({ form, block, moduleIndex, lessonIndex, blockIndex, control, removeBlock, allProblems }: { form: any; block: ContentBlock; moduleIndex: number; lessonIndex: number; blockIndex: number; control: any; removeBlock: (index: number) => void; allProblems: ProblemWithCategoryName[] }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const [isProblemSelectorOpen, setIsProblemSelectorOpen] = useState(false);
    
    // Image upload state
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: any) => {
        field.onChange(e);
        if (e.target.value.endsWith('/')) {
            setIsSlashMenuOpen(true);
        } else {
            setIsSlashMenuOpen(false);
        }
    }
    
    const handleSlashCommand = (newType: ContentBlock['type']) => {
        const fieldName = `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}`;
        const currentContent = form.getValues(`${fieldName}.content`);
        const newContent = currentContent.slice(0, -1); // remove the '/'
        
        form.setValue(`${fieldName}.type`, newType);
        form.setValue(`${fieldName}.content`, newContent);

        setIsSlashMenuOpen(false);
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
        const file = e.target.files?.[0];
        if (!file || !storage) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 5MB.' });
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = document.createElement('img');
            img.onload = () => {
                const MAX_WIDTH = 1200;
                const scaleFactor = MAX_WIDTH / img.width;
                const newWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                const newHeight = img.width > MAX_WIDTH ? img.height * scaleFactor : img.height;

                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx?.drawImage(img, 0, 0, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (!blob) return;
                    
                    const storagePath = `course-images/${Date.now()}_${file.name}`;
                    const imageRef = storageRef(storage, storagePath);
                    const uploadTask = uploadBytesResumable(imageRef, blob);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        },
                        (error) => {
                            console.error("Upload failed:", error);
                            toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
                            setUploadProgress(null);
                        },
                        () => {
                            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                                field.onChange(downloadURL);
                                setUploadProgress(null);
                                toast({ title: 'Image uploaded successfully!' });
                            });
                        }
                    );
                }, 'image/jpeg', 0.9);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const blockName = `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}`;
    const blockType = block.type;

    return (
        <div ref={setNodeRef} style={style} className="ml-8 relative group/block">
            <div className="flex items-start gap-2">
                 <Button type="button" variant="ghost" size="icon" className="cursor-grab h-8 w-8 mt-1 text-muted-foreground group-hover/block:opacity-100 opacity-0 transition-opacity" {...attributes} {...listeners}><GripVertical className="h-5 w-5" /></Button>
                 <div className="flex-1">
                    {blockType === 'text' && (
                        <FormField control={control} name={`${blockName}.content`} render={({field}) => (
                           <div className="relative">
                             <Textarea 
                                {...field} 
                                ref={textareaRef}
                                onChange={(e) => handleTextChange(e, field)}
                                placeholder="Type '/' for commands..." 
                                rows={3}
                                className="bg-transparent border-0 focus-visible:ring-0 px-0"
                             />
                             {isSlashMenuOpen && (
                                <Card className="absolute z-10 p-2 shadow-lg">
                                    <p className="text-xs font-semibold px-2 py-1">Add Block</p>
                                    <CommandList>
                                        <CommandItem onSelect={() => handleSlashCommand('image')}><ImageIcon className="mr-2 h-4 w-4"/>Image</CommandItem>
                                        <CommandItem onSelect={() => handleSlashCommand('code')}><Code className="mr-2 h-4 w-4"/>Code</CommandItem>
                                        <CommandItem onSelect={() => handleSlashCommand('video')}><Video className="mr-2 h-4 w-4"/>Video</CommandItem>
                                        <CommandItem onSelect={() => handleSlashCommand('problem')}><BrainCircuit className="mr-2 h-4 w-4"/>Problem</CommandItem>
                                        <CommandItem onSelect={() => handleSlashCommand('interactive')}><MousePointerClick className="mr-2 h-4 w-4"/>Interactive</CommandItem>
                                    </CommandList>
                                </Card>
                             )}
                           </div>
                        )} />
                    )}
                     {blockType === 'image' && (
                         <FormField control={control} name={`${blockName}.content`} render={({ field }) => (
                            <div className="space-y-2">
                                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                                    {field.value && <Image src={field.value} alt="Uploaded image" width={200} height={112} className="mx-auto rounded-md mb-4 object-cover" />}
                                    
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, field)} accept="image/*" className="hidden"/>
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null}>
                                        {uploadProgress !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        {field.value ? 'Change Image' : 'Upload Image'}
                                    </Button>
                                    
                                    {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2 h-2" />}
                                </div>
                                <FormControl>
                                    <Input {...field} placeholder="Image URL (or upload)" className="hidden" />
                                </FormControl>
                                <FormField control={control} name={`${blockName}.caption`} render={({field}) => (
                                    <FormControl><Input {...field} placeholder="Optional image caption" className="bg-transparent border-0 focus-visible:ring-0 text-center"/></FormControl>
                                )} />
                            </div>
                        )} />
                    )}
                     {blockType === 'code' && (
                        <div className="space-y-2 p-2 rounded-md bg-muted/80">
                            <FormField control={control} name={`${blockName}.language`} render={({field}) => <Input {...field} placeholder="Language (e.g. apex)" className="text-xs h-7"/>} />
                             <FormField control={control} name={`${blockName}.content`} render={({field}) => <Textarea {...field} placeholder="Enter code snippet..." rows={8} className="font-mono text-sm leading-relaxed"/>} />
                        </div>
                    )}
                     {blockType === 'video' && (
                        <FormField control={control} name={`${blockName}.content`} render={({field}) => <Input {...field} placeholder="Video URL (YouTube, Vimeo, etc.)"/>} />
                    )}
                    {blockType === 'problem' && (
                        <FormField
                            control={control}
                            name={`${blockName}.content`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <Popover open={isProblemSelectorOpen} onOpenChange={setIsProblemSelectorOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                {field.value ? allProblems.find((p) => p.id === field.value)?.title : "Select problem"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search problems..." />
                                            <CommandEmpty>No problem found.</CommandEmpty>
                                            <CommandList>
                                                <CommandGroup>
                                                    {allProblems.map((problem) => (
                                                        <CommandItem
                                                            value={problem.title}
                                                            key={problem.id}
                                                            onSelect={() => {
                                                                field.onChange(problem.id);
                                                                setIsProblemSelectorOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", problem.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {problem.title}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    {blockType === 'interactive' && (
                        <FormField control={control} name={`${blockName}.content`} render={({field}) => <Textarea {...field} placeholder="Enter embed HTML code..." rows={8}/>} />
                    )}
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-1 text-destructive group-hover/block:opacity-100 opacity-0 transition-opacity" onClick={() => removeBlock(blockIndex)}><Trash className="h-4 w-4" /></Button>
            </div>
        </div>
    )
};

const CourseList = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const coursesRef = collection(db, "courses");
        const unsubscribe = onSnapshot(coursesRef, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching courses:", error);
            setLoading(false);
        });
        return unsubscribe;
    }, []);
    
    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setIsFormOpen(true);
    };

    const handleCreate = () => {
        setEditingCourse(null);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (courseId: string) => {
        if (!user) return;
        const result = await deleteCourseFromFirestore(user.uid, courseId);
        if (result.success) {
            toast({ title: "Course deleted successfully!" });
        } else {
            toast({ variant: 'destructive', title: "Error deleting course", description: result.error });
        }
    };
    
    if (isFormOpen) {
        return <CourseForm initialData={editingCourse || undefined} onCancel={() => setIsFormOpen(false)} />
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold">Course Management</h1>
                    <p className="text-muted-foreground">Manage all courses on the platform.</p>
                </div>
                <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4"/> Create Course</Button>
            </div>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Modules</TableHead>
                            <TableHead>Lessons</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Premium</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : courses.length > 0 ? (
                            courses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell className="font-medium">{course.title}</TableCell>
                                    <TableCell>{course.category}</TableCell>
                                    <TableCell>{course.modules?.length || 0}</TableCell>
                                    <TableCell>{course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}</TableCell>
                                    <TableCell>
                                        <UiBadge variant={course.isPublished ? 'secondary' : 'outline'}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </UiBadge>
                                    </TableCell>
                                     <TableCell>
                                        <UiBadge variant={course.isPremium ? 'secondary' : 'outline'}>
                                            {course.isPremium ? 'Yes' : 'No'}
                                        </UiBadge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(course)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`/courses/${course.id}`, '_blank')}><AppWindow className="mr-2 h-4 w-4"/>View</DropdownMenuItem>
                                                <DropdownMenuSeparator/>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the course.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(course.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={7} className="text-center h-24">No courses found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

const UserList = () => {
    const {user} = useAuth();
    const {toast} = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchUsers = async () => {
            setLoading(true);
            const result = await getAllUsers(user.uid);
            if (Array.isArray(result)) {
                setUsers(result as AppUser[]);
            } else {
                toast({variant: 'destructive', title: 'Error fetching users', description: result.error});
            }
            setLoading(false);
        };
        fetchUsers();
    }, [user, toast]);

    const handleAdminToggle = async (targetUserId: string, isAdmin: boolean) => {
        if (!user) return;
        const result = await setAdminStatus(user.uid, targetUserId, isAdmin);
        if (result.success) {
            toast({title: 'Admin status updated'});
            setUsers(users.map(u => u.id === targetUserId ? {...u, isAdmin} : u));
        } else {
            toast({variant: 'destructive', title: 'Error', description: result.error});
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-muted-foreground">Manage user roles and permissions.</p>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-center">Is Admin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : users.map(u => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={u.avatarUrl} alt={u.name} />
                                            <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{u.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>{u.company}</TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={u.isAdmin}
                                        onCheckedChange={(checked) => handleAdminToggle(u.id, checked)}
                                        disabled={u.id === user?.uid}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

const DraggableNavLinkItem = ({ index, control, remove, isProtected }: { index: number, control: any, remove: (index: number) => void, isProtected: boolean }) => {
    const { fields } = useFieldArray({ control, name: "links" });
    const field = fields[index];
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id, disabled: isProtected });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    return (
        <TableRow ref={setNodeRef} style={style} className={cn(isProtected && "bg-muted/50")}>
            <TableCell>
                <Button variant="ghost" size="icon" className={cn("cursor-grab h-8 w-8", isProtected && "cursor-not-allowed text-muted-foreground")} {...listeners} {...attributes} disabled={isProtected}>
                    <GripVertical className="h-4 w-4" />
                </Button>
            </TableCell>
            <TableCell>
                <Controller name={`links.${index}.label`} control={control} render={({field}) => <Input placeholder="Label" {...field} disabled={isProtected}/>} />
            </TableCell>
            <TableCell>
                <Controller name={`links.${index}.href`} control={control} render={({field}) => <Input placeholder="/href" {...field} disabled={isProtected}/>} />
            </TableCell>
            <TableCell>
                <Controller name={`links.${index}.icon`} control={control} render={({field}) => <Input placeholder="IconName" {...field} disabled={isProtected}/>} />
            </TableCell>
            <TableCell>
                 <Controller name={`links.${index}.isEnabled`} control={control} render={({field}) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            </TableCell>
            <TableCell className="text-right">
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)} disabled={isProtected}>
                     <Trash className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
};

const NavigationEditor = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const { control, handleSubmit, setValue } = useForm({
        resolver: zodResolver(z.object({ links: navLinksSchema })),
        defaultValues: { links: [] as NavLink[] }
    });
    const { fields, append, remove, move } = useFieldArray({ control, name: "links" });

    useEffect(() => {
        const fetchNav = async () => {
            setLoading(true);
            const navLinks = await getNavigationSettings();
            // Add a temporary unique ID for dnd-kit if it's missing
            const linksWithIds = navLinks.map(link => ({ ...link, id: link.id || `nav-${Math.random()}` }));
            setValue('links', linksWithIds);
            setLoading(false);
        };
        fetchNav();
    }, [setValue]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over.id);
            if (fields[oldIndex]?.isProtected || fields[newIndex]?.isProtected) {
                toast({ variant: 'destructive', title: "Protected links cannot be reordered." });
                return;
            }
            move(oldIndex, newIndex);
        }
    };

    const onSave = async (data: { links: NavLink[] }) => {
        if (!user) return;
        setLoading(true);
        const result = await updateNavigationSettings(user.uid, data.links);
        if (result.success) {
            toast({ title: "Navigation saved!" });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }
    
    return (
         <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Navigation Management</h1>
                <p className="text-muted-foreground">Control the main site navigation links. Drag and drop to reorder.</p>
            </div>
             <form onSubmit={handleSubmit(onSave)}>
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>URL Path</TableHead>
                                    <TableHead>Icon</TableHead>
                                    <TableHead>Enabled</TableHead>
                                    <TableHead className="w-12 text-right">Delete</TableHead>
                                </TableRow>
                            </TableHeader>
                            <DndContext sensors={[]} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <TableBody>
                                    {fields.map((field, index) => (
                                        <DraggableNavLinkItem key={field.id} index={index} control={control} remove={remove} isProtected={field.isProtected} />
                                    ))}
                                    </TableBody>
                                </SortableContext>
                            </DndContext>
                        </Table>
                    </CardContent>
                </Card>
                <div className="flex justify-between mt-4">
                    <Button type="button" variant="outline" onClick={() => append({ id: `new-${Date.now()}`, label: '', href: '', icon: '', isEnabled: true, isProtected: false })}><PlusCircle className="mr-2 h-4 w-4"/> Add Link</Button>
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Save Navigation"}</Button>
                </div>
            </form>
        </div>
    )
}

const DynamicLucideIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Award>) => {
    const LucideIcon = icons[name as keyof typeof icons] || Award;
    return <LucideIcon {...props} />;
};

const BadgeManager = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const {user} = useAuth();
    const {toast} = useToast();

    useEffect(() => {
        const fetchBadges = async () => {
            setLoading(true);
            const data = await getBadges();
            setBadges(data);
            setLoading(false);
        };
        fetchBadges();
    }, []);

    const handleUpsert = async (badge: z.infer<typeof badgeFormSchema>) => {
        if (!user) return;
        const result = await upsertBadge(user.uid, badge);
        if (result.success) {
            toast({title: 'Badge saved'});
            const newBadges = await getBadges();
            setBadges(newBadges);
        } else {
            toast({variant: 'destructive', title: 'Error', description: result.error});
        }
    }

    const handleDelete = async (badgeId: string) => {
        if (!user) return;
        const result = await deleteBadge(user.uid, badgeId);
         if (result.success) {
            toast({title: 'Badge deleted'});
            setBadges(badges.filter(b => b.id !== badgeId));
        } else {
            toast({variant: 'destructive', title: 'Error', description: result.error});
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Badge Management</h1>
                <p className="text-muted-foreground">Create and manage achievement badges.</p>
            </div>
            <div className="text-right">
                <BadgeFormDialog onSave={handleUpsert}><Button><PlusCircle className="mr-2 h-4 w-4"/> Add Badge</Button></BadgeFormDialog>
            </div>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : badges.map((badge) => (
                            <TableRow key={badge.id}>
                                <TableCell className="font-medium flex items-center gap-3">
                                    <div className="p-2 rounded-full" style={{ backgroundColor: badge.color ? `${badge.color}20` : '#88888820' }}>
                                        <DynamicLucideIcon name={badge.icon || 'Award'} className="h-5 w-5" style={{ color: badge.color || '#888' }} />
                                    </div>
                                    {badge.name}
                                </TableCell>
                                <TableCell>{badge.description}</TableCell>
                                <TableCell><UiBadge variant="secondary">{badge.type}</UiBadge></TableCell>
                                <TableCell>{badge.value} {badge.category && `(${badge.category})`}</TableCell>
                                 <TableCell className="text-right">
                                     <BadgeFormDialog onSave={handleUpsert} badge={badge}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4"/></Button>
                                     </BadgeFormDialog>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(badge.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                 </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
        </div>
    );
};

const BadgeFormDialog = ({children, onSave, badge}: {children: React.ReactNode, onSave: (data: z.infer<typeof badgeFormSchema>) => void, badge?: Badge}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);
    const form = useForm<z.infer<typeof badgeFormSchema>>({
        resolver: zodResolver(badgeFormSchema),
        defaultValues: badge || { name: '', description: '', type: 'POINTS', value: 0, category: '', icon: 'Award', color: '#fbbf24' }
    });

    const iconNames = Object.keys(icons);

    const watchedIcon = form.watch('icon');
    const watchedColor = form.watch('color');
    const watchedName = form.watch('name');

    const handleIconSelect = (iconName: string) => {
        form.setValue("icon", iconName);
        setIsIconPopoverOpen(false);
    };
    
    const onSubmit = (data: z.infer<typeof badgeFormSchema>) => {
        onSave({...data, value: Number(data.value)});
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{badge ? 'Edit Badge' : 'Add Badge'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                         <div className="flex items-center justify-center p-6 bg-muted rounded-lg border border-dashed">
                             <Card className="p-4 flex flex-col items-center gap-2 shadow-md w-32">
                                <div className="w-16 h-16 flex items-center justify-center">
                                    <div
                                    className="hexagon-clip w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: watchedColor ? `${watchedColor}20` : '#fbbf2420' }}
                                    >
                                    <DynamicLucideIcon name={watchedIcon || 'Award'} className="h-8 w-8" style={{ color: watchedColor || '#fbbf24' }} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm truncate">{watchedName || 'Badge Name'}</p>
                                </div>
                            </Card>
                        </div>

                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="icon" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Icon</FormLabel>
                                <Popover open={isIconPopoverOpen} onOpenChange={setIsIconPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                {field.value ? <><DynamicLucideIcon name={field.value} className="mr-2 h-4 w-4" /> {field.value}</> : "Select icon"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search icon..." />
                                            <CommandEmpty>No icon found.</CommandEmpty>
                                            <CommandList>
                                                <CommandGroup>
                                                    {iconNames.map((iconName) => (
                                                        <CommandItem
                                                            value={iconName}
                                                            key={iconName}
                                                            onSelect={() => handleIconSelect(iconName)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", iconName === field.value ? "opacity-100" : "opacity-0")} />
                                                            <DynamicLucideIcon name={iconName} className="mr-2 h-4 w-4" />
                                                            {iconName}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Color</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input {...field} placeholder="e.g., #fbbf24" className="pr-12"/>
                                            <Input type="color" value={field.value} onChange={field.onChange} className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8 p-1 bg-transparent border-none cursor-pointer"/>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="STREAK">STREAK</SelectItem>
                                    <SelectItem value="POINTS">POINTS</SelectItem>
                                    <SelectItem value="TOTAL_SOLVED">TOTAL_SOLVED</SelectItem>
                                    <SelectItem value="CATEGORY_SOLVED">CATEGORY_SOLVED</SelectItem>
                                    <SelectItem value="ACTIVE_DAYS">ACTIVE_DAYS</SelectItem>
                                </SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="value" render={({ field }) => (
                            <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />

                        {form.watch('type') === 'CATEGORY_SOLVED' && (
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        )}

                        <DialogFooter>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


const PricingManager = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const form = useForm<z.infer<typeof pricingSettingsSchema>>({
        resolver: zodResolver(pricingSettingsSchema),
        defaultValues: {
            inr: { monthly: { price: 0, total: 0 }, biannually: { price: 0, total: 0 }, annually: { price: 0, total: 0 }, },
            usd: { monthly: { price: 0, total: 0 }, biannually: { price: 0, total: 0 }, annually: { price: 0, total: 0 }, },
            vouchers: [],
        }
    });

    const { fields: voucherFields, append: appendVoucher, remove: removeVoucher, update: updateVoucher } = useFieldArray({
        control: form.control,
        name: "vouchers"
    });

    useEffect(() => {
        if (!user) return;
        const fetchPlans = async () => {
            setIsSaving(true);
            const result = await getPricingPlans(user.uid);
            if (result.success && result.plans) {
                const data = result.plans;
                 if (data.vouchers) {
                    data.vouchers = data.vouchers.map((v: any) => ({
                        ...v,
                        expiresAt: v.expiresAt instanceof Timestamp ? v.expiresAt.toDate() : undefined,
                    }));
                }
                form.reset(data);
            } else {
                toast({ variant: 'destructive', title: 'Error fetching plans', description: result.error });
            }
            setIsSaving(false);
        };
        fetchPlans();
    }, [user, toast, form]);
    
    const onSubmit = async (data: z.infer<typeof pricingSettingsSchema>) => {
        if (!user) return;
        setIsSaving(true);
        const result = await updatePricingPlans(user.uid, data);
        if (result.success) {
            toast({ title: 'Settings saved successfully!' });
        } else {
            toast({ variant: 'destructive', title: 'Error saving settings.', description: result.error });
        }
        setIsSaving(false);
    };

    const onVoucherSave = (voucherData: z.infer<typeof voucherSchema>) => {
        const index = voucherFields.findIndex(v => v.id === voucherData.id);
        if (index > -1) {
            updateVoucher(index, voucherData);
        } else {
            appendVoucher({ ...voucherData, id: `new-${Date.now()}` });
        }
        // Immediately trigger form save
        form.handleSubmit(onSubmit)();
    };

    const onVoucherDelete = (index: number) => {
        removeVoucher(index);
         // Immediately trigger form save
        form.handleSubmit(onSubmit)();
    }
    
    if (isSaving && !form.formState.isDirty) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pricing Management</h1>
                <p className="text-muted-foreground">Set the prices for your subscription plans in INR and USD.</p>
            </div>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">INR Pricing (₹)</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full" defaultValue="monthly">
                                {['monthly', 'biannually', 'annually'].map((plan) => (
                                    <AccordionItem key={plan} value={plan}>
                                        <AccordionTrigger className="capitalize font-medium">{plan}</AccordionTrigger>
                                        <AccordionContent className="p-4 grid grid-cols-2 gap-4">
                                             <FormField
                                                control={form.control}
                                                name={`inr.${plan as 'monthly' | 'biannually' | 'annually'}.price`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Price per month (₹)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                        </FormControl>
                                                         <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`inr.${plan as 'monthly' | 'biannually' | 'annually'}.total`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Total Price (₹)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                        </FormControl>
                                                         <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">USD Pricing ($)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full" defaultValue="monthly">
                                {['monthly', 'biannually', 'annually'].map((plan) => (
                                    <AccordionItem key={plan} value={plan}>
                                        <AccordionTrigger className="capitalize font-medium">{plan}</AccordionTrigger>
                                        <AccordionContent className="p-4 grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`usd.${plan as 'monthly' | 'biannually' | 'annually'}.price`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Price per month ($)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                        </FormControl>
                                                         <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name={`usd.${plan as 'monthly' | 'biannually' | 'annually'}.total`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Total Price ($)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                        </FormControl>
                                                         <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Save Prices
                        </Button>
                    </div>
                </form>
            </Form>
            
            <div className="space-y-6 mt-12">
                 <div>
                    <h1 className="text-2xl font-bold">Voucher Management</h1>
                    <p className="text-muted-foreground">Create and manage discount vouchers.</p>
                </div>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <CardTitle className="text-lg">Vouchers</CardTitle>
                         <VoucherFormDialog onSave={onVoucherSave}>
                            <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add Voucher</Button>
                         </VoucherFormDialog>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead className="w-[80px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {voucherFields.length > 0 ? voucherFields.map((voucher, index) => (
                                        <TableRow key={voucher.id}>
                                            <TableCell className="font-mono">{voucher.code}</TableCell>
                                            <TableCell className="capitalize">{voucher.type}</TableCell>
                                            <TableCell>{voucher.type === 'percentage' ? `${voucher.value}%` : `₹${voucher.value}`}</TableCell>
                                            <TableCell><UiBadge variant={voucher.status === 'active' ? 'secondary' : 'outline'}>{voucher.status}</UiBadge></TableCell>
                                            <TableCell>{voucher.expiresAt ? format(voucher.expiresAt, 'PPP') : 'Never'}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                <VoucherFormDialog onSave={onVoucherSave} voucher={voucher}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4"/></Button>
                                                </VoucherFormDialog>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Voucher?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the voucher `{voucher.code}`?</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onVoucherDelete(index)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                No vouchers created yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};


const VoucherFormDialog = ({ children, onSave, voucher }: { children: React.ReactNode; onSave: (data: z.infer<typeof voucherSchema>) => void; voucher?: z.infer<typeof voucherSchema> }) => {
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<z.infer<typeof voucherSchema>>({
        resolver: zodResolver(voucherSchema),
        defaultValues: voucher || {
            code: '',
            type: 'percentage',
            value: 10,
            status: 'active',
            expiresAt: undefined,
        }
    });

    const onSubmit = (data: z.infer<typeof voucherSchema>) => {
        onSave(data);
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{voucher ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem><FormLabel>Voucher Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="value" render={({ field }) => (
                                <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField
                            control={form.control}
                            name="expiresAt"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Expiration Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Leave blank for no expiration.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Voucher</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export const AdminDashboard = () => {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'problems';

    switch (tab) {
        case 'problems':
            return <ProblemList />;
        case 'courses':
            return <CourseList />;
        case 'users':
            return <UserList />;
        case 'navigation':
            return <NavigationEditor />;
        case 'badges':
            return <BadgeManager />;
        case 'pricing':
            return <PricingManager />;
        default:
            return <ProblemList />;
    }
};


