
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Problem, ApexProblemsData } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { 
    upsertProblemToFirestore, 
    bulkUpsertProblemsFromJSON, 
    deleteProblemFromFirestore, 
    addCategory, 
    getProblemCategories, 
    updateCategoryDetails, 
    deleteCategory 
} from "@/app/upload-problem/actions";
import { problemFormSchema } from '@/lib/admin-schemas';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Upload, Trash, Pencil, Search, Image as ImageIcon, MoreHorizontal, Download, FileJson2, Edit } from "lucide-react";
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

type AdminContextType = {
    problemsByCategory: { [category: string]: Problem[] };
    categories: Awaited<ReturnType<typeof getProblemCategories>>;
    loading: boolean;
    fetchCategories: () => void;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [problemsByCategory, setProblemsByCategory] = useState<{ [category: string]: Problem[] }>({});
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
                const categoryList = Object.entries(data).map(([name, details]) => {
                    problemMap[name] = details.Questions || [];
                    return {
                        name,
                        imageUrl: details.imageUrl || '',
                        problemCount: details.Questions?.length || 0
                    };
                }).sort((a,b) => a.name.localeCompare(b.name));
                
                setProblemsByCategory(problemMap);
                setCategories(categoryList);
            } else {
                setProblemsByCategory({});
                setCategories([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching problems data:", error);
            setProblemsByCategory({});
            setCategories([]);
            setLoading(false);
        });
        
        return unsubscribe;
    }, [user, userData?.isAdmin]);


    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const fetchedCategories = await getProblemCategories();
        setCategories(fetchedCategories);
        setLoading(false);
    }, []);

    const value = {
        problemsByCategory,
        categories,
        loading,
        fetchCategories,
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
    const { categories, fetchCategories } = useAdmin();
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
            fetchCategories();
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
            fetchCategories();
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
            fetchCategories();
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
                                <span className="font-medium">{category.name} ({category.problemCount})</span>
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
        if (!user || !activeCategory) return;
        setLoading(true);
        const result = await upsertProblemToFirestore(user.uid, activeCategory, values);
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
    
    const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !activeCategory) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const problemsJSON = JSON.parse(e.target?.result as string);
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

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter]);

    if (isFormOpen) {
        return <ProblemForm 
                    onSubmit={handleUpsertProblem} 
                    isLoading={loading} 
                    categories={categories.map(c => c.name)}
                    initialData={editingProblem ? { ...editingProblem, categoryName: activeCategory! } : undefined}
                    onCancel={() => { setIsFormOpen(false); setEditingProblem(null); }}
                />;
    }
    
    return (
        <div className="space-y-6">
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
                    <Button variant="outline"><Download className="mr-2 h-4 w-4"/> Download Sample</Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                         Bulk Upload
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)} disabled={!activeCategory}><PlusCircle className="mr-2 h-4 w-4" /> Add New Problem</Button>
                </div>
            </div>
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 flex gap-4">
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
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
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
                            <TableHead className="w-[50px]"><Checkbox/></TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Tested</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contextLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : filteredProblems.length > 0 ? (
                            filteredProblems.map((problem) => (
                            <TableRow key={problem.id}>
                                <TableCell><Checkbox /></TableCell>
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
                                <TableCell>
                                    {/* Placeholder for 'Tested' status */}
                                </TableCell>
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
        </div>
    );
};

export const AdminDashboard = () => {
    return <ProblemList />;
};
