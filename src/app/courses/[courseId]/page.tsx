
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Course, Module, Lesson } from '@/types';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, PlayCircle, BookOpen, Lock, BrainCircuit, MousePointerClick, Code, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Helper function to determine the icon based on the first content block
const getLessonIcon = (lesson: Lesson) => {
    const firstBlockType = lesson.contentBlocks?.[0]?.type;
    switch (firstBlockType) {
        case 'video': return <PlayCircle className="h-5 w-5 text-primary" />;
        case 'problem': return <BrainCircuit className="h-5 w-5 text-primary" />;
        case 'interactive': return <MousePointerClick className="h-5 w-5 text-primary" />;
        case 'image': return <ImageIcon className="h-5 w-5 text-primary" />;
        case 'code': return <Code className="h-5 w-5 text-primary" />;
        case 'text':
        default:
            return <BookOpen className="h-5 w-5 text-primary" />;
    }
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading, isPro } = useAuth();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (authLoading) return; // Wait for auth status to resolve

        if (!user) {
            router.push('/login');
            return;
        }

        if (!courseId) return;

        const fetchCourse = async () => {
            setLoading(true);
            try {
                if (!db) throw new Error("Database not available");
                const courseDocRef = doc(db, 'courses', courseId);
                const docSnap = await getDoc(courseDocRef);

                if (docSnap.exists()) {
                    const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
                    setCourse(courseData);
                } else {
                    console.log("No such course!");
                    router.push('/courses');
                }
            } catch (error) {
                console.error("Error fetching course:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, router, user, authLoading]);

    const firstLessonId = course?.modules?.[0]?.lessons?.[0]?.id;

    if (loading || authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex-1 container py-8 text-center">
                    <h1 className="text-2xl font-bold">Course Not Found</h1>
                    <p className="text-muted-foreground mt-2">The course you are looking for does not exist.</p>
                    <Button asChild className="mt-4"><Link href="/courses">Back to Courses</Link></Button>
                </main>
                <Footer />
            </div>
        );
    }

    const startCourseHref = firstLessonId ? `/courses/${courseId}/lessons/${firstLessonId}` : '#';

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto px-4 md:px-6 py-8">
                    <Button variant="outline" onClick={() => router.push('/courses')} className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Courses
                    </Button>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* --- Main Content --- */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card>
                                <CardHeader>
                                    <Badge variant="secondary" className="w-fit mb-2">{course.category}</Badge>
                                    <CardTitle className="text-3xl md:text-4xl font-bold font-headline tracking-tight">{course.title}</CardTitle>
                                    <CardDescription className="pt-2 text-base">{course.description}</CardDescription>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Content</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="multiple" defaultValue={[`module-${course.modules[0]?.id}`]} className="w-full">
                                        {course.modules.map((moduleItem: Module, index: number) => (
                                            <AccordionItem key={moduleItem.id} value={`module-${moduleItem.id}`}>
                                                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <span className="text-primary font-bold">{(index + 1).toString().padStart(2, '0')}</span>
                                                        <span>{moduleItem.title}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <ul className="space-y-1 pt-2">
                                                        {moduleItem.lessons.map((lesson: Lesson) => {
                                                            const isLessonLocked = (course.isPremium && !isPro) || (!lesson.isFree && !isPro);
                                                            return (
                                                            <li key={lesson.id} className="ml-6">
                                                                <Link 
                                                                    href={isLessonLocked ? '/pricing' : `/courses/${courseId}/lessons/${lesson.id}`} 
                                                                    className={cn(
                                                                        "flex items-center justify-between p-3 rounded-md transition-colors group",
                                                                        isLessonLocked ? "cursor-pointer" : "hover:bg-muted"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {getLessonIcon(lesson)}
                                                                        <span className="font-medium group-hover:text-primary">{lesson.title}</span>
                                                                    </div>
                                                                    {isLessonLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                                                                </Link>
                                                            </li>
                                                        )})}
                                                    </ul>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>
                        {/* --- Sidebar Card --- */}
                        <div className="lg:col-span-1">
                            <Card className="sticky top-20">
                                <CardContent className="pt-6">
                                    <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                                        <Image 
                                            src={course.thumbnailUrl || 'https://placehold.co/600x400.png'} 
                                            alt={course.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <Button asChild size="lg" className="w-full" disabled={!firstLessonId}>
                                        <Link href={startCourseHref}>Start Course</Link>
                                    </Button>
                                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                                        <p><strong>{course.modules.length}</strong> {course.modules.length === 1 ? 'module' : 'modules'}</p>
                                        <p><strong>{course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0)}</strong> {course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0) === 1 ? 'lesson' : 'lessons'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
