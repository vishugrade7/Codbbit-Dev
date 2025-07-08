
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For unique IDs
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, useFieldArray, useWatch, useFormContext, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Link as LinkIcon, MessageSquareText, Palette, Droplet, GripVertical, Trash2, Edit, PlusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { upsertCourseToFirestore } from "@/app/upload-problem/actions";
import { courseFormSchema } from "@/lib/admin-schemas";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";

// Helper for applying formatting
const applyFormatting = (command: string, value: string | null = null) => {
  document.execCommand(command, false, value);
  // After applying format, manually trigger an 'input' event
  // on the active contenteditable element to ensure React state updates.
  const activeElement = document.activeElement;
  if (activeElement && activeElement.isContentEditable) {
    const event = new Event('input', { bubbles: true });
    activeElement.dispatchEvent(event);
  }
};

// Helper for getting selected text range
const getSelectionRange = () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0);
  }
  return null;
};

// --- Floating Toolbar Component ---
const FloatingToolbar = ({ position, onFormat, onComment, onLink, selectedText }: any) => {
  const colorOptions = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF']; // Tailwind-ish colors
  const backgroundOptions = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#4B5563'];

  // State to control the visibility of the color picker dropdown
  const [showColorPickerDropdown, setShowColorPickerDropdown] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Function to apply color or background color
  const handleColorApply = (type: any, color: any) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      if (type === 'text') {
        span.style.color = color;
      } else {
        span.style.backgroundColor = color;
        // Apply border-radius and padding for background highlights
        span.style.borderRadius = '0.25rem'; // Equivalent to Tailwind's rounded-sm or rounded-md
        span.style.padding = '0.1rem 0.3rem'; // Small padding around the text
      }
      // Surround contents
      range.surroundContents(span);
      // Clear selection after applying style
      selection.removeAllRanges();

      // Manually trigger an 'input' event on the active contenteditable element
      // to ensure React state updates.
      const activeElement = document.activeElement;
      if (activeElement && activeElement.isContentEditable) {
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
      }
    }
    setShowColorPickerDropdown(false); // Close dropdown after selection
  };
  
    const handleApplyLink = useCallback(() => {
        const range = getSelectionRange();
        if (linkUrl && range) {
            onLink(linkUrl, range);
            setLinkUrl('');
            setShowLinkInput(false);
        }
    }, [linkUrl, onLink]);

    const handleCommentClick = useCallback(() => {
        const range = getSelectionRange();
        if (selectedText && range) {
            onComment(selectedText, range);
        }
    }, [selectedText, onComment]);


  return (
    <div
      className="absolute bg-gray-800 text-white p-1 rounded-lg shadow-lg flex items-center space-x-1 z-50"
      style={{ top: position.y, left: position.x }}
      // Prevent losing focus on contenteditable when interacting with toolbar
      onMouseDown={(e) => e.preventDefault()}
    >
        <Button variant="ghost" size="icon" onClick={() => onFormat('bold')} className="text-white hover:bg-gray-700 h-8 w-8"><Bold className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onFormat('italic')} className="text-white hover:bg-gray-700 h-8 w-8"><Italic className="h-4 w-4" /></Button>
         <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700 h-8 w-8"><LinkIcon className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
                <Input type="url" placeholder="Paste link..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleApplyLink(); }} />
            </PopoverContent>
        </Popover>
        <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-gray-700 h-8 w-8"><Palette className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-auto p-1">
                 <div className="grid grid-cols-7 gap-1">
                    {colorOptions.map((color, i) => (<button key={`text-color-${i}`} className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: color }} onClick={() => handleColorApply('text', color)}></button>))}
                </div>
            </PopoverContent>
        </Popover>
        <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-gray-700 h-8 w-8"><Droplet className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-auto p-1">
                <div className="grid grid-cols-7 gap-1">
                    {backgroundOptions.map((color, i) => (<button key={`bg-color-${i}`} className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: color }} onClick={() => handleColorApply('background', color)}></button>))}
                </div>
            </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={handleCommentClick} className="text-white hover:bg-gray-700 h-8 w-8"><MessageSquareText className="h-4 w-4" /></Button>
    </div>
  );
};

