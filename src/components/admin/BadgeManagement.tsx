
"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { badgeFormSchema } from "@/lib/admin-schemas";
import { getBadges, upsertBadge, deleteBadge as deleteBadgeAction } from "@/app/upload-problem/actions";
import { useToast } from "@/hooks/use-toast";
import type { Badge } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export function BadgeManagementView() {
    const { toast } = useToast();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);

    const fetchBadges = useCallback(async () => {
        setLoading(true);
        const result = await getBadges();
        if (result.success) {
            setBadges(result.badges);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchBadges();
    }, [fetchBadges]);
    
    const handleAdd = () => {
        setCurrentBadge(null);
        setDialogOpen(true);
    };
    
    const handleEdit = (badge: Badge) => {
        setCurrentBadge(badge);
        setDialogOpen(true);
    };

    const handleDelete = async (badgeId: string) => {
        const result = await deleteBadgeAction(badgeId);
         if (result.success) {
            toast({ title: 'Success!', description: result.message });
            fetchBadges();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const handleFormSubmit = () => {
        setDialogOpen(false);
        fetchBadges();
    };

    return (
        <Card>
            <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Badge Management</CardTitle>
                    <CardDescription>Define and manage the criteria for awarding achievement badges.</CardDescription>
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Badge
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
                                    <TableHead>Badge Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {badges.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No badges found. Add one to get started.</TableCell>
                                    </TableRow>
                                ) : (
                                    badges.map((badge) => (
                                        <TableRow key={badge.id}>
                                            <TableCell className="font-medium">{badge.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{badge.description}</TableCell>
                                            <TableCell><UiBadge variant="secondary">{badge.type}</UiBadge></TableCell>
                                            <TableCell>{badge.value} {badge.type === 'CATEGORY_SOLVED' ? `in ${badge.category}` : ''}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(badge)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(badge.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
            <BadgeFormDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                badge={currentBadge}
                onFormSubmit={handleFormSubmit}
            />
        </Card>
    )
}

function BadgeFormDialog({ isOpen, onOpenChange, badge, onFormSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, badge: Badge | null, onFormSubmit: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const formMode = badge ? 'edit' : 'add';

    const form = useForm<z.infer<typeof badgeFormSchema>>({
        resolver: zodResolver(badgeFormSchema),
        defaultValues: {
            id: badge?.id,
            name: badge?.name || '',
            description: badge?.description || '',
            type: badge?.type || 'POINTS',
            value: badge?.value || 1,
            category: badge?.category || '',
        },
    });

    const badgeType = form.watch('type');
    
    useEffect(() => {
        form.reset({
            id: badge?.id,
            name: badge?.name || '',
            description: badge?.description || '',
            type: badge?.type || 'POINTS',
            value: badge?.value || 1,
            category: badge?.category || '',
        });
    }, [badge, form]);

    const onSubmit = async (values: z.infer<typeof badgeFormSchema>) => {
        setIsSaving(true);
        const result = await upsertBadge(values);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            onFormSubmit();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{formMode === 'add' ? 'Add New Badge' : 'Edit Badge'}</DialogTitle>
                    <DialogDescription>Define the criteria for this achievement.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Badge Name</FormLabel><FormControl><Input placeholder="e.g., Streak Starter" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Solve problems 3 days in a row" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="STREAK">Streak</SelectItem>
                                    <SelectItem value="POINTS">Points</SelectItem>
                                    <SelectItem value="TOTAL_SOLVED">Total Solved</SelectItem>
                                    <SelectItem value="CATEGORY_SOLVED">Category Solved</SelectItem>
                                    <SelectItem value="ACTIVE_DAYS">Active Days</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="value" render={({ field }) => (
                                <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        {badgeType === 'CATEGORY_SOLVED' && (
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Problem Category</FormLabel><FormControl><Input placeholder="e.g., Arrays & Hashing" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Badge
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
