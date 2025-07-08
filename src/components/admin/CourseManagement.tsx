
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@zod-resolvers/zod";
import { z } from "zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock } from "@/types";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Edit, GripVertical, Trash2, Bold, Italic, Link as LinkIcon, MessageSquareText, Palette, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Re-added CourseList Component
export function CourseList({ onEdit, onAddNew }: { onEdit: (c: Course) => void, onAddNew: () => void }) {
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            const coursesRef = collection(db, "courses");
            const q = query(coursesRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
        } catch (error) {
            console.error("Error fetching courses:", error);
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
                    <CardDescription>View, edit, or add new courses.</CardDescription>
                </div>
                <Button onClick={onAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Course
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
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {courses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No courses found.</TableCell>
                                    </TableRow>
                                ) : (
                                    courses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">{course.title}</TableCell>
                                            <TableCell>{course.category}</TableCell>
                                            <TableCell>
                                                <Badge variant={course.isPublished ? "default" : "secondary"}>
                                                    {course.isPublished ? "Published" : "Draft"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(course)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
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
    );
}


// --- New Notion-style Editor Implementation ---
const NotionEditorContext = React.createContext<{
  updateBlock: (id: string, newContent: any) => void;
  addBlock: (type: string, afterId: string) => void;
  deleteBlock: (id: string) => void;
  addComment: (selectedText: string, range: Range) => void;
  addLink: (url: string, range: Range) => void;
} | null>(null);

const useNotionEditor = () => {
    const context = useContext(NotionEditorContext);
    if (!context) {
        throw new Error("useNotionEditor must be used within a NotionEditorProvider");
    }
    return context;
};

const EditableBlock = ({ block, placeholder, className, as: Tag = 'div' }: any) => {
    const { updateBlock, addBlock, deleteBlock } = useNotionEditor();
    const ref = useRef<HTMLDivElement>(null);

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
        updateBlock(block.id, e.currentTarget.innerHTML);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addBlock('text', block.id);
        } else if (e.key === 'Backspace' && ref.current?.innerHTML === '') {
            e.preventDefault();
            deleteBlock(block.id);
        }
    };
    
    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== block.content) {
            ref.current.innerHTML = block.content;
        }
    }, [block.content]);

    return (
        <Tag
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onKeyDown={onKeyDown}
            data-placeholder={placeholder}
            className={cn("w-full outline-none focus:ring-2 focus:ring-primary/20 focus:rounded", className, "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none empty:before:block")}
        />
    );
};

const BlockRenderer = ({ block }: { block: ContentBlock }) => {
    switch (block.type) {
        case 'text':
            return <EditableBlock block={block} placeholder="Type '/' for commands" className="text-base py-1" />;
        case 'heading1':
            return <EditableBlock block={block} placeholder="Heading 1" className="text-3xl font-bold my-2 py-1" as="h1" />;
        case 'heading2':
            return <EditableBlock block={block} placeholder="Heading 2" className="text-2xl font-semibold my-2 py-1" as="h2" />;
        case 'heading3':
            return <EditableBlock block={block} placeholder="Heading 3" className="text-xl font-medium my-2 py-1" as="h3" />;
        default:
            return (
                <div className="relative group my-1">
                    <p className="text-muted-foreground text-sm">[Unsupported Block: {block.type}]</p>
                </div>
            );
    }
};

const NotionEditor = ({ name }: { name: string }) => {
    const { control, getValues, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove, move } = useFieldArray({ control, name: name as any });

    const editorContext = useMemo(() => ({
        updateBlock: (id: string, newContent: any) => {
            const blockIndex = fields.findIndex(f => f.id === id);
            if (blockIndex !== -1) {
                const currentValues = getValues(name as any);
                const updatedBlocks = [...currentValues];
                updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], content: newContent };
                setValue(name as any, updatedBlocks, { shouldDirty: true });
            }
        },
        addBlock: (type: string, afterId: string) => {
             const blockIndex = fields.findIndex(f => f.id === afterId);
            const newBlock: ContentBlock = { id: uuidv4(), type: 'text', content: '' };
             if (blockIndex !== -1) {
                append(newBlock, { shouldFocus: true });
                const newIndex = fields.length; // Appended at the end
                move(newIndex, blockIndex + 1);
            } else {
                append(newBlock, { shouldFocus: true });
            }
        },
        deleteBlock: (id: string) => {
            const blockIndex = fields.findIndex(f => f.id === id);
            if (blockIndex !== -1) {
                remove(blockIndex);
            }
        },
        addComment: (selectedText: string, range: Range) => {
            alert(`Comment on "${selectedText}" - (Logic to save comment goes here)`);
        },
        addLink: (url: string, range: Range) => {
            document.execCommand('createLink', false, url);
        }
    }), [fields, append, remove, move, getValues, setValue, name]);

    return (
        <NotionEditorContext.Provider value={editorContext}>
            <div className="notion-editor-container p-4 border rounded-md bg-background">
                {fields.map((field, index) => (
                    <BlockRenderer key={field.id} block={field as ContentBlock} />
                ))}
            </div>
        </NotionEditorContext.Provider>
    );
};