// --- Block Picker Component ---
const BlockPicker = ({ position, onSelectBlock, onClose }: any) => {
  const blockOptions = [
    { type: 'text', label: 'Text', icon: 'T' },
    { type: 'heading1', label: 'Heading 1', icon: 'H1' },
    { type: 'heading2', label: 'Heading 2', icon: 'H2' },
    { type: 'heading3', label: 'Heading 3', icon: 'H3' },
    { type: 'table', label: 'Table', icon: '🔲' },
    { type: 'code', label: 'Code', icon: '</>' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'todo-list', label: 'To-do list', icon: '✅' },
    { type: 'quote', label: 'Quote', icon: '❝' },
    { type: 'callout', label: 'Callout', icon: '💡' },
    { type: 'divider', label: 'Divider', icon: '---' },
    { type: 'mcq-creator', label: 'MCQ Creator', icon: '❓' },
    { type: 'button', label: 'Button', icon: '🔘' },
    { type: 'apex-challenge', label: 'Apex Challenge', icon: '☁️' },
    { type: 'live-code-renderer', label: 'Live Code Renderer', icon: '🖥️' }, // New Live Code Renderer option
    { type: 'columns-2', label: '2 columns', icon: '〢' },
    { type: 'columns-3', label: '3 columns', icon: '☰' },
    { type: 'columns-4', label: '4 columns', icon: '⧉' },
    { type: 'columns-5', label: '5 columns', icon: '⊞' },
  ];

  const [filter, setFilter] = useState('');
  const filteredOptions = blockOptions.filter(option =>
    option.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="absolute bg-gray-800 text-white p-2 rounded-lg shadow-lg z-50"
      style={{ top: position.y, left: position.x, width: '250px' }}
    >
      <input
        type="text"
        placeholder="Type to filter..."
        className="w-full p-2 bg-gray-700 rounded-md text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' && filteredOptions.length > 0) {
            onSelectBlock(filteredOptions[0].type);
            e.preventDefault();
          }
        }}
      />
      <div className="max-h-60 overflow-y-auto">
        {filteredOptions.map((option) => (
          <button
            key={option.type}
            className="w-full text-left p-2 rounded-md hover:bg-gray-700 flex items-center space-x-2 text-sm"
            onClick={() => onSelectBlock(option.type)}
          >
            <span className="text-gray-400 w-6 text-center">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Individual Block Components ---

const EditableBlock = ({ id, type, content, onContentChange, onKeyDown, placeholder, className = '' }: any) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== content) {
      contentRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = useCallback(() => {
    if (contentRef.current) {
        onContentChange(id, contentRef.current.innerHTML);
    }
  }, [id, onContentChange]);

  const handlePaste = useCallback((e: any) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    const event = new Event('input', { bubbles: true });
    e.target.dispatchEvent(event);
  }, []);

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={(e) => onKeyDown(e, id, type)}
      onPaste={handlePaste}
      className={cn("focus:outline-none", className, "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground")}
      data-placeholder={placeholder}
    />
  );
};

const TextBlock = ({ id, content, onContentChange, onKeyDown }: any) => (
  <EditableBlock
    id={id}
    type="text"
    content={content}
    onContentChange={onContentChange}
    onKeyDown={onKeyDown}
    placeholder="Type '/' for commands"
    className="text-foreground text-base min-h-[1.5em]"
  />
);

