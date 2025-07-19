
"use client";

import { useCallback, useEffect, useState, useRef, useMemo, createContext, useContext } from "react";
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock, Problem, ApexProblemsData } from "@/types";
import { courseFormSchema } from "@/lib/admin-schemas";
import { upsertCourseToFirestore, uploadCourseImage } from "@/app/upload-problem/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Edit, GripVertical, ArrowLeft, UploadCloud, ChevronDown, Code, Type, Image as ImageIcon, Video, Mic, List, CheckSquare, MessageSquare, AlertCircle, Divide, Link as LinkIcon, Puzzle, Play, BrainCircuit, Columns, ListOrdered, PlayCircle, ToggleRight, Link2, GitBranch } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { v4 as uuidv4 } from 'uuid';
import MonacoEditor from '@monaco-editor/react';
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCache, setCache } from "@/lib/cache";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';
type ProblemWithCategory = Problem & { categoryName: string };

// #region Main View
export function CourseManagementView() {
    const router = useRouter();

    const handleAddNewCourse = async () => {
        router.push(`/upload-problem?view=course-form`);
    };

    const handleEditCourse = (courseId: string) => {
        router.push(`/upload-problem?view=course-form&courseId=${courseId}`);
    };

    return <CourseList onEdit={handleEditCourse} onAdd={handleAddNewCourse} />;
}

