
"use client";

import { useCallback, useEffect, useState, useRef, useMemo, createContext, useContext } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock, Problem, ApexProblemsData } from "@/types";
import { courseFormSchema } from "@/lib/admin-schemas";
import { upsertCourseToFirestore, uploadCourseImage } from "@/app/upload-problem/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Edit, GripVertical, ArrowLeft, UploadCloud, ChevronDown, Code, Type, Image as ImageIcon, Video, Mic, List, CheckSquare, MessageSquare, AlertCircle, Divide, Link as LinkIcon, Puzzle, Play, BrainCircuit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    const [view, setView] = useState<'list' | 'form'>('list');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const handleEditCourse = (course: Course) => {
        setSelectedCourse(course);
        setView('form');
    };

    const handleAddNewCourse = () => {
        setSelectedCourse(null);
        setView('form');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedCourse(null);
    };

    if (view === 'form') {
        return <CourseForm course={selectedCourse} onBack={handleBackToList} />;
    }

    return <CourseList onEdit={handleEditCourse} onAdd={handleAddNewCourse} />;
}

function CourseList({ onEdit, onAdd }: { onEdit: (c: Course) => void, onAdd: () => void }) {
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
                    // Ensure createdAt is a Date object, defaulting if needed
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
                                                <Button variant="outline" size="sm" onClick={() => onEdit(course)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
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
type FormContextType = {
  problems: ProblemWithCategory[];
  loadingProblems: boolean;
};
const CourseFormContext = createContext<FormContextType | null>(null);
const useCourseFormContext = () => {
    const context = useContext(CourseFormContext);
    if (!context) throw new Error("useCourseFormContext must be used within a CourseFormContextProvider");
    return context;
};

function CourseForm({ course, onBack }: { course: Course | null, onBack: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
    const [loadingProblems, setLoadingProblems] = useState(true);

    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            title: '',
            description: '',
            category: '',
            thumbnailUrl: '',
            modules: [],
            isPublished: false,
            isPremium: false,
        }
    });

    const { control, setValue, watch } = form;
    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control, name: "modules" });
    const thumbnailUrl = watch("thumbnailUrl");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (course) {
            form.reset({
                ...course,
                isPremium: course.isPremium || false,
            });
        }
    }, [course, form]);

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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !course?.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please save the course first to get a Course ID for uploads.'});
            return;
        };
        setIsSaving(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const result = await uploadCourseImage(reader.result as string, course.id);
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
          ...(course?.id && { id: course.id }),
          ...data,
        });
        if (result.success) {
            toast({ title: 'Success!', description: 'Course saved successfully.' });
            if (result.courseId && !course?.id) {
                 // This is a new course, we should probably update the URL or state
                 // For now, just stay on the page. A real app might redirect.
                 console.log("New course created with ID:", result.courseId);
            }
            // A full back navigation might be too disruptive, consider just re-fetching
            onBack();
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
        <CourseFormContext.Provider value={{ problems, loadingProblems }}>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
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
                                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!course?.id || isSaving}>
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
                                <CardTitle>Modules & Lessons</CardTitle>
                                <CardDescription>Drag to reorder modules.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={moduleFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                      <div className="space-y-4">
                                        {moduleFields.map((field, index) => (
                                            <ModuleItem key={field.id} moduleIndex={index} onRemove={() => removeModule(index)} />
                                        ))}
                                      </div>
                                    </SortableContext>
                                </DndContext>
                                <Button type="button" variant="outline" className="mt-4" onClick={() => appendModule({ id: uuidv4(), title: '', lessons: [] })}><PlusCircle className="mr-2 h-4 w-4"/> Add Module</Button>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </FormProvider>
        </CourseFormContext.Provider>
    );
}
// #endregion

