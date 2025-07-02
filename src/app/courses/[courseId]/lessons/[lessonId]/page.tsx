
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Module, Lesson, Problem, ApexProblemsData } from '@/types';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, PlayCircle, FileText, BookOpen, Lock, BrainCircuit, ArrowRight, MousePointerClick } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Problem with category for linking
type ProblemWithCategory = Problem & { categoryName: string };

// Lesson content renderer component
const LessonContent = ({ lesson, problemMap }: { lesson: Lesson; problemMap: Map<string, ProblemWithCategory> }) => {
    switch(lesson.contentType) {
        case 'interactive':
            return (
                <iframe
                    srcDoc={lesson.content}
                    title={lesson.title}
                    className="w-full h-[80vh] border rounded-lg bg-white"
                    sandbox="allow-scripts allow-same-origin"
                />
            );
        case 'video': {
            let videoUrl = lesson.content;
            if (lesson.content.includes('youtube.com/watch?v=')) {
                const videoId = lesson.content.split('v=')[1]?.split('&')[0];
                videoUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (lesson.content.includes('youtu.be/')) {
                 const videoId = lesson.content.split('/').pop()?.split('?')[0];
                 videoUrl = `https://www.youtube.com/embed/${videoId}`;
            }
             return (
                <div className="aspect-video">
                    <iframe className="w-full h-full rounded-lg" src={videoUrl} title={lesson.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
            );
        }
        case 'text':
             // NOTE: Using dangerouslySetInnerHTML is risky if content isn't sanitized.
             // For a real app, use a library like 'react-markdown' or 'sanitize-html'.
            return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />;
        case 'pdf':
             return (
                <div className="w-full h-[80vh] border rounded-lg overflow-hidden">
                    <iframe src={lesson.content} className="w-full h-full" title={lesson.title}></iframe>
                </div>
            );
        case 'problem': {
            const problem = problemMap.get(lesson.content);
            if (!problem) {
                return <p>Error: Problem with ID "{lesson.content}" not found.</p>;
            }
            return (
                <div className="text-center p-8 border rounded-lg bg-card">
                    <BrainCircuit className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="text-xl font-bold mb-2">Practice Problem: {problem.title}</h3>
                    <p className="text-muted-foreground mb-6">This lesson includes a practice problem to test your knowledge.</p>
                    <Button asChild>
                        <Link href={`/problems/apex/${encodeURIComponent(problem.categoryName)}/${problem.id}`}>
                            Go to Problem
                        </Link>
                    </Button>
                </div>
            )
        }
        default:
            return <p>Content type not supported.</p>;
    }
}

// Main page component
export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const { userData } = useAuth();

    const courseId = params.courseId as string;
    const lessonId = params.lessonId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [nextLesson, setNextLesson] = useState<{ lessonId: string } | null>(null);
    const [prevLesson, setPrevLesson] = useState<{ lessonId: string } | null>(null);
    const [problemMap, setProblemMap] = useState<Map<string, ProblemWithCategory>>(new Map());
    const [loading, setLoading] = useState(true);
    
    const isPro = userData?.razorpaySubscriptionStatus === 'active' || userData?.isAdmin;

    useEffect(() => {
        const fetchAllProblems = async () => {
            if (!db) return;
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const problemsSnap = await getDoc(apexDocRef);
                if (problemsSnap.exists()) {
                    const data = problemsSnap.data().Category as ApexProblemsData;
                    const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );
                    setProblemMap(new Map(problems.map(p => [p.id, p])));
                }
            } catch (error) {
                console.error("Error fetching all problems:", error);
            }
        };
        fetchAllProblems();
    }, []);

    useEffect(() => {
        if (!courseId) return;

        const fetchCourse = async () => {
            setLoading(true);
            try {
                const courseDocRef = doc(db, 'courses', courseId);
                const docSnap = await getDoc(courseDocRef);

                if (docSnap.exists()) {
                    const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
                    setCourse(courseData);

                    const allLessons: ({ lesson: Lesson, moduleId: string })[] = courseData.modules.flatMap(m => m.lessons.map(l => ({ lesson: l, moduleId: m.id })));
                    const currentLessonIndex = allLessons.findIndex(item => item.lesson.id === lessonId);

                    if (currentLessonIndex !== -1) {
                        const { lesson, moduleId } = allLessons[currentLessonIndex];
                        setCurrentLesson(lesson);
                        setCurrentModuleId(moduleId);
                        
                        if (!lesson.isFree && !isPro) {
                            router.push('/pricing');
                            return; 
                        }

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
    }, [courseId, lessonId, router, isPro]);

    const lessonIcons = {
        video: <PlayCircle className="h-5 w-5" />,
        pdf: <FileText className="h-5 w-5" />,
        text: <BookOpen className="h-5 w-5" />,
        problem: <BrainCircuit className="h-5 w-5" />,
        interactive: <MousePointerClick className="h-5 w-5" />,
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!course || !currentLesson) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><p>Lesson not found or you do not have access.</p></div>;
    }

    return (
        <div className="h-screen flex flex-col">
            <Header />
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                <ResizablePanel defaultSize={25} minSize={20} className="hidden md:block bg-card">
                    <ScrollArea className="h-full p-4">
                        <div className="mb-4">
                            <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)} className="mb-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Course
                            </Button>
                            <h2 className="text-lg font-semibold">{course.title}</h2>
                        </div>
                        <Accordion type="single" collapsible defaultValue={currentModuleId ?? undefined} className="w-full">
                             {course.modules.map((moduleItem) => (
                                <AccordionItem key={moduleItem.id} value={moduleItem.id}>
                                    <AccordionTrigger className="text-base font-semibold hover:no-underline">{moduleItem.title}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-1 pt-2">
                                            {moduleItem.lessons.map((lesson) => (
                                                 <li key={lesson.id}>
                                                    <Link 
                                                        href={(!lesson.isFree && !isPro) ? '/pricing' : `/courses/${courseId}/lessons/${lesson.id}`} 
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-md transition-colors group",
                                                            lesson.id === lessonId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {lessonIcons[lesson.contentType as keyof typeof lessonIcons] || <BookOpen className="h-5 w-5 text-primary" />}
                                                            <span className="font-medium">{lesson.title}</span>
                                                        </div>
                                                        {(!lesson.isFree && !isPro) && <Lock className="h-4 w-4 text-muted-foreground" />}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                             ))}
                        </Accordion>
                    </ScrollArea>
                </ResizablePanel>
                 <ResizableHandle withHandle className="hidden md:flex"/>
                <ResizablePanel defaultSize={75}>
                    <main className="h-full flex flex-col bg-background">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h1 className="text-3xl font-bold font-headline">{currentLesson.title}</h1>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <LessonContent lesson={currentLesson} problemMap={problemMap} />
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t flex justify-between">
                             <Button variant="outline" onClick={() => prevLesson ? router.push(`/courses/${courseId}/lessons/${prevLesson.lessonId}`) : router.push(`/courses/${courseId}`)} disabled={!prevLesson}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            <Button onClick={() => nextLesson ? router.push(`/courses/${courseId}/lessons/${nextLesson.lessonId}`) : router.push(`/courses/${courseId}`)} >
                                {nextLesson ? 'Next Lesson' : 'Finish Course'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </main>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
