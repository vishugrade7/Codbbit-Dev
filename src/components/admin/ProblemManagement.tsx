
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import type { Problem, Course, NavLink, Badge, ApexProblemsData } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { upsertProblemToFirestore, bulkUpsertProblemsFromJSON, addCategory, upsertCourseToFirestore, getAllUsers, setAdminStatus, getNavigationSettings, updateNavigationSettings, getBadges, upsertBadge, deleteBadge as deleteBadgeAction, getProblemCategories, updateCategoryDetails, deleteCategory } from "../../app/upload-problem/actions";
import { problemFormSchema, courseFormSchema, navLinksSchema, badgeFormSchema, contentBlockSchema } from "@/lib/admin-schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Upload, Trash, Pencil, Search, Image as ImageIcon, Eye } from "lucide-react";
import { ProblemForm } from '@/app/upload-problem/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AdminContextType = {
    problems: Problem[];
    courses: Course[];
    users: any[];
    navLinks: NavLink[];
    badges: Badge[];
    categories: Awaited<ReturnType<typeof getProblemCategories>>;
    loading: boolean;
    addProblem: (category: string, problem: any) => Promise<any>;
    addCourse: (course: any) => Promise<any>;
    fetchProblems: (category: string) => Promise<void>;
};

const AdminContext = createContext<AdminContextType | null>(null);

const PRIMARY_ADMIN_EMAIL = "gradevishu@gmail.com";

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, userData } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [problems, setProblems] = useState<Problem[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [navLinks, setNavLinks] = useState<NavLink[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getProblemCategories>>>([]);
    const [loading, setLoading] = useState(false);
    
    // Authorization check
    useEffect(() => {
        if (userData && !userData.isAdmin) {
             router.replace('/');
        }
    }, [userData, router]);

    // This effect ensures the primary admin email always has admin privileges in Firestore.
    useEffect(() => {
        const grantPrimaryAdminAccess = async () => {
            if (user?.email === PRIMARY_ADMIN_EMAIL && !userData?.isAdmin) {
                console.log("Primary admin detected. Granting admin privileges...");
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, { isAdmin: true });
                    toast({ title: "Admin privileges granted." });
                } catch (error) {
                    console.error("Error granting primary admin access:", error);
                    toast({ variant: 'destructive', title: "Error", description: "Could not grant admin privileges." });
                }
            }
        };

        if (user && userData) {
            grantPrimaryAdminAccess();
        }
    }, [user, userData, toast]);

    const fetchProblems = useCallback(async (category: string) => {
        if (!db) return;
        setLoading(true);
        const apexDocRef = doc(db, "problems", "Apex");
        const docSnap = await getDoc(apexDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data().Category as ApexProblemsData;
            setProblems(data[category]?.Questions || []);
        }
        setLoading(false);
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const fetchedCategories = await getProblemCategories();
        setCategories(fetchedCategories);
        if (fetchedCategories.length > 0) {
            await fetchProblems(fetchedCategories[0].name);
        }
        setLoading(false);
    }, [fetchProblems]);

    useEffect(() => {
        if(user) {
            fetchCategories();
        }
    }, [user, fetchCategories]);


    const addProblem = async (category: string, problem: any) => {
        if (!user) return { success: false, error: 'Not authenticated' };
        setLoading(true);
        const result = await upsertProblemToFirestore(user.uid, category, problem);
        setLoading(false);
        return result;
    };

    const addCourse = async (course: any) => {
        if (!user) return { success: false, error: 'Not authenticated' };
        setLoading(true);
        const result = await upsertCourseToFirestore(user.uid, course);
        setLoading(false);
        return result;
    };

    const value = {
        problems,
        courses,
        users,
        navLinks,
        badges,
        categories,
        loading,
        addProblem,
        addCourse,
        fetchProblems
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
    const { problems: initialProblems, categories, loading: contextLoading, fetchProblems } = useAdmin();
    const [problems, setProblems] = useState(initialProblems);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0].name);
        }
    }, [categories, activeCategory]);

    useEffect(() => {
        if (activeCategory) {
            fetchProblems(activeCategory);
        }
    }, [activeCategory, fetchProblems]);

    useEffect(() => {
        setProblems(initialProblems);
    }, [initialProblems]);

    const handleUpsertProblem = async (values: z.infer<typeof problemFormSchema>) => {
        if (!user || !activeCategory) return;
        setLoading(true);
        const result = await upsertProblemToFirestore(user.uid, activeCategory, values);
        if (result.success) {
            toast({ title: `Problem ${editingProblem ? 'updated' : 'added'} successfully!` });
            await fetchProblems(activeCategory);
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
            await fetchProblems(activeCategory);
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
                    await fetchProblems(activeCategory!);
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
        <Card>
            <CardHeader>
                <CardTitle>Problem Management</CardTitle>
                <CardDescription>View, edit, or add new Apex coding challenges to the platform.</CardDescription>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-4">
                     <Tabs value={activeCategory || ''} onValueChange={setActiveCategory} className="w-full sm:w-auto">
                        <TabsList>
                            {categories.map(cat => <TabsTrigger key={cat.name} value={cat.name}>{cat.name}</TabsTrigger>)}
                        </TabsList>
                    </Tabs>
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setIsManageModalOpen(true)}>Manage Categories</Button>
                         <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Bulk Upload
                         </Button>
                         <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".json" className="hidden" />
                        <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add New Problem</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title..."
                            className="w-full pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {["All", "Easy", "Medium", "Hard"].map(diff => (
                            <Button key={diff} variant={difficultyFilter === diff ? 'default' : 'outline'} onClick={() => setDifficultyFilter(diff)}>{diff}</Button>
                        ))}
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contextLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : filteredProblems.length > 0 ? (
                                filteredProblems.map((problem) => (
                                <TableRow key={problem.id}>
                                    <TableCell className="font-medium">{problem.title}</TableCell>
                                    <TableCell><UiBadge variant={problem.difficulty === 'Easy' ? 'secondary' : problem.difficulty === 'Medium' ? 'default' : 'destructive'}>{problem.difficulty}</UiBadge></TableCell>
                                    <TableCell>{problem.metadataType}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingProblem(problem); setIsFormOpen(true); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash className="h-4 w-4 text-destructive" /></Button>
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
                                    </TableCell>
                                </TableRow>
                            ))) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No problems found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 {isManageModalOpen && (
                    <ManageCategoriesModal 
                        isOpen={isManageModalOpen} 
                        onOpenChange={setIsManageModalOpen}
                        onCategoryUpdate={fetchCategories}
                    />
                 )}
            </CardContent>
        </Card>
    );
};