function CourseList({ onEdit, onAdd }: { onEdit: (id: string) => void, onAdd: () => void }) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const coursesRef = collection(db, "courses");
                const q = query(coursesRef, orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const coursesData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
                    return { id: doc.id, ...data, createdAt } as Course;
                });
                setCourses(coursesData);
            } catch (error) {
                console.error("Error fetching courses: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load courses.' });
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [toast]);
    
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Course Management</CardTitle>
                    <CardDescription>Create, edit, and manage your interactive courses.</CardDescription>
                </div>
                <Button onClick={onAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add New Course</Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Modules</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {courses.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No courses found.</TableCell></TableRow>
                                ) : (
                                    courses.map(course => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">{course.title}</TableCell>
                                            <TableCell>{course.isPublished ? 'Published' : 'Draft'}</TableCell>
                                            <TableCell>{course.modules.length}</TableCell>
                                            <TableCell>{course.createdAt ? format(course.createdAt, "PPP") : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => onEdit(course.id)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
// #endregion

// #region Course Form & Context
type CourseFormContextType = {
  problems: ProblemWithCategory[];
  loadingProblems: boolean;
};

let FormContext: React.Context<CourseFormContextType | null> = null;

export function CourseFormContext({ children }: { children: React.ReactNode }) {
    const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
    const [loadingProblems, setLoadingProblems] = useState(true);

    useEffect(() => {
        const fetchProblems = async () => {
            setLoadingProblems(true);
            const processData = (data: ApexProblemsData | null) => {
                if (!data) return;
                const allProblems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(p => ({ ...p, categoryName }))
                );
                setProblems(allProblems);
            };
            const cached = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
            if (cached) {
                processData(cached);
            } else {
                const docRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data().Category as ApexProblemsData;
                    await setCache(APEX_PROBLEMS_CACHE_KEY, data);
                    processData(data);
                }
            }
            setLoadingProblems(false);
        };
        fetchProblems();
    }, []);

    if (!FormContext) {
        FormContext = createContext<CourseFormContextType | null>(null);
    }
    
    const contextValue = useMemo(() => ({ problems, loadingProblems }), [problems, loadingProblems]);

    return (
        <FormContext.Provider value={contextValue}>
            {children}
        </FormContext.Provider>
    );
};

const useCourseFormContext = () => {
    if (!FormContext) {
      throw new Error("CourseFormContext has not been initialized");
    }
    const context = useContext(FormContext);
    if (!context) throw new Error("useCourseFormContext must be used within a CourseFormContext Provider");
    return context;
};

export function CourseForm({ courseId, onBack }: { courseId: string | null, onBack: () => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [currentCourseId, setCurrentCourseId] = useState(courseId);

    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            title: '', description: '', category: '', thumbnailUrl: '',
            modules: [], isPublished: false, isPremium: false,
        }
    });

    const { control, setValue, watch, handleSubmit, reset } = form;
    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control, name: "modules" });
    const thumbnailUrl = watch("thumbnailUrl");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentCourseId) {
            const fetchCourse = async () => {
                const docRef = doc(db, 'courses', currentCourseId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    reset(docSnap.data() as z.infer<typeof courseFormSchema>);
                }
            }
            fetchCourse();
        } else {
            reset({
              title: '', description: '', category: '', thumbnailUrl: '',
              modules: [], isPublished: false, isPremium: false,
            });
        }
    }, [currentCourseId, reset]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentCourseId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please save the course first to get a Course ID for uploads.'});
            return;
        };
        setIsSaving(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const result = await uploadCourseImage(reader.result as string, currentCourseId);
            if (result.success && result.url) {
                setValue("thumbnailUrl", result.url, { shouldDirty: true });
                toast({ title: 'Image uploaded successfully!' });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setIsSaving(false);
        };
    };

    const onSubmit = async (data: z.infer<typeof courseFormSchema>) => {
        setIsSaving(true);
        const result = await upsertCourseToFirestore({
          ...(currentCourseId && { id: currentCourseId }),
          ...data,
        });
        if (result.success) {
            toast({ title: 'Success!', description: 'Course saved successfully.' });
            if (result.courseId && !currentCourseId) {
                 setCurrentCourseId(result.courseId);
                 router.replace(`/upload-problem?view=course-form&courseId=${result.courseId}`, { scroll: false });
            }
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
          const oldIndex = moduleFields.findIndex(f => f.id === active.id);
          const newIndex = moduleFields.findIndex(f => f.id === over.id);
          moveModule(oldIndex, newIndex);
      }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex justify-between items-center mb-6">
                    <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Course
                    </Button>
                </div>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           </div>
                           <FormField control={control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={control} name="thumbnailUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Thumbnail URL</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <FormControl><Input {...field} /></FormControl>
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!currentCourseId || isSaving}>
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload
                                        </Button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    {thumbnailUrl && <Image src={thumbnailUrl} alt="Thumbnail preview" width={200} height={100} className="rounded-md object-cover mt-2" />}
                                    <FormMessage />
                                </FormItem>
                           )}/>
                           <div className="flex gap-4">
                            <FormField control={control} name="isPublished" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><div className="space-y-0.5 mr-4"><FormLabel>Published</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                            <FormField control={control} name="isPremium" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><div className="space-y-0.5 mr-4"><FormLabel>Premium</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                           </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Modules</CardTitle>
                            <CardDescription>Add and reorder course modules. Click a module to edit its lessons.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={moduleFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                  <div className="space-y-4">
                                    {moduleFields.map((field, index) => (
                                        <ModuleItem key={field.id} moduleIndex={index} courseId={currentCourseId!} onRemove={() => removeModule(index)} />
                                    ))}
                                  </div>
                                </SortableContext>
                            </DndContext>
                            <Button type="button" variant="outline" className="mt-4" onClick={() => appendModule({ id: uuidv4(), title: 'New Module', lessons: [] })}><PlusCircle className="mr-2 h-4 w-4"/> Add Module</Button>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </FormProvider>
    );
}
// #endregion

// #region Module Item
function ModuleItem({ moduleIndex, courseId, onRemove }: { moduleIndex: number, courseId: string, onRemove: () => void }) {
    const { getValues, register } = useFormContext<z.infer<typeof courseFormSchema>>();
    const router = useRouter();
    const module = getValues(`modules.${moduleIndex}`);
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div ref={setNodeRef} style={style}>
            <Card className="bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-2 p-3">
                    <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                    <div className="flex-1">
                        <Input placeholder="Module Title" {...register(`modules.${moduleIndex}.title`)} />
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => router.push(`/upload-problem/module/${module.id}?courseId=${courseId}`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Lessons ({module.lessons.length})
                    </Button>
                    <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                </CardHeader>
            </Card>
        </div>
    );
}
// #endregion

