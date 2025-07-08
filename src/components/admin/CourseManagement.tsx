
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, useContext } from "react";
import { useForm, useFieldArray, useWatch, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { doc, getDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, Course, Module, Lesson, ContentBlock as ContentBlockType } from "@/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

import { useToast } from "@/hooks/use-toast";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, Edit, BookOpenCheck, GripVertical, FileVideo, Quote, Type, Heading1, Heading2, Heading3, Code, Image as ImageIcon, Columns, List, ListOrdered, Bold, Italic, Link as LinkIcon, MessageSquareText, Palette, Droplet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormDescription } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "../ui/textarea";

type ProblemWithCategory = Problem & { categoryName: string };

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

const SortableModuleItem = ({
  moduleItem,
  moduleIndex,
  children,
}: {
  moduleItem: any;
  moduleIndex: number;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: moduleItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={`module-${moduleIndex}`} className="border rounded-lg mb-4 bg-card">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab p-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <FormField
              control={useFormContext().control}
              name={`modules.${moduleIndex}.title`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={`Module ${moduleIndex + 1}: Title`}
                      {...field}
                      className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 border-t">{children}</AccordionContent>
      </AccordionItem>
    </div>
  );
};

export function CourseForm({ course, onBack }: { course: Course | null, onBack: () => void }) {
    const { user: authUser } = useAuth();
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
            modules: course?.modules || [{ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: '' }] }] }],
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

    const { fields: moduleFields, append: appendModule, remove: removeModule, move: moveModule } = useFieldArray({ control: form.control, name: "modules" });

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = moduleFields.findIndex((field) => field.id === active.id);
            const newIndex = moduleFields.findIndex((field) => field.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                moveModule(oldIndex, newIndex);
            }
        }
    };

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
    
    function onInvalid(errors: any) {
        console.error("Form validation errors:", errors);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Please check for empty titles or other required fields in your course structure.",
            duration: 5000,
        });
    }
    
    return (
      <div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
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
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <Accordion type="multiple" className="w-full" defaultValue={['module-0']}>
                                <SortableContext items={moduleFields} strategy={verticalListSortingStrategy}>
                                    {moduleFields.map((moduleItem, moduleIndex) => (
                                        <SortableModuleItem key={moduleItem.id} moduleItem={moduleItem} moduleIndex={moduleIndex}>
                                            <LessonList
                                                moduleIndex={moduleIndex}
                                                control={form.control}
                                            />
                                            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => removeModule(moduleIndex)}><Trash2 className="mr-2 h-4 w-4"/>Remove Module</Button>
                                        </SortableModuleItem>
                                    ))}
                                </SortableContext>
                             </Accordion>
                        </DndContext>
                        <Button type="button" variant="outline" onClick={() => appendModule({ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: '' }] }] })} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Module</Button>
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
                <Accordion key={lessonItem.id} type="single" collapsible className="w-full border rounded-md bg-background/50">
                    <AccordionItem value={`lesson-${lessonIndex}`} className="border-b-0">
                         <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                                <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl><Input placeholder={`Lesson ${lessonIndex + 1}`} {...field} className="font-semibold" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => {e.stopPropagation(); remove(lessonIndex)}}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4 border-t">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                                <NotionEditor name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks`} />
                             </div>
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            ))}
             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Lesson</Button>
        </div>
    );
}

// --- Editor Context and Main Component ---
const NotionEditorContext = React.createContext<{
    updateBlock: (id: string, newContent: any) => void;
    addBlock: (type: string, afterId: string) => void;
    deleteBlock: (id: string) => void;
    addComment: (selectedText: string, range: Range) => void;
    addLink: (url: string, range: Range) => void;
}>({
    updateBlock: () => {},
    addBlock: () => {},
    deleteBlock: () => {},
    addComment: () => {},
    addLink: () => {},
});

