
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { bulkAddProblems } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud } from "lucide-react";
import type { Problem } from "@/types";

type ProblemInput = Omit<Problem, "id">;

const fileSchema = z.instanceof(FileList).refine(files => files?.length === 1, 'JSON file is required.');

const formSchema = z.object({
  categoryName: z.string().min(1, "Please select a category."),
  jsonFile: fileSchema,
});

const problemInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  sampleCode: z.string(),
  testcases: z.string(),
  metadataType: z.string(),
  hints: z.array(z.string()),
  examples: z.array(z.object({
    id: z.string().optional(), // id from old schema, can be ignored.
    input: z.string().optional(),
    output: z.string(),
    explanation: z.string().optional(),
  })),
});

const problemsArraySchema = z.array(problemInputSchema);


interface BulkAddDialogProps {
    categories: { name: string }[];
}


export function BulkAddDialog({ categories }: BulkAddDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { categoryName: "", jsonFile: undefined },
  });

  const fileRef = form.register("jsonFile");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const file = values.jsonFile[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error("Failed to read file.");
            }
            const jsonData = JSON.parse(text);

            const validationResult = problemsArraySchema.safeParse(jsonData);
            if (!validationResult.success) {
                 console.error(validationResult.error.flatten());
                 throw new Error("JSON data is not in the correct format.");
            }
            
            const problems: ProblemInput[] = validationResult.data.map(({ examples, ...rest }) => ({
                ...rest,
                examples: examples.map(({ id, ...ex }) => ex) // remove id from examples
            }));

            const result = await bulkAddProblems(values.categoryName, problems);
            
            if (result.success) {
                toast({ title: "Bulk Add Successful!", description: `${result.count} problems added to ${values.categoryName}.` });
                form.reset();
                setIsOpen(false);
            } else {
                toast({ variant: "destructive", title: "Failed to add problems", description: result.error });
            }

        } catch (error) {
             toast({ variant: "destructive", title: "Invalid JSON file", description: error instanceof Error ? error.message : "Could not parse or validate the file." });
        } finally {
            setIsLoading(false);
        }
    };
    
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Read Error", description: "There was an error reading the file." });
        setIsLoading(false);
    }
    
    reader.readAsText(file);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UploadCloud /> Bulk Add Problems</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add Problems via JSON</DialogTitle>
          <DialogDescription>
            Select a category and upload a JSON file containing an array of problems.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={categories.length === 0}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={categories.length === 0 ? "Please add a category first" : "Select a category"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="jsonFile"
                render={() => (
                    <FormItem>
                        <FormLabel>JSON File</FormLabel>
                         <FormControl>
                            <Input type="file" accept=".json" {...fileRef} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
             />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload and Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
