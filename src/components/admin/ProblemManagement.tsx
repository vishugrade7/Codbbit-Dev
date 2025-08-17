
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Problem, ApexProblemsData, User as AppUser } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { 
    upsertProblemToFirestore, 
    bulkUpsertProblemsFromJSON, 
    deleteProblemFromFirestore, 
    addCategory, 
    getAllUsers, 
    setAdminStatus, 
    getProblemCategories, 
    updateCategoryDetails, 
    deleteCategory 
} from "@/app/upload-problem/actions";
import { problemFormSchema } from '@/lib/admin-schemas';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Upload, Trash, Pencil, Search, Image as ImageIcon, MoreHorizontal, Download, FileJson2 } from "lucide-react";
import { ProblemForm } from '@/app/upload-problem/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';


type AdminContextType = {
    problems: Problem[];
    categories: Awaited<ReturnType<typeof getProblemCategories>>;
    loading: boolean;
    fetchProblems: (category: string) => void;
    fetchCategories: () => void;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [problems, setProblems] = useState<Problem[]>([]);
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getProblemCategories>>>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (userData === null && user) {
            setLoading(true);
        } else if (!user || !userData?.isAdmin) {
             router.replace('/');
        } else {
            setLoading(false);
        }
    }, [user, userData, router]);

    const fetchProblems = useCallback((category: string) => {
        if (!db) return;
        setLoading(true);
        const apexDocRef = doc(db, "problems", "Apex");
        const unsubscribe = onSnapshot(apexDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data().Category as ApexProblemsData;
                setProblems(data[category]?.Questions || []);
            } else {
                setProblems([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching problems:", error);
            setProblems([]);
            setLoading(false);
        });
        
        return unsubscribe;
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const fetchedCategories = await getProblemCategories();
        setCategories(fetchedCategories);
        setLoading(false);
    }, []);
    
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);


    const value = {
        problems,
        categories,
        loading,
        fetchProblems,
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
const ProblemList = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { problems, categories, loading: contextLoading, fetchProblems, fetchCategories } = useAdmin();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].name);
        }
    }, [categories, activeCategory]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (activeCategory) {
            unsubscribe = fetchProblems(activeCategory);
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [activeCategory, fetchProblems]);

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
    
    const handleAddCategoryClick = () => {
        // A bit of a hack: open the manage modal and trigger the "add" state within it.
        setIsManageModalOpen(true);
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
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl">Problem Management</CardTitle>
                        <CardDescription>View, edit, or add new Apex coding challenges to the platform.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".json" className="hidden" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Upload</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><FileJson2 className="mr-2"/>Paste JSON</DropdownMenuItem>
                                <DropdownMenuItem><Download className="mr-2"/>Download Sample</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add New Problem</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search problems..."
                            className="w-full max-w-md pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={difficultyFilter === 'All' ? 'default' : 'outline'} onClick={() => setDifficultyFilter('All')} className="rounded-full">All</Button>
                        <Button variant={difficultyFilter === 'Easy' ? 'default' : 'outline'} onClick={() => setDifficultyFilter('Easy')} className="rounded-full">Easy</Button>
                        <Button variant={difficultyFilter === 'Medium' ? 'default' : 'outline'} onClick={() => setDifficultyFilter('Medium')} className="rounded-full">Medium</Button>
                        <Button variant={difficultyFilter === 'Hard' ? 'default' : 'outline'} onClick={() => setDifficultyFilter('Hard')} className="rounded-full">Hard</Button>
                    </div>
                 </div>
                <div className="rounded-md border flex-1">
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
                                                problem.difficulty === 'Easy' && 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
                                                problem.difficulty === 'Medium' && 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
                                                problem.difficulty === 'Hard' && 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
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
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Trash className="mr-2 h-4 w-4 text-destructive" /> 
                                                            <span className="text-destructive">Delete</span>
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
                                                            <AlertDialogAction onClick={() => handleDeleteProblem(problem.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No problems found in {activeCategory}.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// Other components like CourseList, UserManagement, SiteSettings remain unchanged for now
const CourseList = () => {
    return (
        <Card>
            <CardHeader><CardTitle>Coming Soon</CardTitle></CardHeader>
            <CardContent><p>Course management will be available here.</p></CardContent>
        </Card>
    );
}
const UserManagement = () => {
    return (
        <Card>
            <CardHeader><CardTitle>Coming Soon</CardTitle></CardHeader>
            <CardContent><p>User management will be available here.</p></CardContent>
        </Card>
    );
};
const SiteSettings = () => {
    return (
        <Card>
            <CardHeader><CardTitle>Coming Soon</CardTitle></CardHeader>
            <CardContent><p>Site settings will be available here.</p></CardContent>
        </Card>
    );
};

export const AdminDashboard = () => {
    return <ProblemList />;
};
