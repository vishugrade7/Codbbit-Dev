
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Module, Lesson, Problem, ApexProblemsData, ContentBlock } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, PlayCircle, BookOpen, Lock, BrainCircuit, ArrowRight } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Progress } from '@/components/ui/progress';
import { markLessonAsComplete } from '@/app/profile/actions';

const getLessonIcon = (lesson: Lesson) => {
    // Simplified since we only have 'text' blocks for now
    return <BookOpen className="h-5 w-5" />;
};

// Simplified renderer for just text blocks
const LessonContent = ({ lesson }: { lesson: Lesson }) => {
    const firstBlock = lesson.contentBlocks?.[0];
    const markdownContent = firstBlock?.content || "";

    return (
        <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownContent}
            </ReactMarkdown>
        </div>
    );
};


// Main page component
export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData, loading: authLoading, isPro } = useAuth();

    const courseId = params.courseId as string;
    const lessonId = params.lessonId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [nextLesson, setNextLesson] = useState<{ lessonId: string } | null>(null);
    const [prevLesson, setPrevLesson] = useState<{ lessonId: string } | null>(null);
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
                const courseDocRef = doc(db, 'courses', courseId);
                const docSnap = await getDoc(courseDocRef);

                if (docSnap.exists()) {
                    const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
                    
                    setCourse(courseData);

                    const allLessons: ({ lesson: Lesson, moduleId: string })[] = (courseData.modules || []).flatMap(m => m.lessons.map(l => ({ lesson: l, moduleId: m.id })));
                    const currentLessonIndex = allLessons.findIndex(item => item.lesson.id === lessonId);

                    if (currentLessonIndex !== -1) {
                        const { lesson, moduleId } = allLessons[currentLessonIndex];

                        const isLessonLocked = (courseData.isPremium && !isPro) || (!lesson.isFree && !isPro);

                        if(isLessonLocked) {
                            router.push('/pricing');
                            return; 
                        }

                        setCurrentLesson(lesson);
                        setCurrentModuleId(moduleId);
                        
                        setPrevLesson(currentLessonIndex > 0 ? { lessonId: allLessons[currentLessonIndex - 1].lesson.id } : null);
                        setNextLesson(currentLessonIndex < allLessons.length - 1 ? { lessonId: allLessons[currentLessonIndex + 1].lesson.id } : null);
                    } else {
                        router.push(`/courses/${courseId}`);
                    }
                } else {
                    router.push('/courses');
                }
            } catch (error) {
                console.error("Error fetching course:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, lessonId, router, isPro, user, authLoading]);

    const { progressPercentage, completedLessonsCount, totalLessonsCount } = useMemo(() => {
        if (!course || !course.modules) {
            return { progressPercentage: 0, completedLessonsCount: 0, totalLessonsCount: 0 };
        }

        const allLessonIds = new Set(course.modules.flatMap(m => m.lessons.map(l => l.id)));
        const totalLessons = allLessonIds.size;

        if (totalLessons === 0) {
            return { progressPercentage: 0, completedLessonsCount: 0, totalLessonsCount: 0 };
        }
        
        const completedInCourse = userData?.completedLessons 
            ? Object.keys(userData.completedLessons).filter(id => allLessonIds.has(id)).length 
            : 0;

        const percentage = (completedInCourse / totalLessons) * 100;
        
        return { 
            progressPercentage: percentage, 
            completedLessonsCount: completedInCourse, 
            totalLessonsCount: totalLessons 
        };
    }, [course, userData?.completedLessons]);

    const handleCompleteAndNavigate = async () => {
        if (user && lessonId && !userData?.completedLessons?.[lessonId]) {
            await markLessonAsComplete(user.uid, lessonId);
        }
        const targetUrl = nextLesson ? `/courses/${courseId}/lessons/${nextLesson.lessonId}` : `/courses/${courseId}`;
        router.push(targetUrl);
    };

    if (loading || authLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!course || !currentLesson) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><p>Lesson not found or you do not have access.</p></div>;
    }

    return (
        <div className="h-screen flex flex-col pt-16 md:pt-0">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                <ResizablePanel defaultSize={25} minSize={20} className="hidden md:block bg-card">
                    <ScrollArea className="h-full p-4">
                        <div className="mb-4">
                            <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)} className="mb-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Course
                            </Button>
                            <h2 className="text-lg font-semibold">{course.title}</h2>
                            {totalLessonsCount > 0 && (
                                <div className="mt-2 space-y-1">
                                    <Progress value={progressPercentage} className="h-2" />
                                    <p className="text-xs text-muted-foreground">{completedLessonsCount} / {totalLessonsCount} lessons completed</p>
                                </div>
                            )}
                        </div>
                        <Accordion type="single" collapsible defaultValue={currentModuleId ?? undefined} className="w-full">
                             {course.modules.map((moduleItem) => (
                                <AccordionItem key={moduleItem.id} value={moduleItem.id}>
                                    <AccordionTrigger className="text-base font-semibold hover:no-underline">{moduleItem.title}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-1 pt-2">
                                            {moduleItem.lessons.map((lesson) => {
                                                const isLessonLocked = (course.isPremium && !isPro) || (!lesson.isFree && !isPro);
                                                const isCompleted = !!userData?.completedLessons?.[lesson.id];

                                                return (
                                                 <li key={lesson.id}>
                                                    <Link 
                                                        href={isLessonLocked ? '/pricing' : `/courses/${courseId}/lessons/${lesson.id}`} 
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-md transition-colors group",
                                                            lesson.id === lessonId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                                        )}
                                                    >
                                                        <div className={cn("flex items-center gap-3", isCompleted && !isLessonLocked && "text-muted-foreground")}>
                                                            {getLessonIcon(lesson)}
                                                            <span className="font-medium">{lesson.title}</span>
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
                    </ScrollArea>
                </ResizablePanel>
                 <ResizableHandle withHandle className="hidden md:flex"/>
                <ResizablePanel defaultSize={75}>
                    <main className="h-full flex flex-col bg-background relative">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h1 className="text-3xl font-bold font-headline">{currentLesson.title}</h1>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <LessonContent lesson={currentLesson} />
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t flex justify-between">
                             <Button variant="outline" onClick={() => prevLesson ? router.push(`/courses/${courseId}/lessons/${prevLesson.lessonId}`) : router.push(`/courses/${courseId}`)} disabled={!prevLesson}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            <Button onClick={handleCompleteAndNavigate} >
                                {nextLesson ? 'Next Lesson' : 'Finish Course'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </main>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
