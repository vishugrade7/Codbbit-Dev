
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useToast } from "@/hooks/use-toast";
import { getNavigationSettings, updateNavigationSettings } from "@/app/upload-problem/actions";
import { navLinksSchema } from "@/lib/admin-schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, PlusCircle, Trash2, GripVertical } from "lucide-react";
import { Separator } from "../ui/separator";

export function NavigationManagementView() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof navLinksSchema>>({
        resolver: zodResolver(navLinksSchema),
        defaultValues: { links: [] }
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "links" });

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const links = await getNavigationSettings();
                form.reset({ links });
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error', description: "Could not load navigation settings." });
            }
            setIsLoading(false);
        };
        loadSettings();
    }, [form, toast]);

    const onSubmit = async (data: z.infer<typeof navLinksSchema>) => {
        setIsSaving(true);
        const result = await updateNavigationSettings(data.links);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    if (isLoading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Navigation Management</CardTitle>
                <CardDescription>Configure the main application navigation links.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </CardContent>
        </Card>
      )
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Navigation Management</CardTitle>
                        <CardDescription>Enable, disable, add, or remove navigation links.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start sm:items-center gap-2 p-3 border rounded-lg flex-col sm:flex-row">
                                <GripVertical className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                                    <FormField
                                        control={form.control}
                                        name={`links.${index}.label`}
                                        render={({ field }) => <FormItem><FormLabel className="sm:hidden">Label</FormLabel><FormControl><Input placeholder="Label" {...field} /></FormControl><FormMessage/></FormItem>}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`links.${index}.href`}
                                        render={({ field }) => <FormItem><FormLabel className="sm:hidden">Href</FormLabel><FormControl><Input placeholder="Href (e.g. /about)" {...field} /></FormControl><FormMessage/></FormItem>}
                                    />
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto">
                                    <div className="flex items-center gap-4 pl-2">
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.isPro`}
                                            render={({ field: switchField }) => (
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`pro-${index}`} className="text-sm">Pro Only</Label>
                                                    <Switch id={`pro-${index}`} checked={switchField.value} onCheckedChange={switchField.onChange} />
                                                </div>
                                            )}
                                        />
                                        <Separator orientation="vertical" className="h-6" />
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.isEnabled`}
                                            render={({ field: switchField }) => (
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`enabled-${index}`} className="text-sm">Enabled</Label>
                                                    <Switch id={`enabled-${index}`} checked={switchField.value} onCheckedChange={switchField.onChange} />
                                                </div>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" disabled={field.isProtected} onClick={() => remove(index)} className="text-destructive disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), label: '', href: '/', isEnabled: false, isProtected: false, isPro: false })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Link
                        </Button>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}