function NotionEditor({ name }: { name: string }) {
    const { control, getValues, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove, move } = useFieldArray({ control, name: name as any });

    const editorContext = useMemo(() => ({
        updateBlock: (id: string, newContent: any) => {
            const blockIndex = fields.findIndex(f => (f as any).id === id);
            if (blockIndex !== -1) {
                const currentValues = getValues(name as any);
                const updatedBlocks = [...currentValues];
                updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], content: newContent };
                setValue(name as any, updatedBlocks, { shouldDirty: true });
            }
        },
        addBlock: (type: string, afterId: string) => {
            const blockIndex = fields.findIndex(f => (f as any).id === afterId);
            const newBlock: ContentBlockType = { id: uuidv4(), type: type as any, content: '' };
            // Initialize content based on type
            if (type.startsWith('heading')) newBlock.content = '';
            else if (type === 'table') newBlock.content = { rows: [['', ''], ['', '']], cols: 2, data: [['', ''], ['', '']] } as any;
            else if (type === 'code') newBlock.content = { code: '', language: 'javascript' };
            else if (type === 'image') newBlock.content = 'https://placehold.co/600x400.png';
            else if (type === 'todo-list') newBlock.content = { items: [{ id: uuidv4(), text: 'New todo', checked: false }] } as any;
            else if (type.startsWith('columns-')) {
                const numColumns = parseInt(type.split('-')[1], 10);
                (newBlock.content as any) = { columnBlocks: Array(numColumns).fill(0).map(() => ({ id: uuidv4(), type: 'text', content: '' })) };
                (newBlock as any).numColumns = numColumns;
            }

            if (blockIndex !== -1) {
                const currentValues = getValues(name as any);
                const updatedBlocks = [
                    ...currentValues.slice(0, blockIndex + 1),
                    newBlock,
                    ...currentValues.slice(blockIndex + 1)
                ];
                setValue(name as any, updatedBlocks, { shouldFocus: true });
            } else {
                append(newBlock, { shouldFocus: true });
            }
        },
        deleteBlock: (id: string) => {
            const blockIndex = fields.findIndex(f => (f as any).id === id);
            if (blockIndex !== -1) {
                remove(blockIndex);
            }
        },
        addComment: (selectedText: string, range: Range) => {
            alert(`Comment on "${selectedText}"`);
        },
        addLink: (url: string, range: Range) => {
             const selection = window.getSelection();
             if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('createLink', false, url);
             }
        },
    }), [fields, getValues, setValue, name, append, remove]);
    
    return (
        <NotionEditorContext.Provider value={editorContext}>
            <div className="notion-editor-container p-4 border rounded-md bg-background">
                {fields.map((field, index) => (
                    <BlockRenderer key={field.id} block={field as ContentBlockType} />
                ))}
                 <Button type="button" variant="ghost" size="sm" onClick={() => editorContext.addBlock('text', fields[fields.length - 1]?.id || '')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Block
                </Button>
            </div>
        </NotionEditorContext.Provider>
    );
}

function BlockRenderer({ block }: { block: ContentBlockType }) {
    const context = useContext(NotionEditorContext);

    // Placeholder for components that are not yet fully implemented
    const PlaceholderBlock = ({ type }: { type: string }) => (
        <div className="my-2 p-4 border-dashed border-2 rounded-md text-muted-foreground bg-muted/50">
            Block Type: <strong>{type}</strong> - Component not implemented yet.
             <pre className="text-xs mt-2">{JSON.stringify(block.content, null, 2)}</pre>
        </div>
    );

    switch (block.type) {
        case 'text':
        case 'heading1':
        case 'heading2':
        case 'heading3':
        case 'quote':
        case 'list':
        case 'list-ordered':
            return <EditableBlock block={block} />;
        case 'code':
            return <CodeBlock block={block} />;
        case 'image':
             return <ImageBlock block={block} />;
        case 'divider':
             return <hr className="my-4" />;
        default:
            return <PlaceholderBlock type={block.type} />;
    }
}

// Reusable Editable Block
function EditableBlock({ block }: { block: ContentBlockType }) {
    const { updateBlock, addBlock, deleteBlock } = useContext(NotionEditorContext);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== block.content) {
            ref.current.innerHTML = block.content as string;
        }
    }, [block.content]);

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
    
    const Tag = useMemo(() => {
        switch (block.type) {
            case 'heading1': return 'h1';
            case 'heading2': return 'h2';
            case 'heading3': return 'h3';
            case 'quote': return 'blockquote';
            case 'list': return 'li';
            case 'list-ordered': return 'li';
            default: return 'div';
        }
    }, [block.type]);

    const placeholder = `Type '/' for commands...`;

    return (
        <Tag
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onKeyDown={onKeyDown}
            data-placeholder={placeholder}
            className={cn(
                "w-full outline-none",
                "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none empty:before:block",
                 block.type === 'heading1' && 'text-3xl font-bold',
                 block.type === 'heading2' && 'text-2xl font-semibold',
                 block.type === 'heading3' && 'text-xl font-medium',
                 block.type === 'quote' && 'pl-4 border-l-4 italic',
            )}
        />
    );
}

function CodeBlock({ block }: { block: ContentBlockType }) {
     const { updateBlock } = useContext(NotionEditorContext);
     const content = block.content as { code: string; language: string };

     const handleCodeChange = (newCode: string | undefined) => {
        updateBlock(block.id, { ...content, code: newCode || '' });
     };
     
     const handleLangChange = (newLang: string) => {
        updateBlock(block.id, { ...content, language: newLang });
     };

    return (
        <div className="my-2 p-2 border rounded-md bg-card">
             <Select value={content.language} onValueChange={handleLangChange}>
                <SelectTrigger className="w-[180px] h-8 mb-2">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="apex">Apex</SelectItem>
                </SelectContent>
            </Select>
            <div className="h-64 border rounded-md overflow-hidden">
                <MonacoEditor
                    height="100%"
                    language={content.language}
                    value={content.code}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
            </div>
        </div>
    );
}

function ImageBlock({ block }: { block: ContentBlockType }) {
    const { updateBlock } = useContext(NotionEditorContext);
    return (
        <div className="my-2 p-2 border rounded-md">
            <Input 
                placeholder="Image URL" 
                value={block.content as string}
                onChange={(e) => updateBlock(block.id, e.target.value)}
            />
            {block.content && <img src={block.content as string} alt="lesson content" className="mt-2 rounded-md max-h-80" />}
        </div>
    );
}

