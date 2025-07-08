
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Firebase and Actions
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock } from "@/types";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { cn } from '@/lib/utils';
import Image from "next/image";


// ShadCN UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Edit, GripVertical, Trash2, Bold, Italic, Link as LinkIcon, MessageSquareText, Palette, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FloatingToolbar } from './FloatingToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// ----------------------------------------------------
// Component 1: CourseList
// ----------------------------------------------------
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

// ----------------------------------------------------
// Section: Notion-style Editor Components
// ----------------------------------------------------
const NotionEditorContext = React.createContext<{
  updateBlock: (id: string, newContent: any) => void;
  addBlock: (type: string, afterId: string) => void;
  deleteBlock: (id: string) => void;
  addComment: (selectedText: string, range: Range) => void;
  addLink: (url: string, range: Range) => void;
} | null>(null);

const useNotionEditor = () => {
    const context = useContext(NotionEditorContext);
    if (!context) throw new Error("useNotionEditor must be used within a NotionEditorProvider");
    return context;
};

// The core editable div component
function EditableBlock({ block, placeholder, className, as: Tag = 'div' }: {
    block: ContentBlock,
    placeholder?: string,
    className?: string,
    as?: React.ElementType
}) {
    const ref = useRef<HTMLDivElement>(null);
    const { updateBlock, addBlock, deleteBlock } = useNotionEditor();

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
            ref.current.innerHTML = block.content as string;
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
            className={cn("w-full outline-none focus:ring-1 focus:ring-primary/20 focus:rounded-sm", className, "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none")}
        />
    );
};

function CodeBlock({ block }: { block: ContentBlock }) {
    const { updateBlock } = useNotionEditor();

    const initialContent = useMemo(() => {
        if (typeof block.content === 'object' && block.content !== null && 'code' in block.content) {
            return block.content as { code: string; language: string };
        }
        return { code: String(block.content || ''), language: 'apex' };
    }, [block.content]);

    const [localCode, setLocalCode] = useState(initialContent.code);
    const [localLang, setLocalLang] = useState(initialContent.language);

    useEffect(() => {
        const parentContent = (typeof block.content === 'object' && block.content !== null && 'code' in block.content)
            ? block.content as { code: string; language: string }
            : { code: String(block.content || ''), language: 'apex' };
            
        if (parentContent.code !== localCode) {
            setLocalCode(parentContent.code);
        }
        if (parentContent.language !== localLang) {
            setLocalLang(parentContent.language);
        }
    }, [block.content, localCode, localLang]);


    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        setLocalCode(newCode);
        updateBlock(block.id, { code: newCode, language: localLang });
    };

    const handleLanguageChange = (newLang: string) => {
        setLocalLang(newLang);
        updateBlock(block.id, { code: localCode, language: newLang });
    };

    return (
        <div className="relative my-4 bg-muted/30 rounded-lg overflow-hidden border">
            <div className="flex justify-end items-center bg-muted/50 p-2 text-sm text-muted-foreground">
                <Select value={localLang} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['javascript', 'python', 'html', 'css', 'sql', 'json', 'java', 'typescript', 'php', 'ruby', 'go', 'csharp', 'cpp', 'markdown', 'bash', 'plaintext'].map(lang => (
                            <SelectItem key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Textarea
                value={localCode}
                onChange={handleCodeChange}
                placeholder="Enter code..."
                className="font-mono bg-muted text-sm h-40"
            />
        </div>
    );
}


// Renders the correct component based on block type
function BlockRenderer({ block }: { block: ContentBlock }) {
    const { updateBlock } = useNotionEditor();

    switch (block.type) {
        case 'text':
            return <EditableBlock block={block} placeholder="Type '/' for commands" className="text-base py-1" />;
        case 'heading1':
            return <EditableBlock block={block} placeholder="Heading 1" className="text-3xl font-bold my-2 py-1" as="h1" />;
        case 'heading2':
            return <EditableBlock block={block} placeholder="Heading 2" className="text-2xl font-semibold my-2 py-1" as="h2" />;
        case 'heading3':
            return <EditableBlock block={block} placeholder="Heading 3" className="text-xl font-medium my-2 py-1" as="h3" />;
        case 'code':
            return <CodeBlock block={block} />;
         case 'image':
            return (
                 <div className="my-2 space-y-2">
                     <Input 
                         value={typeof block.content === 'string' ? block.content : ''}
                         onChange={e => updateBlock(block.id, e.target.value)}
                         placeholder="Image URL"
                     />
                     {block.content && typeof block.content === 'string' && (
                        <Image src={block.content} alt="Lesson content" width={500} height={300} className="rounded-md border object-contain mx-auto" />
                     )}
                 </div>
             );
        default:
            return <div className="text-muted-foreground text-xs py-1">Unsupported block: {block.type}</div>;
    }
};

// The main editor canvas
function NotionEditor({ name }: { name: string }) {
    const { control, getValues, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove } = useFieldArray({ control, name: name as any });

    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState('');
    const [activeRange, setActiveRange] = useState<Range | null>(null);

    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !editorContainerRef.current) {
            setShowFloatingToolbar(false);
            return;
        }

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        if (range && !range.collapsed && editorContainerRef.current.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            setToolbarPosition({
                x: rect.left + window.scrollX + (rect.width / 2),
                y: rect.top + window.scrollY - 10,
            });
            setSelectedText(selection.toString());
            setActiveRange(range.cloneRange());
            setShowFloatingToolbar(true);
        } else {
            setShowFloatingToolbar(false);
            setSelectedText('');
            setActiveRange(null);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp, true);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp, true);
        };
    }, [handleMouseUp]);


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
            const index = fields.findIndex(f => f.id === afterId);
            const newBlock: ContentBlock = { id: uuidv4(), type: type, content: '' };
            if (type === 'code') {
                newBlock.content = { code: '', language: 'apex' };
            }
            if (index !== -1) {
                 const currentBlocks = getValues(name as any);
                 const newBlocks = [...currentBlocks];
                 newBlocks.splice(index + 1, 0, newBlock);
                 setValue(name as any, newBlocks, { shouldFocus: true });
            } else {
                append(newBlock, { shouldFocus: true });
            }
        },
        deleteBlock: (id: string) => {
            const blockIndex = fields.findIndex(f => f.id === id);
            if (blockIndex > 0) remove(blockIndex); // Prevent deleting the very first block
        },
        addComment: (selectedText: string, range: Range) => {
            alert(`Comment on "${selectedText}" - (Logic to save comment and highlight text goes here)`);
        },
        addLink: (url: string, range: Range) => {
            const selection = window.getSelection();
            if(selection && range) {
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('createLink', false, url);
                const activeElement = document.activeElement;
                 if (activeElement && 'dispatchEvent' in activeElement) {
                    const event = new Event('input', { bubbles: true });
                    (activeElement as HTMLElement).dispatchEvent(event);
                }
            }
        }
    }), [fields, append, remove, getValues, setValue, name]);

    return (
        <NotionEditorContext.Provider value={editorContext}>
            <div className="notion-editor space-y-1" ref={editorContainerRef}>
                {showFloatingToolbar && selectedText && activeRange && (
                    <FloatingToolbar
                        position={toolbarPosition}
                        onComment={() => editorContext.addComment(selectedText, activeRange)}
                        onLink={(url) => editorContext.addLink(url, activeRange)}
                        selectedText={selectedText}
                        editorRef={editorContainerRef}
                    />
                )}
                {fields.map((field) => (
                    <div key={field.id} className="group relative flex items-start gap-2">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pt-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6"><PlusCircle className="h-4 w-4" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-1">
                                    <div className="text-xs text-muted-foreground p-2">Add Block Below</div>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => editorContext.addBlock('text', field.id)}>Text</Button>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => editorContext.addBlock('heading1', field.id)}>Heading 1</Button>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => editorContext.addBlock('heading2', field.id)}>Heading 2</Button>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => editorContext.addBlock('image', field.id)}>Image</Button>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => editorContext.addBlock('code', field.id)}>Code</Button>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex-1">
                            <BlockRenderer block={field as ContentBlock} />
                        </div>
                    </div>
                ))}
            </div>
        </NotionEditorContext.Provider>
    );
};

