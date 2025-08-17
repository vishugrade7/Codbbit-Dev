
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { problemFormSchema } from '@/lib/admin-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash, PlusCircle } from 'lucide-react';
import type { Problem } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

type ProblemFormProps = {
  onSubmit: (values: z.infer<typeof problemFormSchema>) => Promise<void>;
  isLoading: boolean;
  categories: string[];
  initialData?: Problem & { categoryName: string };
  onCancel: () => void;
};

export function ProblemForm({ onSubmit, isLoading, categories, initialData, onCancel }: ProblemFormProps) {
  const form = useForm<z.infer<typeof problemFormSchema>>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: {
      id: initialData?.id || '',
      title: initialData?.title || '',
      categoryName: initialData?.categoryName || '',
      description: initialData?.description || '',
      difficulty: initialData?.difficulty || 'Easy',
      examples: initialData?.examples?.length ? initialData.examples : [{ input: '', output: '', explanation: '' }],
      hints: initialData?.hints?.length ? initialData.hints.map(h => ({ value: h })) : [{value: ''}],
      metadataType: initialData?.metadataType || 'Class',
      triggerSObject: initialData?.triggerSObject || '',
      sampleCode: initialData?.sampleCode || '',
      testcases: initialData?.testcases || '',
      company: initialData?.company || '',
      companyLogoUrl: initialData?.companyLogoUrl || '',
      isPremium: initialData?.isPremium || false,
    },
  });

  const { fields: exampleFields, append: appendExample, remove: removeExample } = useFieldArray({
    control: form.control,
    name: 'examples',
  });
  
  const { fields: hintFields, append: appendHint, remove: removeHint } = useFieldArray({
    control: form.control,
    name: 'hints',
  });

  return (
    <Card>
        <CardHeader>
            <CardTitle>{initialData ? 'Edit Problem' : 'Add New Problem'}</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input placeholder="Two Sum" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="categoryName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Problem description..." {...field} rows={5}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="metadataType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Metadata Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select metadata type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Class">Class</SelectItem>
                            <SelectItem value="Trigger">Trigger</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                 {form.watch('metadataType') === 'Trigger' && (
                    <FormField
                        control={form.control}
                        name="triggerSObject"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Trigger SObject</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g. Account" {...field} />
                            </FormControl>
                            <FormDescription>The SObject API name the trigger will be on.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
                
                <FormField
                    control={form.control}
                    name="isPremium"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Premium Problem
                                </FormLabel>
                                <FormDescription>
                                Mark this problem as premium to require a Pro subscription.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />


                <div>
                    <h3 className="text-lg font-medium mb-4">Examples</h3>
                    {exampleFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-start mb-4 p-4 border rounded-md">
                            <FormField
                            control={form.control}
                            name={`examples.${index}.input`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Input</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="nums = [2,7,11,15], target = 9" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                            control={form.control}
                            name={`examples.${index}.output`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Output</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="[0,1]" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                            control={form.control}
                            name={`examples.${index}.explanation`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Explanation</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeExample(index)} className="mt-8">
                                <Trash />
                            </Button>
                        </div>
                    ))}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendExample({ input: '', output: '', explanation: '' })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Example
                    </Button>
                </div>
                 <div>
                    <h3 className="text-lg font-medium mb-4">Hints</h3>
                    {hintFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-start mb-4">
                            <FormField
                            control={form.control}
                            name={`hints.${index}.value`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="Hint text..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeHint(index)}>
                                <Trash />
                            </Button>
                        </div>
                    ))}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendHint({ value: '' })}
                    >
                         <PlusCircle className="mr-2 h-4 w-4"/> Add Hint
                    </Button>
                </div>
                 <FormField
                    control={form.control}
                    name="sampleCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sample Code</FormLabel>
                        <FormControl>
                            <Textarea placeholder="public class Solution { ... }" {...field} rows={10}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="testcases"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Test Cases</FormLabel>
                        <FormControl>
                            <Textarea placeholder="@isTest private class SolutionTest { ... }" {...field} rows={10}/>
                        </FormControl>
                         <FormDescription>
                           Your test class must include at least one method annotated with @isTest.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                <div className="flex justify-end gap-4">
                     <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Problem'}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
