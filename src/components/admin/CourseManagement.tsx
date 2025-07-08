
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { doc, getDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, Course, Module, Lesson, ContentBlock } from "@/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useToast } from "@/hooks/use-toast";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, Edit, BookOpenCheck, GripVertical, FileVideo, FileText, BrainCircuit, Grip, MousePointerClick, Code, Image as ImageIcon, Columns } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormDescription } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

type ProblemWithCategory = Problem & { categoryName: string };

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

export function CourseList({ onEdit, onAddNew }: { onEdit: (c: Course) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const coursesRef = collection(db, "courses");
            const q = query(coursesRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to load courses' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

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
                    {loading ? (
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

export function CourseForm({ course, onBack }: { course: Course | null, onBack: () => void }) {
    const { user: authUser } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formMode = course ? 'edit' : 'add';
    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [loadingProblems, setLoadingProblems] = useState(true);

    useEffect(() => {
        const fetchAllProblems = async () => {
            setLoadingProblems(true);
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
                setLoadingProblems(false);
            }
        };
        fetchAllProblems();
    }, [toast]);

    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            id: course?.id,
            title: course?.title || '',
            description: course?.description || '',
            category: course?.category || '',
            thumbnailUrl: course?.thumbnailUrl || '',
            modules: course?.modules || [{ id: crypto.randomUUID(), title: '', lessons: [{ id: crypto.randomUUID(), title: '', isFree: true, contentBlocks: [{id: crypto.randomUUID(), type: 'text', content: '' }] }] }],
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
                                            allProblems={allProblems}
                                            loadingProblems={loadingProblems}
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

function LessonList({ moduleIndex, control, allProblems, loadingProblems }: { moduleIndex: number, control: any, allProblems: ProblemWithCategory[], loadingProblems: boolean }) {
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
                            allProblems={allProblems} 
                            loadingProblems={loadingProblems} 
                        />
                     </div>
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: crypto.randomUUID(), title: '', isFree: true, contentBlocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Lesson</Button>
        </div>
    );
}

function ContentBlockList({ name, control, allProblems, loadingProblems, isNested = false }: { name: string, control: any, allProblems: ProblemWithCategory[], loadingProblems: boolean, isNested?: boolean }) {
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
                        allProblems={allProblems}
                        loadingProblems={loadingProblems}
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

function ContentBlockItem({ parentName, blockIndex, control, allProblems, loadingProblems, onRemove, isNested }: { parentName: string, blockIndex: number, control: any, allProblems: ProblemWithCategory[], loadingProblems: boolean, onRemove: () => void, isNested: boolean }) {
    const { resolvedTheme } = useTheme();
    
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
                return (
                    <div className="space-y-4">
                        <FormField control={control} name={`${parentName}.${blockIndex}.content`} render={({ field }) => (
                            <FormItem><FormLabel>Text (Markdown supported)</FormLabel><FormControl><Textarea placeholder="Enter Markdown-enabled text..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name={`${parentName}.${blockIndex}.backgroundColor`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Background Color (Optional)</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === '--none--' ? '' : value)}
                                    value={field.value || '--none--'}
                                >
                                    <FormControl><SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="--none--">Default</SelectItem>
                                        <SelectItem value="bg-card">Card</SelectItem>
                                        <SelectItem value="bg-muted">Muted</SelectItem>
                                        <SelectItem value="bg-primary/10">Primary (Highlight)</SelectItem>
                                        <SelectItem value="bg-destructive/10">Destructive (Warning)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                );
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={control} name={`${parentName}.${blockIndex}.fileName`} render={({ field }) => (
                                <FormItem><FormLabel>File Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., MyApexClass.cls" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={control} name={`${parentName}.${blockIndex}.codeType`} render={({ field }) => (
                                <FormItem><FormLabel>Code Type (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Class">Class</SelectItem>
                                            <SelectItem value="Trigger">Trigger</SelectItem>
                                            <SelectItem value="Component">Component</SelectItem>
                                        </SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={control} name={`${parentName}.${blockIndex}.codeDetector`} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Enable Code Detector</FormLabel>
                                    <FormDescription>
                                        Attempt to automatically detect code type.
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
                                        allProblems={allProblems}
                                        loadingProblems={loadingProblems}
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