// ----------------------------------------------------
// Section: Form Components
// ----------------------------------------------------

function LessonItem({ moduleIndex, lessonIndex }: { moduleIndex: number, lessonIndex: number }) {
    const { control, getValues } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: getValues(`modules.${moduleIndex}.lessons.${lessonIndex}.id`)});
    const style = { transform: CSS.Transform.toString(transform), transition };
    
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
}

function ModuleItem({ moduleIndex }: { moduleIndex: number }) {
    const { control, getValues } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeModule } = useFieldArray({ name: `modules` });
    const { fields: lessonFields, append: appendLesson, move: moveLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({id: getValues(`modules.${moduleIndex}.id`)});
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleLessonDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = lessonFields.findIndex(l => l.id === active.id);
            const newIndex = lessonFields.findIndex(l => l.id === over.id);
            moveLesson(oldIndex, newIndex);
        }
    }

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
                            <SortableContext items={lessonFields} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4 pl-6 border-l-2">
                                    {lessonFields.map((lessonItem, lessonIndex) => (
                                       <LessonItem key={lessonItem.id} moduleIndex={moduleIndex} lessonIndex={lessonIndex} />
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
            modules: course?.modules?.length ? course.modules : [{ id: uuidv4(), title: 'First Module', lessons: [{ id: uuidv4(), title: 'First Lesson', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] }] }],
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

    const { fields: moduleFields, append: appendModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = moduleFields.findIndex(m => m.id === active.id);
            const newIndex = moduleFields.findIndex(m => m.id === over.id);
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
                
                <Accordion type="multiple" defaultValue={[`module-0`]} className="w-full space-y-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                        <SortableContext items={moduleFields} strategy={verticalListSortingStrategy}>
                            {moduleFields.map((moduleItem, moduleIndex) => (
                                <ModuleItem key={moduleItem.id} moduleIndex={moduleIndex} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </Accordion>

                <Button type="button" variant="outline" onClick={() => appendModule({ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] }] }] })}>
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

    

    