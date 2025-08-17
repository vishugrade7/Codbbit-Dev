

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Problem, ApexProblemsData, Course, User as AppUser, NavLink, Badge, PricingPlan } from '@/types';
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
    getAllUsers,
    setAdminStatus,
    getNavigationSettings,
    updateNavigationSettings,
    getBadges,
    upsertBadge,
    deleteBadge,
    updateBrandingSettings,
    getPricingPlans,
    updatePricingPlans
} from "@/app/upload-problem/actions";
import { problemFormSchema, courseFormSchema, navLinksSchema, badgeFormSchema, brandingSchema, pricingPlanSchema } from '@/lib/admin-schemas';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Upload, Trash, Pencil, Search, Image as ImageIcon, MoreHorizontal, Download, FileJson2, Edit, GripVertical, Palette, IndianRupee, DollarSign } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';


type AdminContextType = {
    problemsByCategory: { [category: string]: Problem[] };
    categories: Awaited<ReturnType<typeof getProblemCategories>>;
    loading: boolean;
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

    const value = {
        problemsByCategory,
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

const CourseList = () => {
    return <div>Course Management Coming Soon</div>;
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

const DraggableNavLink = ({link, index}: {link: NavLink, index: number}) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: link.id});
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-md bg-card">
            <Button variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...listeners} {...attributes}><GripVertical className="h-4 w-4" /></Button>
            <div className="flex-1 grid grid-cols-2 gap-4">
                <Input value={link.label} disabled/>
                <Input value={link.href} disabled/>
            </div>
        </div>
    )
}