const ManageCategoriesModal = ({ isOpen, onOpenChange, onCategoryUpdate }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onCategoryUpdate: () => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getProblemCategories>>>([]);
    const [loading, setLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
    const [editingCategory, setEditingCategory] = useState<any | null>(null);

    const fetchAndSetCategories = useCallback(async () => {
        setLoading(true);
        const cats = await getProblemCategories();
        setCategories(cats);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAndSetCategories();
        }
    }, [isOpen, fetchAndSetCategories]);

    const handleAddCategory = async () => {
        if (!user || !newCategoryName) return;
        setLoading(true);
        const result = await addCategory(user.uid, newCategoryName, newCategoryImageUrl);
        if (result.success) {
            toast({ title: 'Category added' });
            setNewCategoryName('');
            setNewCategoryImageUrl('');
            await fetchAndSetCategories();
            onCategoryUpdate();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    };

    const handleUpdateCategory = async () => {
        if (!user || !editingCategory) return;
        setLoading(true);
        const result = await updateCategoryDetails(user.uid, editingCategory.name, editingCategory.newName, editingCategory.newImageUrl);
         if (result.success) {
            toast({ title: 'Category updated' });
            setEditingCategory(null);
            await fetchAndSetCategories();
            onCategoryUpdate();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }
    
    const handleDeleteCategory = async (categoryName: string) => {
        if (!user) return;
        setLoading(true);
        const result = await deleteCategory(user.uid, categoryName);
         if (result.success) {
            toast({ title: 'Category deleted' });
            await fetchAndSetCategories();
            onCategoryUpdate();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); setEditingCategory(null); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>Add, edit, or delete problem categories.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold">{editingCategory ? "Edit Category" : "Add New Category"}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <Input 
                                placeholder="Category Name"
                                value={editingCategory ? editingCategory.newName : newCategoryName}
                                onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, newName: e.target.value}) : setNewCategoryName(e.target.value)}
                             />
                              <Input 
                                placeholder="Image URL"
                                value={editingCategory ? editingCategory.newImageUrl : newCategoryImageUrl}
                                onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, newImageUrl: e.target.value}) : setNewCategoryImageUrl(e.target.value)}
                             />
                        </div>
                        <div className="flex justify-end gap-2">
                             {editingCategory && <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>}
                             <Button onClick={editingCategory ? handleUpdateCategory : handleAddCategory} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : editingCategory ? "Save Changes" : "Add Category"}
                             </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                         <h4 className="font-semibold">Existing Categories</h4>
                         <div className="rounded-md border max-h-64 overflow-y-auto">
                            {loading && categories.length === 0 ? <div className="p-4 text-center"><Loader2 className="animate-spin" /></div> :
                            categories.map(cat => (
                                <div key={cat.name} className="flex items-center justify-between p-3 border-b last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                        <span className="font-medium">{cat.name} ({cat.problemCount})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory({...cat, newName: cat.name, newImageUrl: cat.imageUrl})}>
                                            <Pencil className="h-4 w-4" />
                                         </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={cat.problemCount > 0}>
                                                    <Trash className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. Are you sure you want to delete this category?
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteCategory(cat.name)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const CourseList = () => <div>Course management coming soon...</div>;
const UserManagement = () => <div>User management coming soon...</div>;
const SiteSettings = () => <div>Site settings coming soon...</div>;

export const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("problems");

    const renderContent = () => {
        switch (activeTab) {
            case "problems": return <ProblemList />;
            case "courses": return <CourseList />;
            case "users": return <UserManagement />;
            case "settings": return <SiteSettings />;
            default: return null;
        }
    };

    return (
        <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <TabsList>
                    <TabsTrigger value="problems">Problems</TabsTrigger>
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="settings">Site Settings</TabsTrigger>
                </TabsList>
            </Tabs>
            <div>{renderContent()}</div>
        </div>
    );
};
// #endregion

    