// #region Module Item
function ModuleItem({ moduleIndex, onRemove }: { moduleIndex: number, onRemove: () => void }) {
    const { control, register } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields: lessonFields, append: appendLesson, remove: removeLesson, move: moveLesson } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons` });

    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: (control.getValues(`modules.${moduleIndex}`) as Module).id });
    const style = { transform: CSS.Transform.toString(transform), transition };

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
        <div ref={setNodeRef} style={style}>
            <Card>
                <CardHeader className="flex flex-row items-center gap-2 p-3 bg-muted/50 rounded-t-lg">
                    <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                    <div className="flex-1">
                        <Input placeholder="Module Title" {...register(`modules.${moduleIndex}.title`)} />
                    </div>
                    <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
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
        </div>
    );
}
// #endregion

// #region Lesson Item
function LessonItem({ moduleIndex, lessonIndex, onRemove }: { moduleIndex: number, lessonIndex: number, onRemove: () => void }) {
    const { control, register } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: (control.getValues(`modules.${moduleIndex}.lessons.${lessonIndex}`) as Lesson).id });
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
const BLOCK_ICONS: { [key in ContentBlock['type']]: React.ElementType } = {
    'text': Type, 'code': Code, 'heading1': Type, 'heading2': Type, 'heading3': Type,
    'quote': MessageSquare, 'callout': AlertCircle, 'divider': Divide, 'image': ImageIcon,
    'video': Video, 'audio': Mic, 'table': List, 'todo-list': CheckSquare, 'problem': Puzzle,
    'breadcrumb': LinkIcon, 'mcq': List, 'numbered-list': List, 'bulleted-list': List,
    'toggle-list': List, 'interactive-code': Play, 'stepper': List, 'mermaid': BrainCircuit,
    'two-column': List, 'three-column': List, 'live-code': Play, 'mindmap': BrainCircuit,
};

function ContentBlockEditor({ moduleIndex, lessonIndex }: { moduleIndex: number, lessonIndex: number }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove, move } = useFieldArray({ control, name: `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks` });
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        move(oldIndex, newIndex);
      }
    };
    
    const addBlock = (type: ContentBlock['type']) => {
        let content: any;
        switch (type) {
            case 'text': content = 'New text block...'; break;
            case 'code': content = { code: '// Your code here', language: 'javascript' }; break;
            case 'heading1': content = 'Heading 1'; break;
            case 'heading2': content = 'Heading 2'; break;
            case 'heading3': content = 'Heading 3'; break;
            case 'quote': content = 'A wise quote...'; break;
            case 'callout': content = { text: 'Important information.', icon: '💡' }; break;
            case 'divider': content = ''; break;
            case 'image': content = 'https://placehold.co/600x400'; break;
            case 'video': content = 'https://www.youtube.com/watch?v=...'; break;
            case 'mcq': content = { question: 'What is...?', options: [{ id: uuidv4(), text: 'Option 1' }, { id: uuidv4(), text: 'Option 2' }], correctAnswerIndex: 0 }; break;
            case 'problem': content = { problemId: '', title: 'Select a Problem', categoryName: '' }; break;
            default: content = '';
        }
        append({ id: uuidv4(), type, content });
    };

    return (
        <div className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field, index) => (
                        <ContentBlockItem key={field.id} moduleIndex={moduleIndex} lessonIndex={lessonIndex} blockIndex={index} onRemove={() => remove(index)} />
                    ))}
                </SortableContext>
            </DndContext>
            <Popover>
                <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Add Content Block</Button></PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                    <div className="grid grid-cols-2 gap-1">
                        {Object.keys(BLOCK_ICONS).map(key => {
                            const type = key as ContentBlock['type'];
                            const Icon = BLOCK_ICONS[type];
                            return <Button key={type} type="button" variant="ghost" className="justify-start" onClick={() => addBlock(type)}><Icon className="mr-2 h-4 w-4"/> {type}</Button>
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function ContentBlockItem({ moduleIndex, lessonIndex, blockIndex, onRemove }: { moduleIndex: number, lessonIndex: number, blockIndex: number, onRemove: () => void }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const block = control.getValues(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}`);
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const { resolvedTheme } = useTheme();
    const { problems, loadingProblems } = useCourseFormContext();

    const renderBlockEditor = () => {
        switch (block.type) {
            case 'text':
            case 'quote':
            case 'bulleted-list':
            case 'numbered-list':
                return <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Textarea {...field} className="text-sm" /></FormControl>)} />;
            case 'heading1':
                return <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-3xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} />;
            case 'heading2':
                 return <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-2xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} />;
            case 'heading3':
                 return <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (<FormControl><Input {...field} className="text-xl font-bold h-auto p-1 border-transparent focus-visible:border-input focus-visible:ring-0" /></FormControl>)} />;
            case 'code':
                return <div className="h-64 border rounded-md overflow-hidden"><MonacoEditor height="100%" language={(block.content as any).language} value={(block.content as any).code} onChange={(val) => control.setValue(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.code`, val)} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false } }} /></div>;
            case 'problem':
                return (
                    <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content.problemId`} render={({ field }) => (
                         <Select onValueChange={(val) => {
                             const selectedProblem = problems.find(p => p.id === val);
                             if (selectedProblem) {
                                 control.setValue(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`, {
                                    problemId: selectedProblem.id,
                                    title: selectedProblem.title,
                                    categoryName: selectedProblem.categoryName,
                                    metadataType: selectedProblem.metadataType,
                                 });
                             }
                         }} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingProblems ? "Loading..." : "Select a problem"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {problems.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                            </SelectContent>
                         </Select>
                    )} />
                )
            case 'divider': return <Separator />;
            default: return <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">Editor for '{block.type}' not implemented yet.</div>;
        }
    }
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
            <button type="button" {...attributes} {...listeners} className="cursor-grab p-1 mt-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
            <div className="flex-1 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">{block.type}</div>
                {renderBlockEditor()}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
        </div>
    );
}

// #endregion
