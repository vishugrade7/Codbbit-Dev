
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { submitContactForm } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileUp, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Use z.any() for files and perform validation within the component,
// as File object handling can be inconsistent with Zod across environments.
const formSchema = z.object({
  type: z.enum(['Support', 'Feedback']),
  supportType: z.string().optional(),
  feedbackType: z.string().optional(),
  feedbackPage: z.string().optional(),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  attachments: z.array(z.any()).optional(),
}).refine((data) => {
    if (!data.attachments) return true;
    return data.attachments.length <= MAX_FILES;
}, {
    message: `You can upload a maximum of ${MAX_FILES} files.`,
    path: ['attachments'],
}).refine((data) => {
    if (!data.attachments) return true;
    return data.attachments.every((file) => file.size <= MAX_FILE_SIZE_BYTES);
}, {
    message: `Each file must be under ${MAX_FILE_SIZE_MB}MB.`,
    path: ['attachments'],
});

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Support',
      subject: '',
      message: '',
      supportType: 'General Question',
      feedbackType: 'General Feedback',
      feedbackPage: 'Other',
      attachments: [],
    },
  });

  const formType = form.watch('type');
  const attachments = form.watch('attachments');
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const typeFromQuery = searchParams.get('type');
    if (typeFromQuery === 'bug') {
      form.setValue('type', 'Support');
      form.setValue('supportType', 'Bug Report');
    } else if (typeFromQuery === 'feature') {
      form.setValue('type', 'Feedback');
      form.setValue('feedbackType', 'Feature Request');
    }
  }, [searchParams, form]);


  const handleSwitchChange = (checked: boolean) => {
    const newType = checked ? 'Feedback' : 'Support';
    form.setValue('type', newType);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const { attachments, ...dataToSend } = values;
    const result = await submitContactForm({
        ...dataToSend,
        attachmentCount: attachments?.length || 0,
    });

    if (result.success) {
      toast({
        title: "Submission Successful",
        description: result.message,
      });
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: result.error,
      });
    }
    setIsSubmitting(false);
  }

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold font-headline">Support & Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Have a question, a bug report, or some feedback? Let us know.
        </p>
        
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>{formType}</CardTitle>
                    <CardDescription>
                        {formType === 'Support' ? 'Need help with something?' : 'Share your thoughts with us.'}
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="form-type-switch">Support</Label>
                    <Switch
                        id="form-type-switch"
                        checked={formType === 'Feedback'}
                        onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="form-type-switch">Feedback</Label>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {formType === 'Support' && (
                  <FormField
                    control={form.control}
                    name="supportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a support category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bug Report">Bug Report</SelectItem>
                            <SelectItem value="Account Issue">Account Issue</SelectItem>
                            <SelectItem value="Payment Issue">Payment Issue</SelectItem>
                            <SelectItem value="General Question">General Question</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {formType === 'Feedback' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="feedbackType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Feature Request">Feature Request</SelectItem>
                              <SelectItem value="UI/UX Suggestion">UI/UX Suggestion</SelectItem>
                              <SelectItem value="General Feedback">General Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="feedbackPage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Page</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Homepage">Homepage</SelectItem>
                              <SelectItem value="Problems">Problems</SelectItem>
                              <SelectItem value="Courses">Courses</SelectItem>
                              <SelectItem value="Profile">Profile</SelectItem>
                              <SelectItem value="Settings">Settings</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder={formType === 'Support' ? 'e.g., Issue with leaderboard points' : 'e.g., Suggestion for a new feature'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Please provide as much detail as possible..." {...field} rows={8} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Attachments (Optional)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <FileUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="file"
                                    multiple
                                    className="pl-9 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                    onChange={(e) => {
                                        const files = e.target.files ? Array.from(e.target.files) : [];
                                        form.setValue("attachments", files, { shouldValidate: true });
                                    }}
                                />
                            </div>
                        </FormControl>
                        <FormDescription>
                            You can upload up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each.
                        </FormDescription>
                        <FormMessage />
                        {attachments && attachments.length > 0 && (
                            <div className="space-y-2 pt-2">
                                {attachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 text-sm border rounded-md bg-muted">
                                    <span className="truncate pr-2">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={() => {
                                            const newAttachments = attachments.filter((_, i) => i !== index);
                                            form.setValue("attachments", newAttachments, { shouldValidate: true });
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                ))}
                            </div>
                        )}
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit {formType}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