const HeadingBlock = ({ id, type, content, onContentChange, onKeyDown }: any) => {
  const Tag: any = type === 'heading1' ? 'h1' : type === 'heading2' ? 'h2' : 'h3';
  const fontSizeClass = type === 'heading1' ? 'text-4xl font-bold' : type === 'heading2' ? 'text-3xl font-semibold' : 'text-2xl font-medium';
  const placeholder = `Type '/' for commands or type ${type === 'heading1' ? '# ' : type === 'heading2' ? '## ' : '### '} for ${type.replace('heading', 'Heading ')}`;

  return (
    <Tag className={cn("text-foreground", fontSizeClass, "my-2 min-h-[1.2em]")}>
      <EditableBlock
        id={id}
        type={type}
        content={content}
        onContentChange={onContentChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </Tag>
  );
};

// --- Main Editor Component ---
const NotionEditor = ({ name }: { name: string }) => {
  const { control, getValues, setValue } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: name as any });
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [blockPickerPosition, setBlockPickerPosition] = useState({ x: 0, y: 0 });
  const [currentBlockIdForPicker, setCurrentBlockIdForPicker] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);

  const updateBlockContent = useCallback((id: string, newContent: any) => {
    const index = fields.findIndex((field: any) => field.id === id);
    if (index !== -1) {
        const currentBlocks = getValues(name as any);
        const newBlocks = [...currentBlocks];
        newBlocks[index].content = newContent;
        setValue(name as any, newBlocks, { shouldDirty: true });
    }
  }, [fields, getValues, name, setValue]);

    const addBlock = useCallback((type: string, afterId: string) => {
    const newBlock: any = { id: uuidv4(), type, content: '' };
    if (type.startsWith('heading')) {
      newBlock.content = '';
    } else if (type === 'code') {
      newBlock.content = { code: '', language: 'javascript' };
    }
    
    const index = fields.findIndex((field: any) => field.id === afterId);
    append(newBlock, { shouldFocus: true }); // This will append at the end, need to splice it in
    
    setShowBlockPicker(false);
    
  }, [append, fields]);

  const deleteBlock = useCallback((idToDelete: string) => {
    const index = fields.findIndex((field: any) => field.id === idToDelete);
    if (index !== -1) {
        remove(index);
    }
  }, [fields, remove]);

  const handleKeyDown = useCallback((e: any, id: string, blockType: string) => {
    if (e.key === '/') {
      const selection = window.getSelection();
      if(selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setBlockPickerPosition({
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 5,
        });
        setCurrentBlockIdForPicker(id);
        setShowBlockPicker(true);
        e.preventDefault();
      }
    } else if (e.key === 'Backspace' && e.target.innerHTML === '' && blockType !== 'page-title' && fields.length > 1) {
      deleteBlock(id);
      e.preventDefault();
    } else if (e.key === 'Enter' && !e.shiftKey && blockType !== 'code' && blockType !== 'todo-item' && blockType !== 'mcq-creator' && blockType !== 'button-text' && blockType !== 'apex-challenge' && blockType !== 'live-code-renderer') {
      e.preventDefault();
      addBlock('text', id);
    }
  }, [addBlock, deleteBlock, fields.length]);
  
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString());
      setToolbarPosition({
        x: rect.left + window.scrollX + rect.width / 2 - 150, // Center toolbar
        y: rect.top + window.scrollY - 50, // Above selection
      });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
      setSelectedText('');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleFormat = useCallback((command: string) => {
    applyFormatting(command);
    setShowToolbar(false); // Hide toolbar after applying format
  }, []);

  const handleLink = useCallback(() => {
    savedSelectionRangeRef.current = getSelectionRange();
    const url = prompt("Enter URL:");
    if (url) {
      if (savedSelectionRangeRef.current) {
        const selection = window.getSelection();
        if(selection) {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRangeRef.current);
        }
      }
      applyFormatting('createLink', url);
    }
    setShowToolbar(false);
    savedSelectionRangeRef.current = null;
  }, []);

  const handleComment = useCallback(() => {
    savedSelectionRangeRef.current = getSelectionRange();
    const commentText = prompt("Add your comment:");
    if (commentText) {
      if (savedSelectionRangeRef.current) {
        const selection = window.getSelection();
        if(selection) {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRangeRef.current);
        }
      }
      alert(`Comment added to "${selectedText}": ${commentText}`);
    }
    setShowToolbar(false);
    savedSelectionRangeRef.current = null;
  }, [selectedText]);

  const renderBlock = (block: any, index: number) => {
    const commonProps = {
      id: block.id,
      content: block.content,
      onContentChange: updateBlockContent,
      onKeyDown: handleKeyDown,
    };

    let BlockComponent: any;
    switch (block.type) {
      case 'text':
        BlockComponent = TextBlock;
        break;
      case 'heading1':
      case 'heading2':
      case 'heading3':
        BlockComponent = HeadingBlock;
        break;
      default:
        return <div key={block.id}>Unsupported block type: {block.type}</div>;
    }

    return (
        <div key={block.id} className="relative group">
            <BlockComponent {...commonProps} type={block.type} />
        </div>
    )
  };

  return (
    <div className="bg-card text-foreground font-sans p-4" ref={editorRef}>
      <div className="max-w-4xl mx-auto py-4">
        {fields.map((field, index) => renderBlock(field, index))}
      </div>
      {showBlockPicker && (
        <BlockPicker
          position={blockPickerPosition}
          onSelectBlock={(type: string) => addBlock(type, currentBlockIdForPicker as string)}
          onClose={() => setShowBlockPicker(false)}
        />
      )}
      {showToolbar && (
        <FloatingToolbar
          position={toolbarPosition}
          onFormat={handleFormat}
          onComment={handleComment}
          onLink={handleLink}
          selectedText={selectedText}
        />
      )}
    </div>
  );
};


