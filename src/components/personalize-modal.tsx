"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { getPersonalizedProjects } from "@/app/actions";
import type { Project } from "@/types";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FormSchema = z.object({
  visitorDescription: z.string().min(10, {
    message: "Please tell us a bit more about yourself (at least 10 characters).",
  }).max(500, {
    message: "Description must not be longer than 500 characters."
  }),
});

interface PersonalizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonalize: (projects: Project[]) => void;
}

export default function PersonalizeModal({ open, onOpenChange, onPersonalize }: PersonalizeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      visitorDescription: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    const result = await getPersonalizedProjects(data.visitorDescription);
    
    if ('error' in result) {
       toast({
        variant: "destructive",
        title: "Personalization Failed",
        description: result.error,
      });
    } else {
       onPersonalize(result as Project[]);
       onOpenChange(false);
       form.reset();
    }
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Personalize Your View</DialogTitle>
          <DialogDescription>
            Tell us who you are or what you're looking for, and we'll tailor the showcase for you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="visitorDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About You (e.g., recruiter, developer, designer)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="I'm a tech recruiter looking for full-stack developers with experience in AI..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Personalize
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