// #region Module Lessons Editor
export function ModuleLessonsEditor({ moduleIndex }: { moduleIndex: number }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields: lessonFields, append: appendLesson, remove: removeLesson, move: moveLesson } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons` });

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = lessonFields.findIndex(f => f.id === active.id);
            const newIndex = lessonFields.findIndex(f => f.id === over.id);
            moveLesson(oldIndex, newIndex);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Lessons</CardTitle>
                <CardDescription>Add, edit, and reorder lessons for this module.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={lessonFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        {lessonFields.map((field, index) => (
                            <LessonItem key={field.id} moduleIndex={moduleIndex} lessonIndex={index} onRemove={() => removeLesson(index)} />
                        ))}
                    </SortableContext>
                </DndContext>
                <Button type="button" variant="secondary" size="sm" onClick={() => appendLesson({ id: uuidv4(), title: '', isFree: false, contentBlocks: [{ id: uuidv4(), type: 'text', content: 'New lesson content...' }] })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
            </CardContent>
        </Card>
    );
}
// #endregion

// #region Lesson Item
function LessonItem({ moduleIndex, lessonIndex, onRemove }: { moduleIndex: number, lessonIndex: number, onRemove: () => void }) {
    const { control, register, getValues } = useFormContext<z.infer<typeof courseFormSchema>>();
    const lesson = getValues(`modules.${moduleIndex}.lessons.${lessonIndex}`);
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div ref={setNodeRef} style={style} className="p-2 border rounded-md bg-background">
            <div className="flex items-center gap-2">
                 <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
                 <Input placeholder="Lesson Title" {...register(`modules.${moduleIndex}.lessons.${lessonIndex}.title`)} className="flex-1" />
                 <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.isFree`} render={({ field }) => (<FormItem className="flex items-center gap-2"><FormLabel className="text-xs">Free</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}><ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></Button>
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {isOpen && (
                <div className="mt-2 p-2 border-t">
                    <ContentBlockEditor moduleIndex={moduleIndex} lessonIndex={lessonIndex} />
                </div>
            )}
        </div>
    );
}
// #endregion

// #region Content Block Editor
const BLOCKS = {
  text: { label: 'Text', icon: <Type size={18} /> },
  heading1: { label: 'Heading 1', icon: <h1 className="font-bold text-lg">H1</h1> },
  heading2: { label: 'Heading 2', icon: <h2 className="font-bold text-base">H2</h2> },
  heading3: { label: 'Heading 3', icon: <h3 className="font-bold text-sm">H3</h3> },
  'bulleted-list': { label: 'Bulleted List', icon: <List size={18} /> },
  'numbered-list': { label: 'Numbered List', icon: <ListOrdered size={18} /> },
  'todo-list': { label: 'Todo List', icon: <CheckSquare size={18} /> },
  quote: { label: 'Quote', icon: <MessageSquare size={18} /> },
  code: { label: 'Code', icon: <Code size={18} /> },
  image: { label: 'Image', icon: <ImageIcon size={18} /> },
  video: { label: 'Video', icon: <Video size={18} /> },
  audio: { label: 'Audio', icon: <Mic size={18} /> },
  table: { label: 'Table', icon: <Table size={18} /> },
  'two-column': { label: 'Two Columns', icon: <Columns size={18} /> },
  breadcrumb: { label: 'Breadcrumb', icon: <Link2 size={18} /> },
  problem: { label: 'Problem', icon: <Puzzle size={18} /> },
  mcq: { label: 'MCQ', icon: <BrainCircuit size={18} /> },
  'toggle-list': { label: 'Toggle List', icon: <ToggleRight size={18} /> },
  divider: { label: 'Divider', icon: <Divide size={18} /> },
  'interactive-code': { label: 'Interactive Code', icon: <Play size={18} /> },
  'live-code': { label: 'Live Code', icon: <PlayCircle size={18} /> },
  stepper: { label: 'Stepper', icon: <ListOrdered size={18} /> },
  mermaid: { label: 'Mermaid Diagram', icon: <GitBranch size={18} /> },
  mindmap: { label: 'Mindmap', icon: <BrainCircuit size={18} /> },
};