const NavigationEditor = () => {
    const {user} = useAuth();
    const {toast} = useToast();
    const [links, setLinks] = useState<NavLink[]>([]);
    const [loading, setLoading] = useState(true);

    const {control, handleSubmit, setValue} = useForm({
        resolver: zodResolver(z.object({links: navLinksSchema})),
        defaultValues: { links: [] }
    });
    const { fields, append, remove, move } = useFieldArray({ control, name: "links" });

    useEffect(() => {
        const fetchNav = async () => {
            setLoading(true);
            const navLinks = await getNavigationSettings();
            setLinks(navLinks);
            setValue('links', navLinks);
            setLoading(false);
        };
        fetchNav();
    }, [setValue]);

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (active.id !== over?.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over?.id);
            move(oldIndex, newIndex);
        }
    };

    const onSave = async (data: {links: NavLink[]}) => {
        if (!user) return;
        setLoading(true);
        const result = await updateNavigationSettings(user.uid, data.links);
        if(result.success) {
            toast({title: "Navigation saved!"});
        } else {
            toast({variant: 'destructive', title: 'Error', description: result.error});
        }
        setLoading(false);
    }
    
    return (
         <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Navigation Management</h1>
                <p className="text-muted-foreground">Control the main site navigation links.</p>
            </div>
             <form onSubmit={handleSubmit(onSave)}>
                <DndContext sensors={[]} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                         {fields.map((field, index) => (
                              <DraggableNavLinkItem key={field.id} index={index} control={control} remove={remove} />
                          ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <div className="flex justify-between mt-4">
                    <Button type="button" variant="outline" onClick={() => append({id: `new-${Date.now()}`, label: '', href: '', isEnabled: true, isProtected: false})}><PlusCircle className="mr-2 h-4 w-4"/> Add Link</Button>
                    <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Save Navigation"}</Button>
                </div>
            </form>
        </div>
    )
}

const DraggableNavLinkItem = ({ index, control, remove }: { index: number, control: any, remove: (index: number) => void }) => {
    const { fields } = useFieldArray({ control, name: "links" });
    const field = fields[index];
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-md bg-card">
            <Button variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...listeners} {...attributes}><GripVertical className="h-4 w-4" /></Button>
            <Controller name={`links.${index}.label`} control={control} render={({field}) => <Input placeholder="Label" {...field}/>} />
            <Controller name={`links.${index}.href`} control={control} render={({field}) => <Input placeholder="/href" {...field}/>} />
            <Controller name={`links.${index}.isEnabled`} control={control} render={({field}) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
             <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash className="h-4 w-4" /></Button>
        </div>
    );
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
                                <TableCell className="font-medium">{badge.name}</TableCell>
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
    const form = useForm<z.infer<typeof badgeFormSchema>>({
        resolver: zodResolver(badgeFormSchema),
        defaultValues: badge || { name: '', description: '', type: 'POINTS', value: 0, category: ''}
    });

    const onSubmit = (data: z.infer<typeof badgeFormSchema>) => {
        onSave({...data, value: Number(data.value)});
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{badge ? 'Edit Badge' : 'Add Badge'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
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


const BrandingManager = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof brandingSchema>>({
        resolver: zodResolver(brandingSchema),
        defaultValues: {
            colors: {
                primary: '231 59% 48%',
                accent: '174 100% 29%',
                background: '231 60% 96%',
            },
            fonts: {
                headline: 'Poppins',
                body: 'PT Sans'
            }
        }
    });

    const onSave = async (data: z.infer<typeof brandingSchema>) => {
        if (!user) return;
        setLoading(true);
        const result = await updateBrandingSettings(user.uid, data);
        if (result.success) {
            toast({ title: "Branding updated successfully! Refresh the page to see changes." });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Branding Management</h1>
                <p className="text-muted-foreground">Customize your application's colors and typography.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="colors.primary" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Primary Color (HSL)</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., 231 59% 48%" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="colors.accent" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Accent Color (HSL)</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., 174 100% 29%" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="colors.background" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Background Color (HSL)</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., 231 60% 96%" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="fonts.headline" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Headline Font</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., Poppins" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="fonts.body" render={({field}) => (
                                <FormItem>
                                    <FormLabel>Body Font</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., PT Sans" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin mr-2"/> : null} Save Branding</Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};

const pricingFormSchema = z.object({
    inr: z.object({
        monthly: z.object({ price: z.number(), total: z.number() }),
        biannually: z.object({ price: z.number(), total: z.number() }),
        annually: z.object({ price: z.number(), total: z.number() }),
    }),
    usd: z.object({
        monthly: z.object({ price: z.number(), total: z.number() }),
        biannually: z.object({ price: z.number(), total: z.number() }),
        annually: z.object({ price: z.number(), total: z.number() }),
    }),
});

const PricingManager = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const form = useForm<z.infer<typeof pricingFormSchema>>({
        defaultValues: {
            inr: {
                monthly: { price: 0, total: 0 },
                biannually: { price: 0, total: 0 },
                annually: { price: 0, total: 0 },
            },
            usd: {
                monthly: { price: 0, total: 0 },
                biannually: { price: 0, total: 0 },
                annually: { price: 0, total: 0 },
            },
        }
    });

    useEffect(() => {
        if (!user) return;
        const fetchPlans = async () => {
            setIsSaving(true);
            const result = await getPricingPlans(user.uid);
            if (result.success && result.plans) {
                form.reset(result.plans);
            } else {
                toast({ variant: 'destructive', title: 'Error fetching plans', description: result.error });
            }
            setIsSaving(false);
        };
        fetchPlans();
    }, [user, toast, form]);
    
    const onSubmit = async (data: z.infer<typeof pricingFormSchema>) => {
        if (!user) return;
        setIsSaving(true);
        const result = await updatePricingPlans(user.uid, data);
        if (result.success) {
            toast({ title: 'Prices saved successfully!' });
        } else {
            toast({ variant: 'destructive', title: 'Error saving prices.', description: result.error });
        }
        setIsSaving(false);
    };
    
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
                                                name={`inr.${plan}.price`}
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
                                                name={`inr.${plan}.total`}
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
                                                name={`usd.${plan}.price`}
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
                                                name={`usd.${plan}.total`}
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
                         <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add Voucher</Button>
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
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Voucher management coming soon.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};


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
        case 'branding':
            return <BrandingManager />;
        case 'pricing':
            return <PricingManager />;
        default:
            return <ProblemList />;
    }
};
