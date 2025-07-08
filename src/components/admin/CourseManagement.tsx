
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Firebase and Actions
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock } from "@/types";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";

// ShadCN UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Edit, GripVertical, Trash2, TextIcon, Code2Icon, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Component 1: CourseList
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

function BlockTypePicker({ onSelect }: { onSelect: (type: 'text' | 'code') => void }) {
  return (
    <PopoverContent className="w-48 p-2">
      <div className="grid gap-1">
        <Button variant="ghost" className="justify-start" onClick={() => onSelect('text')}>
          <TextIcon className="mr-2 h-4 w-4" /> Text
        </Button>
        <Button variant="ghost" className="justify-start" onClick={() => onSelect('code')}>
          <Code2Icon className="mr-2 h-4 w-4" /> Code
        </Button>
      </div>
    </PopoverContent>
  );
}

function CodeBlockEditor({ field }: { field: any }) {
    const [localContent, setLocalContent] = useState(
        typeof field.value === 'object' && field.value !== null
            ? field.value
            : { code: '', language: 'apex' }
    );

    useEffect(() => {
        // Sync with form state if it changes externally
         if (typeof field.value === 'object' && field.value !== null && (field.value.code !== localContent.code || field.value.language !== localContent.language)) {
            setLocalContent(field.value);
        }
    }, [field.value, localContent]);
    
    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        const newContent = { ...localContent, code: newCode };
        setLocalContent(newContent);
        field.onChange(newContent);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        const newContent = { ...localContent, language: newLanguage };
        setLocalContent(newContent);
        field.onChange(newContent);
    };

    return (
        <div className="bg-muted rounded-md border">
             <div className="flex items-center justify-between px-3 py-1.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground">Code Block</p>
                <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-muted-foreground"/>
                    <select
                        value={localContent.language}
                        onChange={handleLanguageChange}
                        className="bg-transparent text-xs text-muted-foreground focus:outline-none"
                    >
                        {['apex', 'javascript', 'soql', 'html', 'css', 'json'].map(lang => (
                            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
            </div>
            <Textarea
                value={localContent.code}
                onChange={handleCodeChange}
                placeholder="Enter code..."
                className="font-mono bg-muted text-sm h-40 rounded-t-none border-0"
            />
        </div>
    );
}

function ContentBlockItem({ moduleIndex, lessonIndex, blockIndex }: { moduleIndex: number, lessonIndex: number, blockIndex: number }) {
    const { control, getValues } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeBlock } = useFieldArray({ name: `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks` });
    const block = getValues(`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}`);

    return (
        <div className="flex items-start gap-2">
             <div className="flex-1 space-y-2">
                {block.type === 'text' && (
                    <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (
                         <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter lesson content here. Markdown is supported."
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
                 {block.type === 'code' && (
                    <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks.${blockIndex}.content`} render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <CodeBlockEditor field={field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )} />
                )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-2" onClick={() => removeBlock(blockIndex)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

function LessonItem({ moduleIndex, lessonIndex, rhfId }: { moduleIndex: number, lessonIndex: number, rhfId: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    const { fields: blockFields, append: appendBlock } = useFieldArray({ name: `modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks` });
    
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rhfId });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const addContentBlock = (type: 'text' | 'code') => {
        const newBlock = type === 'code'
            ? { id: uuidv4(), type, content: { code: '', language: 'apex' } }
            : { id: uuidv4(), type, content: '' };
        appendBlock(newBlock);
    };

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
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Free Lesson</FormLabel></FormItem>
                            )} />
                            
                            <div className="space-y-4">
                                {blockFields.map((blockItem, blockIndex) => (
                                    <ContentBlockItem key={blockItem.id} moduleIndex={moduleIndex} lessonIndex={lessonIndex} blockIndex={blockIndex} />
                                ))}
                            </div>
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Content Block
                                    </Button>
                                </PopoverTrigger>
                                <BlockTypePicker onSelect={addContentBlock} />
                            </Popover>
                            
                            <Button type="button" variant="destructive" size="sm" className="mt-2 float-right" onClick={() => removeLesson(lessonIndex)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete Lesson
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}


function ModuleItem({ moduleIndex }: { moduleIndex: number }) {
    const { control, getValues } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeModule } = useFieldArray({ name: `modules` });
    const { fields: lessonFields, append: appendLesson, move: moveLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: getValues(`modules.${moduleIndex}.id`) });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = lessonFields.findIndex(l => l.id === active.id);
            const newIndex = lessonFields.findIndex(l => l.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                moveLesson(oldIndex, newIndex);
            }
        }
    };

    return (
        <Card ref={setNodeRef} style={style}>
            <AccordionItem value={`module-${moduleIndex}`} className="border-none">
                <CardHeader className="flex flex-row items-center gap-2">
                    <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                    <AccordionTrigger className="w-full flex">
                        <FormField control={control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl><Input placeholder={`Module ${moduleIndex + 1}: Title`} {...field} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                    <CardContent>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                            <SortableContext items={lessonFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4 pl-6 border-l-2">
                                    {lessonFields.map((lessonItem, lessonIndex) => (
                                        <LessonItem key={lessonItem.id} moduleIndex={moduleIndex} lessonIndex={lessonIndex} rhfId={lessonItem.id} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                        <Button type="button" variant="outline" size="sm" className="mt-4 ml-6" onClick={() => appendLesson({ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
                        </Button>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" variant="destructive" onClick={() => removeModule(moduleIndex)}>
                            <Trash2 className="mr-2 h-4 w-4" />Remove Module
                        </Button>
                    </CardFooter>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
}

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
            modules: course?.modules?.length ? course.modules : [{ id: uuidv4(), title: 'First Module', lessons: [{ id: uuidv4(), title: 'First Lesson', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: '' }] }] }],
            isPublished: course?.isPublished || false,
            isPremium: course?.isPremium || false,
        },
    });
    
    useEffect(() => {
        form.reset({
            id: course?.id,
            title: course?.title || '',
            description: course?.description || '',
            category: course?.category || '',
            thumbnailUrl: course?.thumbnailUrl || '',
            modules: course?.modules?.length ? course.modules : [{ id: uuidv4(), title: 'First Module', lessons: [{ id: uuidv4(), title: 'First Lesson', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: '' }] }] }],
            isPublished: course?.isPublished || false,
            isPremium: course?.isPremium || false,
        });
    }, [course, form]);

    async function onSubmit(values: z.infer<typeof courseFormSchema>) {
        setIsSubmitting(true);
        const result = await upsertCourseToFirestore(values);
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

    const { fields: moduleFields, append: appendModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = moduleFields.findIndex(m => m.id === active.id);
            const newIndex = moduleFields.findIndex(m => m.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                moveModule(oldIndex, newIndex);
            }
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

                <Accordion type="multiple" defaultValue={[`module-0`]} className="w-full space-y-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                        <SortableContext items={moduleFields} strategy={verticalListSortingStrategy}>
                            {moduleFields.map((moduleItem, moduleIndex) => (
                                <ModuleItem key={moduleItem.id} moduleIndex={moduleIndex} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </Accordion>

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
    );
}