const createNewBlock = (type: keyof typeof BLOCKS): ContentBlock => {
  const baseBlock = { id: uuidv4(), type };
  switch (type) {
    case 'text':
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'quote':
      return { ...baseBlock, content: `This is a ${type}` };
    case 'bulleted-list':
    case 'numbered-list':
      return { ...baseBlock, content: '- List item' };
    case 'todo-list':
      return { ...baseBlock, content: [{ id: uuidv4(), text: 'Todo item', checked: false }] };
    case 'code':
      return { ...baseBlock, content: { code: 'console.log("Hello, World!");', language: 'javascript' } };
    case 'image':
      return { ...baseBlock, content: 'https://placehold.co/600x400' };
    case 'video':
       return { ...baseBlock, content: 'https://www.youtube.com/embed/dQw4w9WgXcQ' };
    case 'audio':
        return { ...baseBlock, content: 'https://example.com/audio.mp3' };
    case 'table':
        return { ...baseBlock, content: { headers: ['Header 1', 'Header 2'], rows: [{ id: uuidv4(), values: ['Cell 1', 'Cell 2']}]} };
    case 'two-column':
        return { ...baseBlock, content: { column1: [], column2: [] } };
    case 'three-column':
        return { ...baseBlock, content: { column1: [], column2: [], column3: [] } };
    case 'breadcrumb':
        return { ...baseBlock, content: [{id: uuidv4(), text: 'Home', href: '/'}] };
    case 'problem':
        return { ...baseBlock, content: { problemId: '', title: '', categoryName: '' } };
    case 'mcq':
        return { ...baseBlock, content: { id: uuidv4(), question: 'What is 2+2?', options: [{id: uuidv4(), text: '3'}, {id: uuidv4(), text: '4'}, {id: uuidv4(), text: '5'}], correctAnswerIndex: 1, explanation: '' } };
    case 'toggle-list':
        return { ...baseBlock, content: { title: 'Toggle Title', text: 'Hidden content' } };
    case 'divider':
        return { ...baseBlock, content: "" };
    case 'interactive-code':
        return { ...baseBlock, content: { title: 'Assignment', description: 'Solve this code.', defaultCode: 'console.log("hello");', executionType: 'anonymous'} };
    case 'stepper':
        return { ...baseBlock, content: { title: 'My Stepper', steps: [{id: uuidv4(), title: 'Step 1', content: [{id: uuidv4(), type: 'text', content: 'Step 1 content'}]}] } };
    case 'mermaid':
        return { ...baseBlock, content: 'graph TD;\n    A-->B;' };
    case 'mindmap':
        return { ...baseBlock, content: JSON.stringify({ root: { id: 'root', label: 'Central Idea', children: [{ id: 'child1', label: 'Main Topic 1' }] } }, null, 2) };
    case 'live-code':
        return { ...baseBlock, content: { html: '<h1>Hello</h1>', css: 'h1 { color: blue; }', js: '/* JS here */' } };
    default:
      return { ...baseBlock, content: 'New Block' };
  }
};

