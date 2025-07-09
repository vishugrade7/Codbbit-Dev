

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';


// Firebase and Actions
import { collection, query, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Course, Module, Lesson, ContentBlock, Problem, ApexProblemsData } from "@/types";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { getCache, setCache } from "@/lib/cache";

// ShadCN UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Edit, GripVertical, Trash2, TextIcon, Code2Icon, Languages, Type, MessageSquareQuote, Minus, AlertTriangle, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, ChevronRight, FileQuestion, ImageIcon, VideoIcon, FileAudioIcon, Bold, Italic, Strikethrough, Link as LinkIcon, Table2, ListChecks, BoxSelect, Sheet, Milestone, GitFork, Pencil, X, Palette, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from '../ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function TextareaWithToolbar({ value, onChange, ...props }: { value: string, onChange: (newValue: string) => void, [key: string]: any }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [selection, setSelection] = useState<{ start: number, end: number } | null>(null);

    const [textColor, setTextColor] = useState('#000000');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');


    const handleSelect = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const textarea = event.currentTarget;
        const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
        if (hasSelection) {
            setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
            setIsToolbarOpen(true);
        } else {
            setIsToolbarOpen(false);
        }
    };
    
    const applyMarkdownStyle = (prefix: string, suffix: string = prefix) => {
        if (!selection) return;
        const { start, end } = selection;
        const currentValue = value || '';
        const selectedText = currentValue.substring(start, end);
        
        const newValue = `${currentValue.substring(0, start)}${prefix}${selectedText}${suffix}${currentValue.substring(end)}`;
        onChange(newValue);
        setIsToolbarOpen(false); // Close toolbar after action

        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const handleLinkButtonClick = () => {
        if (!selection) return;
        setIsToolbarOpen(false);
        setIsLinkDialogOpen(true);
    }
    
    const handleColorButtonClick = () => {
        if (!selection) return;
        setIsToolbarOpen(false);
        setIsColorDialogOpen(true);
    };

    const applyColorStyle = () => {
        if (!selection) return;
        const { start, end } = selection;
        const currentValue = value || '';
        const selectedText = currentValue.substring(start, end);

        let styles = [];
        // Use a neutral default color that indicates "no style" to avoid adding unnecessary spans
        if (textColor !== '#000001') styles.push(`color: ${textColor}`);
        if (backgroundColor !== '#ffffff') {
            styles.push(`background-color: ${backgroundColor}`);
            styles.push(`padding: 2px 5px`);
            styles.push(`border-radius: 4px`);
        }
        
        if (styles.length === 0) {
            setIsColorDialogOpen(false);
            return;
        }

        const styleString = styles.join('; ');
        const prefix = `<span style="${styleString}">`;
        const suffix = `</span>`;
        
        const newValue = `${currentValue.substring(0, start)}${prefix}${selectedText}${suffix}${currentValue.substring(end)}`;
        onChange(newValue);
        
        setIsColorDialogOpen(false);

        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };


    const applyLink = () => {
        if (!selection || !linkUrl) return;
        const { start, end } = selection;
        const currentValue = value || '';
        const selectedText = currentValue.substring(start, end);
        
        const newValue = `${currentValue.substring(0, start)}[${selectedText}](${linkUrl})${currentValue.substring(end)}`;
        onChange(newValue);
        
        setIsLinkDialogOpen(false);
        setLinkUrl('');

        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + 1, start + 1 + selectedText.length);
        }, 0);
    }

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    }
    
    return (
        <Popover open={isToolbarOpen} onOpenChange={setIsToolbarOpen}>
            <PopoverTrigger asChild>
                <Textarea 
                    ref={textareaRef} 
                    onSelect={handleSelect} 
                    onBlur={() => setIsToolbarOpen(false)} 
                    value={value} 
                    onChange={handleTextareaChange} 
                    {...props} 
                />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 flex items-center gap-1">
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); applyMarkdownStyle('**'); }}><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); applyMarkdownStyle('*'); }}><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); applyMarkdownStyle('~~'); }}><Strikethrough className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); applyMarkdownStyle('`'); }}><Code2Icon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleLinkButtonClick(); }}><LinkIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleColorButtonClick(); }}><Palette className="h-4 w-4" /></Button>
            </PopoverContent>
            
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Link</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={applyLink}>Add Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply Color Styling</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="text-color">Text Color</Label>
                            <Input id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="p-1 h-10 w-16" />
                        </div>
                         <div className="flex items-center gap-4">
                            <Label htmlFor="bg-color">Background Color</Label>
                            <Input id="bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="p-1 h-10 w-16" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>Cancel</Button>
                        <Button onClick={applyColorStyle}>Apply Style</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Popover>
    )
}

