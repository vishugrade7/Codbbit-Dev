
"use client";

import { useEffect, useState, useMemo, useRef, Suspense, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { doc, getDoc, collection, query, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, Course, Module, Lesson, User as AppUser, NavLink, Badge, ContentBlock } from "@/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { upsertProblemToFirestore, bulkUpsertProblemsFromJSON, addCategory, upsertCourseToFirestore, getAllUsers, setAdminStatus, getNavigationSettings, updateNavigationSettings, getBadges, upsertBadge, deleteBadge as deleteBadgeAction, getProblemCategories, updateCategoryDetails, deleteCategory } from "../../app/upload-problem/actions";
import { problemFormSchema, courseFormSchema, navLinksSchema, badgeFormSchema } from "@/lib/admin-schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, UploadCloud, Edit, Search, ArrowLeft, ArrowRight, BookOpenCheck, FileQuestion, GripVertical, FileVideo, FileText, BrainCircuit, Grip, UserCog, Menu as MenuIcon, Award, MousePointerClick, Code, Image as ImageIcon, Building, Columns } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormDescription } from "@/components/ui/form";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type CompanySuggestion = {
  name: string;
  domain: string;
  logo: string;
};

type ProblemWithCategory = Problem & { categoryName: string };

type AdminContextType = {
  allProblems: ProblemWithCategory[];
  loadingProblems: boolean;
  categories: string[];
  loadingCategories: boolean;
  fetchCategories: () => void;
  fetchProblems: () => void;
  courses: Course[];
  loadingCourses: boolean;
  fetchCourses: () => void;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const { user: authUser, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [loadingProblems, setLoadingProblems] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    const isAuthorized = useMemo(() => {
        if (authLoading) return undefined; // Undetermined state
        return userData?.isAdmin || authUser?.email === 'gradevishu@gmail.com';
    }, [userData, authUser, authLoading]);
    
    useEffect(() => {
        if (isAuthorized === false) { // Explicitly check for false
            toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page." });
            router.push('/');
        }
    }, [isAuthorized, router, toast]);

    const fetchProblems = useCallback(async () => {
        setLoadingProblems(true);
        try {
            const apexDocRef = doc(db, "problems", "Apex");
            const docSnap = await getDoc(apexDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data().Category as ApexProblemsData;
                const problemsData = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                );
                setAllProblems(problemsData.sort((a,b) => a.title.localeCompare(b.title)));
            }
        } catch (error) {
            console.error("Error fetching problems:", error);
            toast({ variant: 'destructive', title: 'Failed to load problems' });
        } finally {
            setLoadingProblems(false);
        }
    }, [toast]);

    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        try {
            const data = await getProblemCategories();
            setCategories(data.map(c => c.name).sort());
        } catch (error: any) {
            toast({ variant: "destructive", title: "Could not load categories." });
        } finally {
            setLoadingCategories(false);
        }
    }, [toast]);

     const fetchCourses = useCallback(async () => {
        setLoadingCourses(true);
        try {
            const coursesRef = collection(db, "courses");
            const q = query(coursesRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to load courses' });
        } finally {
            setLoadingCourses(false);
        }
    }, [toast]);

    if (authLoading || isAuthorized === undefined) {
        return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (!isAuthorized) {
        // This will be shown briefly before the redirect, or if redirect fails.
        return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center bg-background"><p>Redirecting...</p></div>;
    }

    return (
        <AdminContext.Provider value={{ allProblems, loadingProblems, categories, loadingCategories, fetchCategories, fetchProblems, courses, loadingCourses, fetchCourses }}>
            {children}
        </AdminContext.Provider>
    );
}


// #region Dashboard
export function AdminDashboard() {
    type ViewMode = 'dashboard' | 'problem-list' | 'problem-form' | 'course-list' | 'course-form' | 'user-management' | 'navigation-management' | 'badge-management';
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    
    const [currentProblem, setCurrentProblem] = useState<ProblemWithCategory | null>(null);
    const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
    
    const handleAddNewProblem = () => {
        setCurrentProblem(null);
        setViewMode('problem-form');
    }
    
    const handleEditProblem = (problem: ProblemWithCategory) => {
        setCurrentProblem(problem);
        setViewMode('problem-form');
    }

    const handleAddNewCourse = () => {
        setCurrentCourse(null);
        setViewMode('course-form');
    }

    const handleEditCourse = (course: Course) => {
        setCurrentCourse(course);
        setViewMode('course-form');
    }

    
    const renderContent = () => {
        switch (viewMode) {
            case 'problem-form':
                return <ProblemForm problem={currentProblem} onClose={() => setViewMode('problem-list')} />;
            case 'problem-list':
                return <ProblemList onEdit={handleEditProblem} onAddNew={handleAddNewProblem} />;
            case 'course-list':
                return <CourseList onEdit={handleEditCourse} onAddNew={handleAddNewCourse} />;
            case 'course-form':
                return <CourseForm course={currentCourse} onBack={() => setViewMode('course-list')} />;
            case 'user-management':
                return <AllUsersList />;
            case 'navigation-management':
                return <NavigationManagementView />;
            case 'badge-management':
                return <BadgeManagementView />;
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('problem-list')}
                        >
                            <CardHeader>
                                <CardTitle>Problem Management</CardTitle>
                                <CardDescription>View, edit, or add new Apex coding challenges to the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                    <FileQuestion className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                    Manage Problems <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                </div>
                            </CardFooter>
                        </Card>
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('course-list')}
                        >
                            <CardHeader>
                                <CardTitle>Course Management</CardTitle>
                                <CardDescription>Add, edit, or remove courses from the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                    <BookOpenCheck className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                    Manage Courses <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                </div>
                            </CardFooter>
                        </Card>
                         <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('user-management')}
                        >
                            <CardHeader>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Grant or revoke admin privileges for users.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <UserCog className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Users <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                         <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('navigation-management')}
                        >
                            <CardHeader>
                                <CardTitle>Navigation Management</CardTitle>
                                <CardDescription>Control the links displayed in the main app header.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <MenuIcon className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Navigation <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('badge-management')}
                        >
                            <CardHeader>
                                <CardTitle>Badge Management</CardTitle>
                                <CardDescription>Define criteria for awarding badges to users.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <Award className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Badges <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                    </div>
                );
        }
    };
    
    return (
        <div className="container py-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                {viewMode === 'dashboard' ? (
                     <div>
                        <h1 className="text-4xl font-bold font-headline">Admin Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage platform content including problems and courses.
                        </p>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                )}
            </div>
            {renderContent()}
        </div>
    );
}
// #endregion

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


