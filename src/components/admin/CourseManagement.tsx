
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useForm, useFieldArray, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

// Helper for applying formatting
const applyFormatting = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value);
    const activeElement = document.activeElement;
    if (activeElement && activeElement.isContentEditable) {
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
    }
};

const getSelectionRange = (): Range | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        return selection.getRangeAt(0);
    }
    return null;
};

const FloatingToolbar: React.FC<{
    position: { x: number; y: number };
    onComment: (selectedText: string, range: Range) => void;
    onLink: (url: string, range: Range) => void;
}> = ({ position, onComment, onLink }) => {
    const colorOptions = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF'];
    const backgroundOptions = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#4B5563'];

    const [linkUrl, setLinkUrl] = useState('');
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

    const handleApplyLink = useCallback(() => {
        const range = getSelectionRange();
        if (linkUrl && range) {
            onLink(linkUrl, range);
            setLinkUrl('');
            setIsLinkPopoverOpen(false);
        }
    }, [linkUrl, onLink]);

    const handleCommentClick = useCallback(() => {
        const range = getSelectionRange();
        const selectedText = range?.toString();
        if (selectedText && range) {
            onComment(selectedText, range);
        }
    }, [onComment]);

    const handleApplyColor = useCallback((type: 'foreColor' | 'backColor', color: string) => {
        applyFormatting(type, color);
    }, []);

    return (
        <div
            className="absolute bg-card text-card-foreground p-1 rounded-md shadow-lg flex items-center space-x-1 z-50 border"
            style={{ top: position.y, left: position.x }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('bold')}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('italic')}><Italic className="h-4 w-4" /></Button>
            
            <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><LinkIcon className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2">
                    <div className="space-y-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                        <Button onClick={handleApplyLink} size="sm" className="w-full">Apply</Button>
                    </div>
                </PopoverContent>
            </Popover>
            
            <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Palette className="h-4 w-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-7 gap-1">
                        {colorOptions.map(color => <div key={color} onClick={() => handleApplyColor('foreColor', color)} className="h-5 w-5 rounded-sm cursor-pointer" style={{ backgroundColor: color }} />)}
                    </div>
                </PopoverContent>
            </Popover>

            <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Droplet className="h-4 w-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                     <div className="grid grid-cols-7 gap-1">
                        {backgroundOptions.map(color => <div key={color} onClick={() => handleApplyColor('backColor', color)} className="h-5 w-5 rounded-sm cursor-pointer" style={{ backgroundColor: color }} />)}
                    </div>
                </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCommentClick}><MessageSquareText className="h-4 w-4" /></Button>
        </div>
    );
};

const EditableBlock = ({ block, updateBlock, addBlock, deleteBlock, placeholder, className, as: Tag = 'div' }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const { addBlock: contextAddBlock, deleteBlock: contextDeleteBlock } = useNotionEditor();

    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
        updateBlock(block.id, e.currentTarget.innerHTML);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            contextAddBlock('text', block.id);
        } else if (e.key === 'Backspace' && ref.current?.innerHTML === '') {
            e.preventDefault();
            contextDeleteBlock(block.id);
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

// --- Notion-style Editor Implementation ---
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

const BlockRenderer = ({ block }: { block: ContentBlock }) => {
    const { updateBlock, addBlock, deleteBlock } = useNotionEditor();

    switch (block.type) {
        case 'text':
            return <EditableBlock block={block} updateBlock={updateBlock} addBlock={addBlock} deleteBlock={deleteBlock} placeholder="Type '/' for commands" className="text-base py-1" />;
        case 'heading1':
        case 'heading2':
        case 'heading3':
            const Tag = block.type === 'heading1' ? 'h1' : block.type === 'heading2' ? 'h2' : 'h3';
            const sizeClass = block.type === 'heading1' ? 'text-3xl font-bold' : block.type === 'heading2' ? 'text-2xl font-semibold' : 'text-xl font-medium';
            return <EditableBlock block={block} updateBlock={updateBlock} addBlock={addBlock} deleteBlock={deleteBlock} placeholder={block.type.replace('heading', 'Heading ')} className={cn("my-2 py-1", sizeClass)} as={Tag} />;
        default:
            return <div className="text-muted-foreground text-sm">Unsupported Block: {block.type}</div>;
    }
};

const NotionEditor = ({ name }: { name: string }) => {
    const { control, getValues, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove, move } = useFieldArray({ control, name: name as any });

    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

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
                x: rect.left + window.scrollX + (rect.width / 2) - 150,
                y: rect.top + window.scrollY - 50,
            });
            setShowFloatingToolbar(true);
        } else {
            setShowFloatingToolbar(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
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
            if (blockIndex !== -1) remove(blockIndex);
        },
        addComment: (selectedText: string, range: Range) => {
            alert(`Comment on "${selectedText}" - (Logic to save comment goes here)`);
        },
        addLink: (url: string, range: Range) => {
            const selection = window.getSelection();
            if(selection) {
                selection.removeAllRanges();
                selection.addRange(range);
                applyFormatting('createLink', url);
            }
        }
    }), [fields, append, remove, move, getValues, setValue, name]);

    return (
        <NotionEditorContext.Provider value={editorContext}>
            <div className="notion-editor-container p-4 border rounded-md bg-background" ref={editorContainerRef}>
                {fields.map((field) => (
                    <BlockRenderer key={field.id} block={field as ContentBlock} />
                ))}
                 {showFloatingToolbar && (
                    <FloatingToolbar
                        position={toolbarPosition}
                        onComment={editorContext.addComment}
                        onLink={editorContext.addLink}
                    />
                )}
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

    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
                                <ModuleItem key={moduleItem.id} moduleItem={moduleItem} moduleIndex={moduleIndex} removeModule={removeModule} />
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
        if (over && active.id !== over.id) {
            const oldIndex = lessonFields.findIndex(l => l.id === active.id);
            const newIndex = lessonFields.findIndex(l => l.id === over.id);
            moveLesson(oldIndex, newIndex);
        }
    }

    return (
        <Card ref={setNodeRef} style={style}>
            <AccordionItem value={`module-${moduleIndex}`}>
                <CardHeader className="flex flex-row items-center gap-2">
                     <button type="button" {...attributes} {...listeners} className="cursor-grab p-1">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </button>
                     <AccordionTrigger className="w-full flex">
                        <FormField control={useFormContext().control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};

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
