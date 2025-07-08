
"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import { getPricingSettings, updatePricingSettings, getVouchers, upsertVoucher, deleteVoucher as deleteVoucherAction } from "@/app/upload-problem/actions";
import { pricingFormSchema, voucherFormSchema } from "@/lib/admin-schemas";
import type { Voucher } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react";

export function PricingManagementView() {
    return (
        <div className="space-y-8">
            <PricingForm />
            <VoucherManagement />
        </div>
    );
}

function PricingForm() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const form = useForm<z.infer<typeof pricingFormSchema>>({
        resolver: zodResolver(pricingFormSchema),
        defaultValues: {
            inr: { monthly: { price: 0, total: 0 }, biannually: { price: 0, total: 0 }, annually: { price: 0, total: 0 } },
            usd: { monthly: { price: 0, total: 0 }, biannually: { price: 0, total: 0 }, annually: { price: 0, total: 0 } },
        }
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const settings = await getPricingSettings();
            if (settings) {
                form.reset(settings);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [form]);

    const onSubmit = async (data: z.infer<typeof pricingFormSchema>) => {
        setIsSaving(true);
        const result = await updatePricingSettings(data);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pricing Management</CardTitle>
                    <CardDescription>Set the prices for your subscription plans in INR and USD.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                </CardContent>
            </Card>
        );
    }
    
    const PriceInputGroup = ({ currency, plan }: { currency: 'inr' | 'usd', plan: 'monthly' | 'biannually' | 'annually' }) => (
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name={`${currency}.${plan}.price`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price per Month</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name={`${currency}.${plan}.total`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Billed Amount</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Pricing Management</CardTitle>
                        <CardDescription>Set the prices for your subscription plans in INR and USD.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">INR Pricing (₹)</h3>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="monthly"><AccordionTrigger>Monthly</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="inr" plan="monthly" /></AccordionContent></AccordionItem>
                                <AccordionItem value="biannually"><AccordionTrigger>6 Months</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="inr" plan="biannually" /></AccordionContent></AccordionItem>
                                <AccordionItem value="annually"><AccordionTrigger>Yearly</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="inr" plan="annually" /></AccordionContent></AccordionItem>
                            </Accordion>
                        </div>
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">USD Pricing ($)</h3>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="monthly"><AccordionTrigger>Monthly</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="usd" plan="monthly" /></AccordionContent></AccordionItem>
                                <AccordionItem value="biannually"><AccordionTrigger>6 Months</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="usd" plan="biannually" /></AccordionContent></AccordionItem>
                                <AccordionItem value="annually"><AccordionTrigger>Yearly</AccordionTrigger><AccordionContent className="pt-4"><PriceInputGroup currency="usd" plan="annually" /></AccordionContent></AccordionItem>
                            </Accordion>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Prices
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

function VoucherManagement() {
    const { toast } = useToast();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentVoucher, setCurrentVoucher] = useState<Voucher | null>(null);

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getVouchers();
            setVouchers(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load vouchers.' });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const handleAdd = () => {
        setCurrentVoucher(null);
        setDialogOpen(true);
    };

    const handleEdit = (voucher: Voucher) => {
        setCurrentVoucher(voucher);
        setDialogOpen(true);
    };

    const handleDelete = async (voucherId: string) => {
        const result = await deleteVoucherAction(voucherId);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            fetchVouchers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Voucher Management</CardTitle>
                    <CardDescription>Create and manage discount vouchers.</CardDescription>
                </div>
                <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add Voucher</Button>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vouchers.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No vouchers found.</TableCell></TableRow>
                                ) : (
                                    vouchers.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-mono font-semibold">{v.code}</TableCell>
                                            <TableCell>{v.type}</TableCell>
                                            <TableCell>{v.type === 'fixed' ? `$${v.value}` : `${v.value}%`}</TableCell>
                                            <TableCell><UiBadge variant={v.isActive ? 'default' : 'secondary'}>{v.isActive ? 'Active' : 'Inactive'}</UiBadge></TableCell>
                                            <TableCell>{v.expiresAt ? format(v.expiresAt.toDate(), 'PPP') : 'Never'}</TableCell>
                                            <TableCell className="space-x-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(v)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Voucher "{v.code}"?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action is permanent and cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(v.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
            <VoucherFormDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} voucher={currentVoucher} onFormSubmit={fetchVouchers} />
        </Card>
    )
}

function VoucherFormDialog({ isOpen, onOpenChange, voucher, onFormSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, voucher: Voucher | null, onFormSubmit: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const form = useForm<z.infer<typeof voucherFormSchema>>({
        resolver: zodResolver(voucherFormSchema),
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                id: voucher?.id,
                code: voucher?.code || '',
                type: voucher?.type || 'percentage',
                value: voucher?.value || 0,
                isActive: voucher?.isActive ?? true,
                expiresAt: voucher?.expiresAt?.toDate(),
                oneTimeUse: voucher?.oneTimeUse ?? false
            });
        }
    }, [isOpen, voucher, form]);

    const onSubmit = async (data: z.infer<typeof voucherFormSchema>) => {
        setIsSaving(true);
        const result = await upsertVoucher(data);
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
            onFormSubmit();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: typeof result.error === 'string' ? result.error : 'Validation failed.' });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{voucher ? 'Edit' : 'Create'} Voucher</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem><FormLabel>Voucher Code</FormLabel><FormControl><Input {...field} placeholder="e.g., SAVE20" /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (USD)</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="value" render={({ field }) => (
                                <FormItem><FormLabel>Value</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="expiresAt" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Expiration Date</FormLabel><Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )}/>
                        <div className="flex items-center space-x-4">
                            <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Active</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="oneTimeUse" render={({ field }) => (
                                <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>One-Time Use</FormLabel></FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                             <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