const TextEditorWithPreview = ({ field, placeholder, className }: { field: any; placeholder?: string; className?: string }) => {
    return (
        <div className={cn("rounded-md border", className)}>
            <ResizablePanelGroup direction="horizontal" className="min-h-[200px] max-w-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full">
                        <TextareaWithToolbar
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={placeholder || "Enter lesson content here..."}
                            className="h-full w-full resize-none border-none rounded-none focus-visible:ring-0 p-2"
                        />
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex flex-col h-full">
                        <p className="p-2.5 text-xs font-semibold text-muted-foreground border-b shrink-0">Live Preview</p>
                        <div className="flex-1 p-4 overflow-auto bg-muted/10">
                            <div className="prose dark:prose-invert max-w-none">
                                <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                                    {field.value || ''}
                                </ReactMarkdown>
                                {!field.value && <span className="text-muted-foreground">Preview will appear here.</span>}
                            </div>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};


function BlockTypePicker({ onSelect }: { onSelect: (type: ContentBlock['type']) => void }) {
  const blockTypes: { type: ContentBlock['type']; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
    { type: 'heading1', label: 'Heading 1', icon: <Heading1 className="h-4 w-4" /> },
    { type: 'heading2', label: 'Heading 2', icon: <Heading2 className="h-4 w-4" /> },
    { type: 'heading3', label: 'Heading 3', icon: <Heading3 className="h-4 w-4" /> },
    { type: 'bulleted-list', label: 'Bulleted list', icon: <List className="h-4 w-4" /> },
    { type: 'numbered-list', label: 'Numbered list', icon: <ListOrdered className="h-4 w-4" /> },
    { type: 'todo-list', label: 'To-do list', icon: <CheckSquare className="h-4 w-4" /> },
    { type: 'toggle-list', label: 'Toggle list', icon: <ChevronRight className="h-4 w-4" /> },
    { type: 'code', label: 'Code', icon: <Code2Icon className="h-4 w-4" /> },
    { type: 'quote', label: 'Quote', icon: <MessageSquareQuote className="h-4 w-4" /> },
    { type: 'callout', label: 'Callout', icon: <AlertTriangle className="h-4 w-4" /> },
    { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" /> },
    { type: 'problem', label: 'Problem', icon: <FileQuestion className="h-4 w-4" /> },
    { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'video', label: 'Video', icon: <VideoIcon className="h-4 w-4" /> },
    { type: 'audio', label: 'Audio', icon: <FileAudioIcon className="h-4 w-4" /> },
    { type: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
    { type: 'mcq', label: 'MCQ (Single)', icon: <ListChecks className="h-4 w-4" /> },
    { type: 'breadcrumb', label: 'Breadcrumb', icon: <Milestone className="h-4 w-4" /> },
    { type: 'mermaid', label: 'Mermaid Diagram', icon: <GitFork className="h-4 w-4" /> },
    { type: 'interactive-code', label: 'Interactive Code', icon: <FlaskConical className="h-4 w-4" /> },
    { type: 'two-column', label: 'Two Columns', icon: <BoxSelect className="h-4 w-4 rotate-90" /> },
    { type: 'three-column', label: 'Three Columns', icon: <BoxSelect className="h-4 w-4 rotate-90" /> },
  ];

  return (
    <PopoverContent className="w-64 p-0">
        <ScrollArea className="h-[400px]">
            <div className="p-2 grid gap-1">
                {blockTypes.map(({ type, label, icon }) => (
                <Button key={type} variant="ghost" className="justify-start gap-2" onClick={() => onSelect(type)}>
                    {icon} {label}
                </Button>
                ))}
            </div>
      </ScrollArea>
    </PopoverContent>
  );
}

function CodeBlockEditor({ field }: { field: any }) {
    const { resolvedTheme } = useTheme();
    const [localContent, setLocalContent] = useState(
        typeof field.value === 'object' && field.value !== null
            ? field.value
            : { code: field.value || '', language: 'apex' }
    );

    useEffect(() => {
        const valueIsObject = typeof field.value === 'object' && field.value !== null;
        if (valueIsObject && (field.value.code !== localContent.code || field.value.language !== localContent.language)) {
            setLocalContent(field.value);
        } else if (!valueIsObject && field.value !== localContent.code) {
             setLocalContent({ code: field.value, language: 'apex' });
        }
    }, [field.value, localContent]);
    
    const handleCodeChange = (newValue: string | undefined) => {
        const newCode = newValue || '';
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
    
    const getMonacoLanguage = (lang: string) => {
        switch(lang) {
            case 'apex': return 'java';
            case 'soql': return 'sql';
            default: return lang;
        }
    }

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
            <div className="h-64 w-full">
                <MonacoEditor
                    height="100%"
                    language={getMonacoLanguage(localContent.language || 'apex')}
                    value={localContent.code}
                    onChange={handleCodeChange}
                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                />
            </div>
        </div>
    );
}

function TodoListBlock({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `${path}.content`,
    });

    const addTodo = () => {
        append({ id: uuidv4(), text: '', checked: false });
    };

    return (
        <div className="bg-muted p-4 rounded-md border space-y-2">
            {fields.map((item, todoIndex) => (
                <div key={item.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`${path}.content.${todoIndex}.checked`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`${path}.content.${todoIndex}.text`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="To-do item" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(todoIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <FormField control={control} name={`${path}.content`} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
            <Button type="button" variant="outline" size="sm" onClick={addTodo}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>
    );
}

function ToggleListBlock({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    return (
        <Accordion type="single" collapsible className="w-full bg-muted rounded-md border">
            <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                    <FormField
                        control={control}
                        name={`${path}.content.title`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="Toggle Title" {...field} className="font-medium border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                     <FormField
                        control={control}
                        name={`${path}.content.text`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <TextEditorWithPreview field={field} placeholder="Toggle content..." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

function ProblemBlock({ path }: { path: string }) {
    const { control, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const blockContent = useWatch({
        control,
        name: `${path}.content`
    }) as { problemId:string; title:string; categoryName:string; metadataType?:string; };
    
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const onProblemSelect = (problem: Problem & { categoryName: string }) => {
        setValue(`${path}.content`, {
            problemId: problem.id,
            title: problem.title,
            categoryName: problem.categoryName,
            metadataType: problem.metadataType,
        });
        setIsSelectorOpen(false);
    };

    return (
        <>
            <div className="bg-muted p-4 rounded-md border">
                {blockContent?.problemId ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{blockContent.title}</p>
                            <p className="text-sm text-muted-foreground">{blockContent.categoryName}</p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setIsSelectorOpen(true)}>Change</Button>
                    </div>
                ) : (
                    <Button type="button" variant="outline" className="w-full" onClick={() => setIsSelectorOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Select a Problem
                    </Button>
                )}
                 <FormField control={control} name={`${path}.content.problemId`} render={({ fieldState }) => <FormMessage>{fieldState.error?.message}</FormMessage>} />
            </div>
            <ProblemSelectorDialog
                isOpen={isSelectorOpen}
                onOpenChange={setIsSelectorOpen}
                onSelect={onProblemSelect}
            />
        </>
    );
}

function TableBlockEditor({ path }: { path: string }) {
  const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
  const headersPath = `${path}.content.headers` as const;
  const rowsPath = `${path}.content.rows` as const;

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({ control, name: headersPath });
  const { fields: rowFields, append: appendRow, remove: removeRow, update } = useFieldArray({ control, name: rowsPath });

  const addColumn = () => {
    appendHeader(`Header ${headerFields.length + 1}`);
    rowFields.forEach((row, index) => {
        const newValues = row.values ? [...row.values, ''] : [''];
        update(index, { ...row, values: newValues });
    });
  };

  const removeColumn = (index: number) => {
    if (headerFields.length <= 1) return;
    removeHeader(index);
    rowFields.forEach((row, rowIndex) => {
        if (!row.values) return;
        const newValues = [...row.values];
        newValues.splice(index, 1);
        update(rowIndex, { ...row, values: newValues });
    });
  };

  return (
    <div className="bg-muted p-4 rounded-md border space-y-2">
      <FormField control={control} name={headersPath} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
      <div className="space-y-2">
        {headerFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <FormField control={control} name={`${headersPath}.${index}`} render={({ field }) => (
                <FormItem className="flex-1"><FormControl><Input {...field} placeholder={`Header ${index + 1}`} /></FormControl><FormMessage /></FormItem>
            )} />
            {headerFields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeColumn(index)}><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addColumn}><PlusCircle className="mr-2 h-4 w-4" /> Add Column</Button>
      <Separator />
      <div className="space-y-2">
        {rowFields.map((rowField, rowIndex) => (
          <div key={rowField.id} className="flex items-center gap-2">
            {headerFields.map((_, colIndex) => (
              <FormField key={`${rowField.id}-${colIndex}`} control={control} name={`${rowsPath}.${rowIndex}.values.${colIndex}`} render={({ field }) => (
                <FormItem className="flex-1"><FormControl><Input {...field} placeholder={`Cell`}/></FormControl><FormMessage /></FormItem>
              )} />
            ))}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(rowIndex)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
       <Button type="button" variant="outline" size="sm" onClick={() => appendRow({ values: Array(headerFields.length).fill('') })}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
    </div>
  )
}

function McqBlockEditor({ path }: { path: string }) {
  const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
  const optionsPath = `${path}.content.options` as const;
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control, name: optionsPath });

  const addOption = () => appendOption({ id: uuidv4(), text: '' });
  
  return (
    <div className="bg-muted p-4 rounded-md border space-y-4">
      <FormField control={control} name={`${path}.content.question`} render={({ field }) => (
          <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea {...field} placeholder="What is the capital of France?" /></FormControl><FormMessage /></FormItem>
      )} />
      
      <FormItem>
        <FormLabel>Options</FormLabel>
        <FormField control={control} name={`${path}.content.correctAnswerIndex`} render={({ field, fieldState }) => (
          <>
          <RadioGroup onValueChange={(val) => field.onChange(parseInt(val, 10))} value={String(field.value)} className="space-y-2">
            {optionFields.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <FormControl>
                  <RadioGroupItem value={String(index)} id={`${option.id}-radio`} />
                </FormControl>
                <FormField control={control} name={`${optionsPath}.${index}.text`} render={({ field: optionField }) => (
                  <FormItem className="flex-1"><FormControl><Input {...optionField} placeholder={`Option ${index + 1}`} /></FormControl><FormMessage /></FormItem>
                )} />
                {optionFields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </RadioGroup>
          <FormMessage>{fieldState.error?.message}</FormMessage>
          </>
        )} />
        <FormField control={control} name={optionsPath} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
      </FormItem>

      <Button type="button" variant="outline" size="sm" onClick={addOption}><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
      
      <FormField control={control} name={`${path}.content.explanation`} render={({ field }) => (
          <FormItem><FormLabel>Explanation (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="Provide an explanation for the correct answer." /></FormControl></FormItem>
      )} />
    </div>
  )
}

function BreadcrumbBlockEditor({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `${path}.content`,
    });

    const addItem = () => append({ id: uuidv4(), text: '', href: '' });

    return (
        <div className="bg-muted p-4 rounded-md border space-y-2">
            {fields.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <GripVertical className="h-5 w-5 text-muted-foreground"/>
                    <FormField control={control} name={`${path}.content.${index}.text`} render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="Link Text" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={control} name={`${path}.content.${index}.href`} render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="/optional/path" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}><PlusCircle className="mr-2 h-4 w-4" /> Add Link</Button>
        </div>
    );
}

const LiveMermaidPreview = ({ chart }: { chart: string }) => {
    const { theme } = useTheme();
    const [svg, setSvg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
        });
    }, [theme]);

    useEffect(() => {
        if (!chart) {
            setSvg('');
            setError('');
            return;
        }

        const renderMermaid = async () => {
            try {
                // Unique ID for each render to avoid conflicts
                const id = `live-mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(id, chart);
                setSvg(renderedSvg);
                setError('');
            } catch (e: any) {
                setError(e.message);
                setSvg('');
            }
        };

        const timer = setTimeout(renderMermaid, 300);
        return () => clearTimeout(timer);

    }, [chart, theme]);


    return (
        <div className="w-full h-full flex items-center justify-center">
            {error ? (
                <div className="p-4 text-destructive bg-destructive/10 rounded-md text-xs font-mono whitespace-pre-wrap w-full">
                    {error}
                </div>
            ) : (
                <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full" />
            )}
        </div>
    );
};

function MermaidBlockEditor({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const mermaidCode = useWatch({
        control,
        name: `${path}.content`
    }) as string;

    return (
        <FormField control={control} name={`${path}.content`} render={({ field }) => (
            <FormItem>
                <FormLabel>Mermaid Diagram</FormLabel>
                <ResizablePanelGroup direction="horizontal" className="min-h-[300px] max-w-full rounded-lg border">
                    <ResizablePanel defaultSize={50}>
                        <FormControl className="h-full">
                           <Textarea 
                                placeholder={'graph TD;\n    A-->B;'} 
                                {...field} 
                                className="font-mono h-full w-full resize-none border-none rounded-none focus-visible:ring-0 p-2"
                            />
                        </FormControl>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={50}>
                        <div className="flex flex-col h-full bg-muted/30">
                             <p className="p-2.5 text-xs font-semibold text-muted-foreground border-b">Live Preview</p>
                            <div className="flex-1 p-4 overflow-auto">
                                <LiveMermaidPreview chart={mermaidCode} />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function InteractiveCodeBlockEditor({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { resolvedTheme } = useTheme();
    const executionType = useWatch({ control, name: `${path}.content.executionType` });

    return (
        <div className="bg-muted p-4 rounded-md border space-y-4">
             <FormField
                control={control}
                name={`${path}.content.executionType`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Execution Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || 'anonymous'}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an execution type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="anonymous">Anonymous Apex</SelectItem>
                                <SelectItem value="soql">SOQL Query</SelectItem>
                                <SelectItem value="class">Apex Class</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Select how this code block should be executed. For 'Apex Class', you can provide a test class.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${path}.content.title`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title (Optional)</FormLabel>
                        <FormControl><Input placeholder="Assignment - Declaring a variable" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${path}.content.description`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="Declare a boolean variable..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name={`${path}.content.defaultCode`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{executionType === 'class' ? 'Sample Class Code' : 'Default Code'}</FormLabel>
                        <FormControl>
                             <div className="h-48 w-full border rounded-md overflow-hidden">
                                <MonacoEditor
                                    height="100%"
                                    language="java"
                                    value={field.value}
                                    onChange={(value) => field.onChange(value || "")}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {executionType === 'class' && (
                <FormField
                    control={control}
                    name={`${path}.content.testClassCode`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Test Class Code (Optional)</FormLabel>
                            <FormControl>
                                <div className="h-48 w-full border rounded-md overflow-hidden">
                                    <MonacoEditor
                                        height="100%"
                                        language="java"
                                        value={field.value}
                                        onChange={(value) => field.onChange(value || "")}
                                        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                        options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                                    />
                                </div>
                            </FormControl>
                            <FormDescription>If provided, this test class will be run against the sample class.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}

function ColumnLayoutEditor({ path, numColumns }: { path: string; numColumns: 2 | 3 }) {
    const columnKeys = Array.from({ length: numColumns }, (_, i) => `column${i + 1}`);

    return (
        <div className={cn("grid grid-cols-1 gap-4", numColumns === 2 && "lg:grid-cols-2", numColumns === 3 && "lg:grid-cols-3")}>
            {columnKeys.map((key, index) => (
                <div key={key} className="bg-muted p-4 rounded-md border min-h-[200px]">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Column {index + 1}</h4>
                    <ContentBlockList path={`${path}.content.${key}`} />
                </div>
            ))}
        </div>
    );
}

function ContentBlockList({ path }: { path: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { fields, append, move } = useFieldArray({ name: path });

    const addContentBlock = (type: ContentBlock['type']) => {
        let newBlock: ContentBlock;
        const id = uuidv4();
        switch (type) {
            case 'code': newBlock = { id, type, content: { code: '', language: 'apex' } }; break;
            case 'callout': newBlock = { id, type, content: { text: '', icon: '💡' } }; break;
            case 'todo-list': newBlock = { id, type, content: [{ id: uuidv4(), text: 'New to-do', checked: false }] }; break;
            case 'toggle-list': newBlock = { id, type, content: { title: 'Toggle Title', text: '' } }; break;
            case 'problem': newBlock = { id, type, content: { problemId: '', title: '', categoryName: '' } }; break;
            case 'table': newBlock = { id, type, content: { headers: ['Header 1'], rows: [{ values: ['Cell 1'] }] } }; break;
            case 'mcq': newBlock = { id, type, content: { question: '', options: [{ id: uuidv4(), text: 'Option 1' }, { id: uuidv4(), text: 'Option 2' }], correctAnswerIndex: 0, explanation: '' } }; break;
            case 'breadcrumb': newBlock = { id, type, content: [{ id: uuidv4(), text: 'Home', href: '/' }] }; break;
            case 'mermaid': newBlock = { id, type, content: 'graph TD;\n    A-->B;' }; break;
            case 'interactive-code': newBlock = { id, type, content: { title: 'Try It Yourself', description: 'Your task description here.', defaultCode: '// Your Apex code here', executionType: 'anonymous', testClassCode: '' } }; break;
            case 'two-column': newBlock = { id, type, content: { column1: [], column2: [] } }; break;
            case 'three-column': newBlock = { id, type, content: { column1: [], column2: [], column3: [] } }; break;
            default: newBlock = { id, type, content: (type === 'bulleted-list' ? '* ' : (type === 'numbered-list' ? '1. ' : '')) };
        }
        append(newBlock);
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex(b => b.id === active.id);
            const newIndex = fields.findIndex(b => b.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) { move(oldIndex, newIndex); }
        }
    };

    return (
        <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {fields.map((blockItem, blockIndex) => (
                            <ContentBlockItem key={blockItem.id} path={`${path}.${blockIndex}`} rhfId={blockItem.id} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
             <FormField control={control} name={path} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
             <div className="flex justify-between items-center mt-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Content
                        </Button>
                    </PopoverTrigger>
                    <BlockTypePicker onSelect={addContentBlock} />
                </Popover>
            </div>
        </div>
    );
}

function ContentBlockItem({ path, rhfId }: { path: string; rhfId: string }) {
    const { control, setValue } = useFormContext<z.infer<typeof courseFormSchema>>();
    const parentPath = path.substring(0, path.lastIndexOf('.'));
    const blockIndex = parseInt(path.substring(path.lastIndexOf('.') + 1));
    const { remove: removeBlock } = useFieldArray({ name: parentPath });
    
    const block = useWatch({ control, name: path as any });

    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rhfId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: block.backgroundColor,
        color: block.textColor,
    };

    if (!block) return null;

    const renderBlockEditor = () => {
        switch (block.type) {
            case 'text': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><TextEditorWithPreview field={field} /></FormControl><FormMessage/></FormItem>)}/>
            case 'code': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><CodeBlockEditor field={field} /></FormControl><FormMessage/></FormItem>)}/>
            case 'heading1': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Heading 1" {...field} className="text-3xl font-bold h-auto p-0 border-none shadow-none focus-visible:ring-0" /></FormControl><FormMessage/></FormItem>)}/>
            case 'heading2': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Heading 2" {...field} className="text-2xl font-semibold h-auto p-0 border-none shadow-none focus-visible:ring-0" /></FormControl><FormMessage/></FormItem>)}/>
            case 'heading3': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Heading 3" {...field} className="text-xl font-medium h-auto p-0 border-none shadow-none focus-visible:ring-0" /></FormControl><FormMessage/></FormItem>)}/>
            case 'quote': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><div className="border-l-4 pl-4"><TextEditorWithPreview field={field} placeholder="Enter quote..."/></div></FormControl><FormMessage/></FormItem>)}/>
            case 'callout': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><div className="flex items-start gap-3 p-4 bg-muted rounded-lg"><Input value={field.value.icon} onChange={(e) => field.onChange({...field.value, icon: e.target.value})} className="w-12 text-2xl p-0 h-auto border-none shadow-none focus-visible:ring-0" maxLength={2}/><div className="flex-1"><TextEditorWithPreview field={{value: field.value.text, onChange: (newText: string) => field.onChange({...field.value, text: newText})}} placeholder="Enter callout text..."/></div></div></FormControl><FormMessage/></FormItem>)}/>
            case 'divider': return <hr className="my-4"/>
            case 'bulleted-list': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><TextEditorWithPreview field={field} placeholder="* Item 1..." /></FormControl><FormMessage/></FormItem>)}/>
            case 'numbered-list': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormControl><TextEditorWithPreview field={field} placeholder="1. Item 1..." /></FormControl><FormMessage/></FormItem>)}/>
            case 'todo-list': return <TodoListBlock path={path} />;
            case 'toggle-list': return <ToggleListBlock path={path} />;
            case 'problem': return <ProblemBlock path={path} />;
            case 'image': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem className="space-y-2"><FormLabel className="text-xs text-muted-foreground">Image Block</FormLabel><FormControl><Input placeholder="Image URL..." {...field} /></FormControl>{field.value && (<div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden"><Image src={field.value} alt="Image Preview" fill className="object-contain" /></div>)}<FormMessage /></FormItem>)}/>
            case 'video': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Video Block</FormLabel><FormControl><Input placeholder="Video URL..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
            case 'audio': return <FormField control={control} name={`${path}.content`} render={({ field }) => (<FormItem><FormLabel className="text-xs text-muted-foreground">Audio Block</FormLabel><FormControl><Input placeholder="Audio URL..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
            case 'table': return <TableBlockEditor path={path} />;
            case 'mcq': return <McqBlockEditor path={path} />;
            case 'breadcrumb': return <BreadcrumbBlockEditor path={path} />;
            case 'mermaid': return <MermaidBlockEditor path={path} />;
            case 'interactive-code': return <InteractiveCodeBlockEditor path={path} />;
            case 'two-column': return <ColumnLayoutEditor path={path} numColumns={2} />;
            case 'three-column': return <ColumnLayoutEditor path={path} numColumns={3} />;
            default: const _exhaustiveCheck: never = block.type; return null;
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2 p-2 border rounded-md">
            <button type="button" {...attributes} {...listeners} className="cursor-grab p-1 mt-2 text-muted-foreground">
                <GripVertical className="h-5 w-5" />
            </button>
             <div className="flex-1 space-y-2">
                {renderBlockEditor()}
            </div>
            <div className="flex flex-col items-center">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`bg-color-picker-${rhfId}`} className="text-sm font-medium">BG</Label>
                                <Input
                                    id={`bg-color-picker-${rhfId}`}
                                    type="color"
                                    className="h-8 w-8 p-1 cursor-pointer"
                                    value={block.backgroundColor || '#ffffff'}
                                    onChange={(e) => setValue(`${path}.backgroundColor`, e.target.value)}
                                />
                                {block.backgroundColor && (
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setValue(`${path}.backgroundColor`, undefined)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                             <div className="flex items-center gap-2">
                                <Label htmlFor={`text-color-picker-${rhfId}`} className="text-sm font-medium">Text</Label>
                                <Input
                                    id={`text-color-picker-${rhfId}`}
                                    type="color"
                                    className="h-8 w-8 p-1 cursor-pointer"
                                    value={block.textColor || '#000000'}
                                    onChange={(e) => setValue(`${path}.textColor`, e.target.value)}
                                />
                                {block.textColor && (
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setValue(`${path}.textColor`, undefined)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeBlock(blockIndex)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function LessonItem({ moduleIndex, lessonIndex, rhfId }: { moduleIndex: number, lessonIndex: number, rhfId: string }) {
    const { control, formState: { errors } } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rhfId });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div ref={setNodeRef} style={style} className="border rounded-md bg-card">
            <div className="flex items-start p-3 gap-2">
                <button type="button" {...attributes} {...listeners} className="cursor-grab p-1 mt-1.5 text-muted-foreground"><GripVertical className="h-5 w-5" /></button>
                <div className='flex-1'>
                    <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                        <FormItem>
                            <FormControl><Input placeholder={`Lesson ${lessonIndex + 1}: Title`} {...field} className="font-medium border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); removeLesson(lessonIndex); }}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={`lesson-${lessonIndex}`} className="border-t">
                    <AccordionTrigger className="text-sm px-4 py-2 hover:no-underline font-normal bg-card">
                        <span>Lesson Content</span>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-muted/50 rounded-b-md">
                        <div className="space-y-4">
                            <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.isFree`} render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Free Lesson</FormLabel></FormItem>
                            )} />
                            <ContentBlockList path={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks`} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

function ModuleItem({ moduleIndex, rhfId }: { moduleIndex: number, rhfId: string }) {
    const { control } = useFormContext<z.infer<typeof courseFormSchema>>();
    const { remove: removeModule } = useFieldArray({ name: `modules` });
    const { fields: lessonFields, append: appendLesson, move: moveLesson } = useFieldArray({ name: `modules.${moduleIndex}.lessons` });
    
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rhfId });
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
            <CardHeader className="flex flex-row items-center gap-2 p-3 bg-muted/50 rounded-t-lg">
                <button type="button" {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></button>
                <div className="flex-1">
                    <FormField control={control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                        <FormItem>
                            <FormControl><Input placeholder={`Module ${moduleIndex + 1}: Title`} {...field} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this module and all of its lessons.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeModule(moduleIndex)}>
                                Delete Module
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardHeader>
             <CardContent className="p-4 pt-0">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                    <SortableContext items={lessonFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4 pt-4 pl-6 border-l-2">
                            {lessonFields.map((lessonItem, lessonIndex) => (
                                <LessonItem key={lessonItem.id} moduleIndex={moduleIndex} lessonIndex={lessonIndex} rhfId={lessonItem.id} />
                            ))}
                            <FormField control={control} name={`modules.${moduleIndex}.lessons`} render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
                        </div>
                    </SortableContext>
                </DndContext>
                <div className="flex justify-between items-center mt-4 ml-6">
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLesson({ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
                    </Button>
                </div>
            </CardContent>
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

                <div className="space-y-4">
                     <FormField control={form.control} name="modules" render={({ fieldState }) => <FormMessage>{fieldState.error?.root?.message}</FormMessage>} />
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                        <SortableContext items={moduleFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {moduleFields.map((moduleItem, moduleIndex) => (
                                <ModuleItem key={moduleItem.id} moduleIndex={moduleIndex} rhfId={moduleItem.id} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

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

// #region Problem Selector Dialog
type ProblemWithCategory = Problem & { categoryName: string };
const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

function ProblemSelectorDialog({ isOpen, onOpenChange, onSelect }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSelect: (problem: ProblemWithCategory) => void }) {
    const { toast } = useToast();
    const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const fetchProblems = async () => {
            setLoading(true);
            const processData = (data: ApexProblemsData) => {
                const allProblems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                );
                setProblems(allProblems.sort((a,b) => a.title.localeCompare(b.title)));
            };

            const cachedData = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
            if (cachedData) {
                processData(cachedData);
                setLoading(false);
                return;
            }

            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data().Category as ApexProblemsData;
                    setCache(APEX_PROBLEMS_CACHE_KEY, data);
                    processData(data);
                }
            } catch (error) {
                console.error("Error fetching problems:", error);
                toast({ variant: 'destructive', title: 'Failed to load problems' });
            } finally {
                setLoading(false);
            }
        };

        fetchProblems();
    }, [isOpen, toast]);
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select a Problem</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {problems.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.title}</TableCell>
                                        <TableCell>{p.categoryName}</TableCell>
                                        <TableCell><Button size="sm" onClick={() => onSelect(p)}>Select</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
// #endregion
