"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { submitContactForm } from "./actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  type: z.enum(['Support', 'Feedback']),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

export default function ContactPage() {
  const { toast } = useToast();
  const [formType, setFormType] = useState<'Support' | 'Feedback'>('Support');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Support',
      subject: '',
      message: '',
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    const newType = checked ? 'Feedback' : 'Support';
    setFormType(newType);
    form.setValue('type', newType);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const result = await submitContactForm(values);

    if (result.success) {
      toast({
        title: "Submission Successful",
        description: result.message,
      });
      form.reset();
      setFormType('Support');
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