export function CourseForm({ course, onBack }: { course: Course | null, onBack: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formMode = course ? 'edit' : 'add';

    const form = useForm<z.infer<typeof courseFormSchema>>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            id: course?.id,
            title: course?.title || '',
            description: course?.description || '',
            category: course?.category || '',
            thumbnailUrl: course?.thumbnailUrl || '',
            modules: course?.modules?.length ? course.modules : [{ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: 'Initial text block' }] }] }],
            isPublished: course?.isPublished || false,
            isPremium: course?.isPremium || false,
        },
    });

    async function onSubmit(values: z.infer<typeof courseFormSchema>) {
        setIsSubmitting(true);
        const result = await upsertCourseToFirestore({ ...values });
        if (result.success) {
            toast({ title: "Success!", description: result.message });
            onBack();
        } else {
            toast({ variant: "destructive", title: "Save Failed", description: result.error });
        }
        setIsSubmitting(false);
    }
    
    function onInvalid(errors: any) {
        console.error("Form validation errors:", errors);
        toast({
            variant: "destructive",
            title: "Validation Failed",
            description: "Please check all fields for errors. Module and Lesson titles are required.",
        });
    }

    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = moduleFields.findIndex(m => m.id === active.id);
            const newIndex = moduleFields.findIndex(m => m.id === over?.id);
            moveModule(oldIndex, newIndex);
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>{formMode === 'add' ? 'Create New Course' : 'Edit Course'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Course Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Apex" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the course..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Apex, LWC" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                                <FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                         <div className="flex items-center space-x-4">
                            <FormField control={form.control} name="isPublished" render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Published</FormLabel></FormItem>
                            )} />
                             <FormField control={form.control} name="isPremium" render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Premium</FormLabel></FormItem>
                            )} />
                         </div>
                    </CardContent>
                </Card>
                
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                    <SortableContext items={moduleFields} strategy={verticalListSortingStrategy}>
                        {moduleFields.map((moduleItem, moduleIndex) => (
                           <ModuleItem key={moduleItem.id} moduleItem={moduleItem} moduleIndex={moduleIndex} removeModule={removeModule} />
                        ))}
                    </SortableContext>
                </DndContext>

                 <Button type="button" variant="outline" onClick={() => appendModule({ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] }] })}>
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Module
                 </Button>

                <div className="flex justify-end gap-4">
                     <Button type="button" variant="outline" onClick={onBack}>Cancel</Button>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {formMode === 'add' ? 'Create Course' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </FormProvider>
    )
}

const ModuleItem = ({ moduleItem, moduleIndex, removeModule }: { moduleItem: any, moduleIndex: number, removeModule: (index: number) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: moduleItem.id});
    const style = { transform: CSS.Transform.toString(transform), transition };
    const { fields: lessonFields, append: appendLesson, remove: removeLesson, move: moveLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });

     const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = lessonFields.findIndex(l => l.id === active.id);
            const newIndex = lessonFields.findIndex(l => l.id === over?.id);
            moveLesson(oldIndex, newIndex);
        }
    };

    return (
        <Card ref={setNodeRef} style={style}>
            <CardHeader className="flex flex-row items-center gap-2">
                 <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                 <FormField control={useFormContext().control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormControl><Input placeholder={`Module ${moduleIndex + 1}: Title`} {...field} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </CardHeader>
            <CardContent>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                    <SortableContext items={lessonFields} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4 pl-6 border-l-2">
                            {lessonFields.map((lessonItem, lessonIndex) => (
                               <LessonItem key={lessonItem.id} moduleIndex={moduleIndex} lessonItem={lessonItem} lessonIndex={lessonIndex} removeLesson={removeLesson} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <Button type="button" variant="outline" size="sm" className="mt-4 ml-6" onClick={() => appendLesson({ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] }] })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
            </CardContent>
             <CardFooter>
                <Button type="button" variant="destructive" onClick={() => removeModule(moduleIndex)}>
                    <Trash2 className="mr-2 h-4 w-4" />Remove Module
                </Button>
            </CardFooter>
        </Card>
    )
}

const LessonItem = ({ moduleIndex, lessonItem, lessonIndex, removeLesson }: { moduleIndex: number, lessonItem: any, lessonIndex: number, removeLesson: (index: number) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: lessonItem.id});
    const style = { transform: CSS.Transform.toString(transform), transition };
    const control = useFormContext().control;

    return (
         <div ref={setNodeRef} style={style} className="border rounded-md bg-card">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={`lesson-${lessonIndex}`} className="border-b-0">
                    <div className="flex items-center px-4 py-2">
                        <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                        <AccordionTrigger className="flex-1 hover:no-underline">
                             <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl><Input placeholder={`Lesson ${lessonIndex + 1}: Title`} {...field} className="font-medium border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </AccordionTrigger>
                    </div>
                    <AccordionContent className="p-4 border-t">
                         <div className="space-y-4">
                             <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.isFree`} render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Free Lesson (Overrides course premium setting)</FormLabel></FormItem>
                            )} />
                             <NotionEditor name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks`} />
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => removeLesson(lessonIndex)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete Lesson
                            </Button>
                         </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

    