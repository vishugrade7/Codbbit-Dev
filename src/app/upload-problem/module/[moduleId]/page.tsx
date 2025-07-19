
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Course, Module } from "@/types";
import { courseFormSchema } from "@/lib/admin-schemas";
import { upsertCourseToFirestore } from "@/app/upload-problem/actions";

import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { CourseFormContext, ModuleLessonsEditor } from "@/components/admin/CourseManagement";

type FormSchema = z.infer<typeof courseFormSchema>;

export default function ModuleEditorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const moduleId = params.moduleId as string;
    const courseId = searchParams.get('courseId');

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [moduleIndex, setModuleIndex] = useState<number | null>(null);

    const form = useForm<FormSchema>({
        resolver: zodResolver(courseFormSchema),
        defaultValues: {
            title: '',
            description: '',
            category: '',
            thumbnailUrl: '',
            modules: [],
            isPublished: false,
            isPremium: false,
        }
    });

    useEffect(() => {
        if (!courseId || !moduleId) {
            toast({ variant: "destructive", title: "Error", description: "Missing Course or Module ID." });
            router.push('/upload-problem?view=course-management');
            return;
        }

        const fetchCourse = async () => {
            setLoading(true);
            const courseDocRef = doc(db, 'courses', courseId);
            const docSnap = await getDoc(courseDocRef);

            if (docSnap.exists()) {
                const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
                form.reset(courseData as FormSchema);
                
                const foundModuleIndex = courseData.modules.findIndex(m => m.id === moduleId);
                if (foundModuleIndex !== -1) {
                    setModuleIndex(foundModuleIndex);
                } else {
                    toast({ variant: 'destructive', title: 'Module not found in this course.' });
                    router.push(`/upload-problem?view=course-form&courseId=${courseId}`);
                }

            } else {
                toast({ variant: 'destructive', title: 'Course not found.' });
                router.push('/upload-problem?view=course-management');
            }
            setLoading(false);
        };

        fetchCourse();

    }, [courseId, moduleId, router, toast, form]);
    
    const onSubmit = async (data: FormSchema) => {
        if (!courseId) return;
        setIsSaving(true);
        const result = await upsertCourseToFirestore({ id: courseId, ...data });
        if (result.success) {
            toast({ title: 'Success!', description: 'Course module saved successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };

    if (loading || moduleIndex === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const module = form.watch(`modules.${moduleIndex}`);

    return (
        <CourseFormContext>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="container py-8 space-y-6">
                     <div className="flex justify-between items-center mb-6">
                        <Button type="button" variant="outline" onClick={() => router.push(`/upload-problem?view=course-form&courseId=${courseId}`)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Module
                        </Button>
                    </div>

                    <h1 className="text-3xl font-bold">Editing Module: <span className="text-primary">{module.title}</span></h1>

                    <ModuleLessonsEditor moduleIndex={moduleIndex} />
                </form>
            </FormProvider>
        </CourseFormContext>
    );
}