const BlockSelector = ({ onSelect, close }: { onSelect: (type: keyof typeof BLOCKS) => void, close: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

   return (
    <div ref={ref} className="absolute z-10 w-72 bg-popover rounded-md shadow-lg border max-h-96 overflow-y-auto">
      <div className="p-2">
        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">BLOCKS</p>
        {Object.entries(BLOCKS).map(([type, { label, icon }]) => (
          <button
            key={type}
            onClick={() => onSelect(type as keyof typeof BLOCKS)}
            className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent"
          >
            <div className="w-8 h-8 flex items-center justify-center border rounded-md bg-background">
              {icon}
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const AddBlockButton = ({ onAdd, isPageLevel = false }: { onAdd: (type: keyof typeof BLOCKS) => void, isPageLevel?: boolean }) => {
    const [isSelecting, setIsSelecting] = useState(false);

    const handleSelect = (type: keyof typeof BLOCKS) => {
        onAdd(type);
        setIsSelecting(false);
    };

    return (
        <div className="relative flex items-center justify-center my-4">
            {isPageLevel && <div className="flex-grow border-t"></div>}
            <button
                 type="button"
                 onClick={() => setIsSelecting(true)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${isPageLevel ? 'mx-4 bg-background border hover:bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
            >
                <PlusCircle size={16} />
                <span>Add Block</span>
            </button>
            {isPageLevel && <div className="flex-grow border-t"></div>}
            {isSelecting && <BlockSelector onSelect={handleSelect} close={() => setIsSelecting(false)} />}
        </div>
    );
};

function ContentBlockEditor({ moduleIndex, lessonIndex }: { moduleIndex: number, lessonIndex: number }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove, move, insert } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks` });
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        move(oldIndex, newIndex);
      }
    };
    
    const addBlock = (type: keyof typeof BLOCKS, index: number) => {
        const newBlock = createNewBlock(type);
        insert(index, newBlock as any);
    };

    return (
        <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field, index) => (
                      <div key={field.id}>
                        <ContentBlockItem moduleIndex={moduleIndex} lessonIndex={lessonIndex} blockIndex={index} onRemove={() => remove(index)} />
                        <AddBlockButton onAdd={(type) => addBlock(type, index + 1)} />
                      </div>
                    ))}
                </SortableContext>
            </DndContext>
            {fields.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Empty lesson. Add your first block!</p>
                    <AddBlockButton onAdd={(type) => addBlock(type, 0)} isPageLevel={true} />
                </div>
            )}
        </div>
    );
}

function ContentBlockItem({ moduleIndex, lessonIndex, blockIndex, onRemove }: { moduleIndex: number, lessonIndex: number, blockIndex: number, onRemove: () => void }) {
    const { control, getValues, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const block = getValues(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}`);
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const { resolvedTheme } = useTheme();
    const { problems, loadingProblems } = useCourseFormContext();
    
    const BlockContainer = ({ children }: { children: React.ReactNode }) => (
        <div ref={setNodeRef} style={style} className="group relative my-2">
            <button type="button" {...attributes} {...listeners} className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab p-1 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
            {children}
            <button type="button" onClick={onRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                X
            </button>
        </div>
    );
    
    const renderBlockEditor = () => {
        switch (block.type) {
            case 'text': return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Textarea {...field} placeholder="Write something..." className="text-base" /></FormControl>)} /></BlockContainer>;
            case 'heading1': return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-4xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} /></BlockContainer>;
            case 'heading2': return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-3xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} /></BlockContainer>;
            case 'heading3': return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-2xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} /></BlockContainer>;
            case 'quote': return <BlockContainer><blockquote className="border-l-4 pl-4 italic"><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Textarea {...field} placeholder="Quote..." className="border-none focus-visible:ring-0" /></FormControl>)} /></blockquote></BlockContainer>;
            case 'bulleted-list':
            case 'numbered-list':
              return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Textarea {...field} placeholder="* List item" className="text-base" rows={3} /></FormControl>)} /></BlockContainer>;
            case 'code':
                return <BlockContainer><div className="bg-muted p-2 rounded-md"><MonacoEditor height="200px" language={(block.content as any).language} value={(block.content as any).code} onChange={(val) => setValue(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.code`, val)} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false } }} /></div></BlockContainer>;
            case 'image':
                return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} placeholder="Image URL" /></FormControl>)} /></BlockContainer>;
            case 'video':
                return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} placeholder="Video Embed URL" /></FormControl>)} /></BlockContainer>;
            case 'audio':
                return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} placeholder="Audio File URL" /></FormControl>)} /></BlockContainer>;
            case 'divider':
                return <BlockContainer><Separator /></BlockContainer>;
            case 'problem':
                return <BlockContainer><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.problemId`} render={({ field }) => ( <Select onValueChange={(val) => { const selectedProblem = problems.find(p => p.id === val); if (selectedProblem) { setValue(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`, { problemId: selectedProblem.id, title: selectedProblem.title, categoryName: selectedProblem.categoryName, metadataType: selectedProblem.metadataType, }); } }} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder={loadingProblems ? "Loading..." : "Select a problem"} /></SelectTrigger></FormControl><SelectContent>{problems.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select> )}/></BlockContainer>;
            case 'live-code':
              return <BlockContainer><div className="space-y-2 p-2 border rounded-md"><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.html`} render={({ field }) => (<FormItem><FormLabel>HTML</FormLabel><FormControl><Textarea {...field} placeholder="HTML" className="font-mono text-xs" /></FormControl></FormItem>)} /><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.css`} render={({ field }) => (<FormItem><FormLabel>CSS</FormLabel><FormControl><Textarea {...field} placeholder="CSS" className="font-mono text-xs" /></FormControl></FormItem>)} /><FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.js`} render={({ field }) => (<FormItem><FormLabel>JS</FormLabel><FormControl><Textarea {...field} placeholder="JavaScript" className="font-mono text-xs" /></FormControl></FormItem>)} /></div></BlockContainer>;
            default: return <BlockContainer><p className="text-red-500">Unimplemented block: {block.type}</p></BlockContainer>;
        }
    }
    
    return renderBlockEditor();
}
// #endregion