export function CourseForm({ course, onBack }: { course: any, onBack: () => void }) {
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
            modules: course?.modules || [{ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: 'Initial text block' }] }] }],
            isPublished: course?.isPublished || false,
            isPremium: course?.isPremium || false,
        },
    });

    async function onSubmit(values: z.infer<typeof courseFormSchema>) {
        setIsSubmitting(true);
        const result = await upsertCourseToFirestore({ ...values, createdBy: 'admin-user' });
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
            description: "Please check all fields for errors.",
        });
    }

    const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({ control: form.control, name: "modules" });

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
                
                {moduleFields.map((moduleItem, moduleIndex) => (
                    <Card key={moduleItem.id}>
                        <CardHeader>
                             <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                                <FormItem><FormLabel>Module Title</FormLabel><FormControl><Input placeholder={`Module ${moduleIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardHeader>
                        <CardContent>
                            <LessonList moduleIndex={moduleIndex} />
                        </CardContent>
                         <CardFooter>
                            <Button type="button" variant="destructive" onClick={() => removeModule(moduleIndex)}>Remove Module</Button>
                        </CardFooter>
                    </Card>
                ))}
                 <Button type="button" variant="outline" onClick={() => appendModule({ id: uuidv4(), title: '', lessons: [{ id: uuidv4(), title: '', isFree: true, contentBlocks: [{id: uuidv4(), type: 'text', content: '' }] }] })}>Add Module</Button>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {formMode === 'add' ? 'Create Course' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </FormProvider>
    )
}

function LessonList({ moduleIndex }: { moduleIndex: number }) {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `modules.${moduleIndex}.lessons`
    });

    return (
        <div className="space-y-4 pl-6 border-l-2">
            {fields.map((lessonItem, lessonIndex) => (
                <Accordion key={lessonItem.id} type="single" collapsible className="w-full border rounded-md">
                    <AccordionItem value={`lesson-${lessonIndex}`} className="border-b-0">
                         <AccordionTrigger className="px-4 hover:no-underline">
                             <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                                <FormItem className="flex-1"><FormControl><Input placeholder={`Lesson ${lessonIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </AccordionTrigger>
                         <AccordionContent className="p-4 border-t">
                             <NotionEditor name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentBlocks`} />
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), title: '', isFree: true, contentBlocks: [{ id: uuidv4(), type: 'text', content: '' }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Lesson</Button>
        </div>
    );
}