// #region ProblemList
function ProblemList({ onEdit, onAddNew }: { onEdit: (p: ProblemWithCategory) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const { allProblems, loadingProblems, fetchProblems } = useAdmin();
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const handleBulkUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const content = await file.text();
            const result = await bulkUpsertProblemsFromJSON(content);
            if (result.success) {
                toast({ title: 'Success!', description: result.message });
                fetchProblems();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || 'Could not process the JSON file.',
                duration: 9000,
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const filteredProblems = useMemo(() => {
        return allProblems
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProblems, searchTerm, difficultyFilter]);

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
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
                <div className="flex items-center gap-2 shrink-0">
                     <Button onClick={() => setIsManageModalOpen(true)} variant="secondary">
                        <Edit className="mr-2 h-4 w-4" />
                        Manage Categories
                    </Button>
                     <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Category
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
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" disabled={isUploading} />
                <AddCategoryModal isOpen={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen} />
                <ManageCategoriesModal isOpen={isManageModalOpen} onOpenChange={setIsManageModalOpen} />

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
                
                <div className="mt-4">
                    {loadingProblems ? (
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
                                                <UiBadge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                    {problem.difficulty}
                                                </UiBadge>
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
                </div>
            </CardContent>
        </Card>
    );
}
// #endregion

// #region CourseList
function CourseList({ onEdit, onAddNew }: { onEdit: (c: Course) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const { courses, loadingCourses, fetchCourses } = useAdmin();

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    return (
        <Card>
            <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Course Management</CardTitle>
                    <CardDescription>View, edit, or add new courses to the platform.</CardDescription>
                </div>
                <Button onClick={onAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Course
                </Button>
            </CardHeader>
            <CardContent>
                <div className="mt-4">
                    {loadingCourses ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : courses.length > 0 ? (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Modules</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {courses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">{course.title}</TableCell>
                                            <TableCell>{course.category}</TableCell>
                                            <TableCell>{course.modules?.length || 0}</TableCell>
                                            <TableCell>
                                                <UiBadge variant={course.isPublished ? "default" : "secondary"}>
                                                    {course.isPublished ? "Published" : "Draft"}
                                                </UiBadge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => onEdit(course)}>
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
                            <p className="text-muted-foreground">No courses found. Add one to get started.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
// #endregion

// #region UserManagement
function AllUsersList() {
    const { user: authUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const result = await getAllUsers();
        if (result.success) {
            setUsers(result.users);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
        if (userId === authUser?.uid) {
            toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'You cannot revoke your own admin access.' });
            return;
        }
        setUpdatingId(userId);
        const result = await setAdminStatus(userId, !currentStatus);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            await fetchUsers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setUpdatingId(null);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Grant or revoke admin privileges for any user. An admin cannot revoke their own access.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="w-[150px] text-right">Admin Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                                {updatingId === user.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Switch
                                                        checked={!!user.isAdmin}
                                                        onCheckedChange={() => handleToggleAdmin(user.id, user.isAdmin ?? false)}
                                                        disabled={user.id === authUser?.uid}
                                                        aria-label={`Toggle admin status for ${user.name}`}
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// #endregion

// #region NavigationManagementView
function NavigationManagementView() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof navLinksSchema>>({
        resolver: zodResolver(navLinksSchema),
        defaultValues: { links: [] }
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "links" });

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const links = await getNavigationSettings();
                form.reset({ links });
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error', description: "Could not load navigation settings." });
            }
            setIsLoading(false);
        };
        loadSettings();
    }, [form, toast]);

    const onSubmit = async (data: z.infer<typeof navLinksSchema>) => {
        setIsSaving(true);
        const result = await updateNavigationSettings(data.links);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    if (isLoading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Navigation Management</CardTitle>
                <CardDescription>Configure the main application navigation links.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </CardContent>
        </Card>
      )
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Navigation Management</CardTitle>
                        <CardDescription>Enable, disable, add, or remove navigation links.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start sm:items-center gap-2 p-3 border rounded-lg flex-col sm:flex-row">
                                <GripVertical className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                                    <FormField
                                        control={form.control}
                                        name={`links.${index}.label`}
                                        render={({ field }) => <FormItem><FormLabel className="sm:hidden">Label</FormLabel><FormControl><Input placeholder="Label" {...field} /></FormControl><FormMessage/></FormItem>}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`links.${index}.href`}
                                        render={({ field }) => <FormItem><FormLabel className="sm:hidden">Href</FormLabel><FormControl><Input placeholder="Href (e.g. /about)" {...field} /></FormControl><FormMessage/></FormItem>}
                                    />
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto">
                                    <div className="flex items-center gap-4 pl-2">
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.isEnabled`}
                                            render={({ field: switchField }) => (
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`enabled-${index}`} className="text-sm">Enabled</Label>
                                                    <Switch id={`enabled-${index}`} checked={switchField.value} onCheckedChange={switchField.onChange} />
                                                </div>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" disabled={field.isProtected} onClick={() => remove(index)} className="text-destructive disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), label: '', href: '/', isEnabled: false, isProtected: false })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Link
                        </Button>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}
// #endregion

// #region BadgeManagement
function BadgeManagementView() {
    const { toast } = useToast();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);

    const fetchBadges = useCallback(async () => {
        setLoading(true);
        const result = await getBadges();
        if (result.success) {
            setBadges(result.badges);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchBadges();
    }, [fetchBadges]);
    
    const handleAdd = () => {
        setCurrentBadge(null);
        setDialogOpen(true);
    };
    
    const handleEdit = (badge: Badge) => {
        setCurrentBadge(badge);
        setDialogOpen(true);
    };

    const handleDelete = async (badgeId: string) => {
        const result = await deleteBadgeAction(badgeId);
         if (result.success) {
            toast({ title: 'Success!', description: result.message });
            fetchBadges();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const handleFormSubmit = () => {
        setDialogOpen(false);
        fetchBadges();
    };

    return (
        <Card>
            <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Badge Management</CardTitle>
                    <CardDescription>Define and manage the criteria for awarding achievement badges.</CardDescription>
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Badge
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Badge Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {badges.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No badges found. Add one to get started.</TableCell>
                                    </TableRow>
                                ) : (
                                    badges.map((badge) => (
                                        <TableRow key={badge.id}>
                                            <TableCell className="font-medium">{badge.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{badge.description}</TableCell>
                                            <TableCell><UiBadge variant="secondary">{badge.type}</UiBadge></TableCell>
                                            <TableCell>{badge.value} {badge.type === 'CATEGORY_SOLVED' ? `in ${badge.category}` : ''}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(badge)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(badge.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
            <BadgeFormDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                badge={currentBadge}
                onFormSubmit={handleFormSubmit}
            />
        </Card>
    )
}

function BadgeFormDialog({ isOpen, onOpenChange, badge, onFormSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, badge: Badge | null, onFormSubmit: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const formMode = badge ? 'edit' : 'add';

    const form = useForm<z.infer<typeof badgeFormSchema>>({
        resolver: zodResolver(badgeFormSchema),
        defaultValues: {
            id: badge?.id,
            name: badge?.name || '',
            description: badge?.description || '',
            type: badge?.type || 'POINTS',
            value: badge?.value || 1,
            category: badge?.category || '',
        },
    });

    const badgeType = form.watch('type');
    
    useEffect(() => {
        form.reset({
            id: badge?.id,
            name: badge?.name || '',
            description: badge?.description || '',
            type: badge?.type || 'POINTS',
            value: badge?.value || 1,
            category: badge?.category || '',
        });
    }, [badge, form]);

    const onSubmit = async (values: z.infer<typeof badgeFormSchema>) => {
        setIsSaving(true);
        const result = await upsertBadge(values);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            onFormSubmit();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{formMode === 'add' ? 'Add New Badge' : 'Edit Badge'}</DialogTitle>
                    <DialogDescription>Define the criteria for this achievement.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Badge Name</FormLabel><FormControl><Input placeholder="e.g., Streak Starter" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Solve problems 3 days in a row" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="STREAK">Streak</SelectItem>
                                    <SelectItem value="POINTS">Points</SelectItem>
                                    <SelectItem value="TOTAL_SOLVED">Total Solved</SelectItem>
                                    <SelectItem value="CATEGORY_SOLVED">Category Solved</SelectItem>
                                    <SelectItem value="ACTIVE_DAYS">Active Days</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="value" render={({ field }) => (
                                <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        {badgeType === 'CATEGORY_SOLVED' && (
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Problem Category</FormLabel><FormControl><Input placeholder="e.g., Arrays & Hashing" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Badge
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// #endregion

// #region AddCategoryModal
function AddCategoryModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { fetchCategories, fetchProblems } = useAdmin();
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
            fetchCategories();
            fetchProblems();
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
// #endregion

// #region ManageCategoriesModal
type EditableCategory = {
    originalName: string;
    name: string;
    imageUrl?: string;
    problemCount: number;
}

function ManageCategoriesModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const { fetchCategories: onCategoriesUpdated, fetchProblems } = useAdmin();
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
            fetchProblems();
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
            fetchProblems();
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
// #endregion

// #region ProblemForm
function ProblemForm({ problem, onClose }: { problem: ProblemWithCategory | null, onClose: () => void }) {
    const { toast } = useToast();
    const { resolvedTheme } = useTheme();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { categories, loadingCategories, fetchCategories, fetchProblems } = useAdmin();

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
        const defaultValues = {
            id: problem?.id || '',
            title: problem?.title || '',
            description: problem?.description || '',
            category: problem?.categoryName || '',
            difficulty: problem?.difficulty || "Easy",
            metadataType: problem?.metadataType || "Class",
            triggerSObject: problem?.triggerSObject || "",
            sampleCode: problem?.sampleCode || '',
            testcases: problem?.testcases || '',
            examples: problem?.examples?.length ? problem.examples.map(e => ({...e})) : [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }],
            hints: problem?.hints?.length ? problem.hints.map(h => ({ value: h })) : [{value: ""}],
            company: problem?.company || "",
            companyLogoUrl: problem?.companyLogoUrl || "",
            isPremium: problem?.isPremium || false,
        };
        form.reset(defaultValues);
        setCompanyLogo(problem?.companyLogoUrl || null);
        setSelectedCompanyName(problem?.company || null);
    }, [problem, form]);

    const metadataTypeValue = form.watch("metadataType");
    const companyValue = form.watch("company");

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
            fetchProblems();
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
                                <FormField control={form.control} name="isPremium" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Premium Problem</FormLabel>
                                            <FormDescription>
                                                Mark this problem as premium content.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (HTML supported)</FormLabel>
                                    <FormControl><Textarea placeholder="Provide a detailed description of the problem..." {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="difficulty" render={({ field }) => (
                                    <FormItem><FormLabel>Difficulty</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="metadataType" render={({ field }) => (
                                    <FormItem><FormLabel>Metadata Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Class">Class</SelectItem><SelectItem value="Trigger">Trigger</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
                            {formMode === 'add' ? 'Upload Problem' : 'Update Problem'}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
// #endregion

// #region CourseForm

function DraggableContentBlock({ id, children }: { id: string; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && "shadow-lg opacity-90")}>
            <div className="p-3 border rounded bg-card/50 flex items-start gap-2">
                <span {...attributes} {...listeners} className="cursor-grab py-2 touch-none">
                     <GripVertical className="h-5 w-5 text-muted-foreground" />
                </span>
                <div className="flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
}

function CourseForm({ course, onBack }: { course: Course | null, onBack: () => void }) {
    const { user: authUser } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formMode = course ? 'edit' : 'add';
    const { allProblems, loadingProblems, fetchProblems } = useAdmin();

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            id: course?.id,
            title: course?.title || '',
            description: course?.description || '',
            category: course?.category || '',
            thumbnailUrl: course?.thumbnailUrl || '',
            modules: course?.modules || [{ id: crypto.randomUUID(), title: '', lessons: [{ id: crypto.randomUUID(), title: '', isFree: true, contentBlocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] }] }],
            isPublished: course?.isPublished || false,
            isPremium: course?.isPremium || false,
        },
    });

     useEffect(() => {
        if (course) {
            form.reset({
                id: course.id,
                title: course.title,
                description: course.description,
                category: course.category,
                thumbnailUrl: course.thumbnailUrl,
                modules: course.modules.map(m => ({
                    ...m,
                    lessons: m.lessons.map(l => ({
                        ...l,
                        contentBlocks: l.contentBlocks || [],
                    }))
                })),
                isPublished: course.isPublished,
                isPremium: course.isPremium || false,
            });
        }
    }, [course, form]);

    const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({ control: form.control, name: "modules" });

    async function onSubmit(values: z.infer<typeof courseFormSchema>) {
        if (!authUser) {
            toast({ variant: 'destructive', title: "Not authenticated" });
            return;
        }
        setIsSubmitting(true);
        const dataToSave = { ...values, createdBy: authUser.uid };
        const result = await upsertCourseToFirestore(dataToSave);
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            onBack();
        } else {
            toast({ variant: "destructive", title: "Save Failed", description: result.error });
        }
        setIsSubmitting(false);
    }
    
    return (
      <div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{formMode === 'add' ? 'Create New Course' : 'Edit Course'}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Course Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Apex" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Apex, LWC" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                                <FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="space-y-4">
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem className="flex flex-col h-full"><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the course..." {...field} className="flex-grow" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <div className="md:col-span-2 space-y-4">
                             <FormField control={form.control} name="isPublished" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5"><FormLabel>Publish Course</FormLabel><FormDescription>Make this course visible to all users.</FormDescription></div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                             )} />
                             <FormField control={form.control} name="isPremium" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Premium Course</FormLabel>
                                        <FormDescription>
                                            Mark this course as premium content.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                             )} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Modules & Lessons</CardTitle>
                        <CardDescription>Organize your course content into modules and lessons.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full" defaultValue={['module-0']}>
                            {moduleFields.map((moduleItem, moduleIndex) => (
                                <AccordionItem key={moduleItem.id} value={`module-${moduleIndex}`} className="border rounded-lg mb-4 bg-card">
                                    <AccordionTrigger className="px-4 hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1">
                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                            <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl><Input placeholder={`Module ${moduleIndex + 1}: Title`} {...field} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 border-t">
                                        <LessonList
                                            moduleIndex={moduleIndex}
                                            control={form.control}
                                        />
                                        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => removeModule(moduleIndex)}><Trash2 className="mr-2 h-4 w-4"/>Remove Module</Button>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <Button type="button" variant="outline" onClick={() => appendModule({ id: crypto.randomUUID(), title: '', lessons: [{ id: crypto.randomUUID(), title: '', isFree: true, contentBlocks: [{id: crypto.randomUUID(), type: 'text', content: '' }] }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Module</Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {formMode === 'add' ? 'Create Course' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    </div>
    );
}

function LessonList({ moduleIndex, control }: { moduleIndex: number, control: any }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `modules.${moduleIndex}.lessons`
    });

    return (
        <div className="space-y-3 pl-6 border-l-2 border-dashed">
            {fields.map((lessonItem, lessonIndex) => (
                <div key={lessonItem.id} className="p-4 border rounded-md bg-background/50 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => remove(lessonIndex)}><Trash2 className="h-4 w-4" /></Button>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                            <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input placeholder={`Lesson ${lessonIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.isFree`} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full mt-auto">
                                <div className="space-y-0.5">
                                    <FormLabel>Free Lesson</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                         )} />
                    </div>
                     <div className="mt-4">
                        <ContentBlockList
                            name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks`}
                            control={control} 
                        />
                     </div>
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: crypto.randomUUID(), title: '', isFree: true, contentBlocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Lesson</Button>
        </div>
    );
}

function ContentBlockList({ name, control, isNested = false }: { name: string, control: any, isNested?: boolean }) {
    const { allProblems, loadingProblems } = useAdmin();
    const { fields, append, remove, move } = useFieldArray({
        control,
        name
    });

    const addBlock = (type: ContentBlock['type']) => {
        const newBlock: any = { id: crypto.randomUUID(), type, content: '' };
        if (type === 'columns') {
            newBlock.columnData = [ { blocks: [] }, { blocks: [] } ];
        }
        append(newBlock);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((field) => field.id === active.id);
            const newIndex = fields.findIndex((field) => field.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                move(oldIndex, newIndex);
            }
        }
    };
    
    const listContent = (
        <div className="space-y-4">
            {fields.map((block, blockIndex) => (
                <div key={block.id}>
                    <ContentBlockItem
                        parentName={name}
                        blockIndex={blockIndex}
                        control={control}
                        onRemove={() => remove(blockIndex)}
                        isNested={isNested}
                    />
                </div>
            ))}
        </div>
    );


    return (
        <div className="space-y-4">
            <Label>Lesson Content</Label>
            {fields.length > 0 && (
                 <div className="space-y-4 rounded-md border p-4">
                    {!isNested ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                                {listContent}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        listContent
                    )}
                </div>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Content Block</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => addBlock('text')}><FileText className="mr-2 h-4 w-4" />Text</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('image')}><ImageIcon className="mr-2 h-4 w-4" />Image</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('code')}><Code className="mr-2 h-4 w-4" />Code</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('video')}><FileVideo className="mr-2 h-4 w-4" />Video</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('problem')}><BrainCircuit className="mr-2 h-4 w-4" />Problem</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('interactive')}><MousePointerClick className="mr-2 h-4 w-4" />Interactive</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => addBlock('columns')}><Columns className="mr-2 h-4 w-4" />Two Column Layout</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function ContentBlockItem({ parentName, blockIndex, control, onRemove, isNested }: { parentName: string, blockIndex: number, control: any, onRemove: () => void, isNested: boolean }) {
    const { resolvedTheme } = useTheme();
    const { allProblems, loadingProblems } = useAdmin();
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: useWatch({ control, name: `${parentName}.${blockIndex}.id` }) });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };
    
    const block = useWatch({ control, name: `${parentName}.${blockIndex}`});

    const getBlockContent = () => {
        switch (block.type) {
            case 'text':
                return <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                    <FormItem><FormLabel>Text (Markdown supported)</FormLabel><FormControl><Textarea placeholder="Enter Markdown-enabled text..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                )} />;
            case 'image':
                return (
                    <div className="space-y-4">
                        <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                            <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={control} name={`${parentName}.${blockIndex}.caption`} render={({ field }) => (
                            <FormItem><FormLabel>Caption (optional)</FormLabel><FormControl><Input placeholder="A descriptive caption" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                );
            case 'code':
                return (
                     <div className="space-y-4">
                        <FormField control={control} name={`${parentName}.${blockIndex}.language`} render={({ field }) => (
                            <FormItem><FormLabel>Language</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="apex">Apex</SelectItem>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="soql">SOQL</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                         <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                            <FormItem><FormLabel>Code</FormLabel><FormControl>
                                <div className="rounded-md border h-60 w-full">
                                <MonacoEditor height="100%" language={block.language || 'apex'} value={field.value} onChange={v => field.onChange(v || "")} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false } }} />
                                </div>
                            </FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                );
            case 'video':
                return <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                    <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />;
            case 'problem':
                return <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                    <FormItem><FormLabel>Problem</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger disabled={loadingProblems}><SelectValue placeholder="Select a problem..." /></SelectTrigger></FormControl>
                            <SelectContent>{loadingProblems ? <SelectItem value="loading" disabled>Loading...</SelectItem> : allProblems.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />;
            case 'interactive':
                return <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                    <FormItem><FormLabel>Interactive HTML</FormLabel><FormControl>
                        <div className="rounded-md border h-96 w-full">
                            <MonacoEditor height="100%" language="html" value={field.value} onChange={v => field.onChange(v || "")} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false } }} />
                        </div>
                    </FormControl><FormMessage /></FormItem>
                )} />;
            case 'columns':
                return (
                    <div>
                        <Label className="font-semibold">Two-Column Layout</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            {(block.columnData || []).map((_, colIndex) => (
                                <div key={`${block.id}-${colIndex}`} className="p-2 border rounded-md bg-muted/30 flex flex-col gap-2">
                                   <h4 className="font-bold text-sm text-muted-foreground p-2">Column {colIndex + 1}</h4>
                                    <ContentBlockList
                                        control={control}
                                        name={`${parentName}.${blockIndex}.columnData.${colIndex}.blocks`}
                                        isNested={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const mainContent = (
         <div className="p-3 border rounded bg-card/50 flex items-start gap-2">
            {!isNested && (
                <span {...attributes} {...listeners} className="cursor-grab py-2 touch-none">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </span>
            )}
            <div className="flex-grow">
                 <div className="relative w-full">
                    <div className="absolute top-0 right-0 z-10">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    {getBlockContent()}
                </div>
            </div>
        </div>
    );
    
     if (isNested) {
        return mainContent;
    }

    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && "shadow-lg opacity-90")}>
            {mainContent}
        </div>
    );
}
// #endregion
