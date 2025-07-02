
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Module, Lesson, Problem, ApexProblemsData, ContentBlock } from '@/types';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, PlayCircle, FileText, BookOpen, Lock, BrainCircuit, ArrowRight, MousePointerClick, Code, Image as ImageIcon } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import Image from 'next/image';

type ProblemWithCategory = Problem & { categoryName: string };

const getLessonIcon = (lesson: Lesson) => {
    // For simplicity, we'll use the icon of the first content block.
    // A more sophisticated approach could be to have a predefined icon for the lesson.
    const firstBlockType = lesson.contentBlocks?.[0]?.type;
    switch (firstBlockType) {
        case 'video': return <PlayCircle className="h-5 w-5" />;
        case 'problem': return <BrainCircuit className="h-5 w-5" />;
        case 'interactive': return <MousePointerClick className="h-5 w-5" />;
        case 'image': return <ImageIcon className="h-5 w-5" />;
        case 'code': return <Code className="h-5 w-5" />;
        case 'text':
        default:
            return <BookOpen className="h-5 w-5" />;
    }
}

// Block renderer component
const ContentBlockRenderer = ({ block, problemMap }: { block: ContentBlock; problemMap: Map<string, ProblemWithCategory> }) => {
  const { resolvedTheme } = useTheme();

  switch (block.type) {
    case 'text':
      return <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose dark:prose-invert max-w-none">{block.content}</ReactMarkdown>;
    
    case 'image':
      return (
        <div className="my-4">
          <Image src={block.content} alt={block.caption || 'Lesson image'} width={800} height={450} className="object-contain rounded-lg border mx-auto" onContextMenu={(e) => e.preventDefault()} />
          {block.caption && <p className="text-center text-sm text-muted-foreground mt-2">{block.caption}</p>}
        </div>
      );

    case 'code':
      const editorHeight = `${(block.content.split('\n').length * 21) + 32}px`;
      return (
        <div className="my-4 rounded-lg border overflow-hidden bg-card">
            <div className="px-4 py-2 bg-muted/50 border-b">
                <span className="text-sm font-semibold uppercase text-muted-foreground">{block.language || 'Code'}</span>
            </div>
            <MonacoEditor
                height={editorHeight}
                language={block.language || 'apex'}
                value={block.content}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                    readOnly: true,
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    fontFamily: 'var(--font-source-code-pro)',
                    automaticLayout: true,
                }}
            />
        </div>
      );

    case 'video': {
        let videoUrl = block.content;
        if (block.content.includes('youtube.com/watch?v=')) {
            const videoId = block.content.split('v=')[1]?.split('&')[0];
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (block.content.includes('youtu.be/')) {
             const videoId = block.content.split('/').pop()?.split('?')[0];
             videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (block.content.includes('box.com/s/')) {
            const baseUrl = block.content.replace('/s/', '/embed/s/');
            try {
              const url = new URL(baseUrl);
              url.searchParams.set('theme', 'dark');
              url.searchParams.set('show_parent_path', '0');
              videoUrl = url.toString();
            } catch (e) {
              videoUrl = baseUrl; // Fallback if URL parsing fails
            }
        }
         return (
            <div className="aspect-video my-4">
                <iframe onContextMenu={(e) => e.preventDefault()} className="w-full h-full rounded-lg" src={videoUrl} title="Lesson Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            </div>
        );
    }

    case 'problem': {
        const problem = problemMap.get(block.content);
        if (!problem) {
            return <p>Error: Problem with ID "{block.content}" not found.</p>;
        }
        return (
            <div className="text-center p-8 border rounded-lg bg-card my-4">
                <BrainCircuit className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Practice Problem: {problem.title}</h3>
                <p className="text-muted-foreground mb-6">This lesson includes a practice problem to test your knowledge.</p>
                <Button asChild>
                    <Link href={`/problems/apex/${encodeURIComponent(problem.categoryName)}/${problem.id}`}>
                        Go to Problem
                    </Link>
                </Button>
            </div>
        );
    }
      
    case 'interactive':
      return (
        <iframe
            srcDoc={block.content}
            title="Interactive Content"
            className="w-full h-[80vh] border rounded-lg bg-white my-4"
            sandbox="allow-scripts allow-same-origin"
        />
      );
      
    default:
      return null;
  }
};

const LessonContent = ({ lesson, problemMap }: { lesson: Lesson; problemMap: Map<string, ProblemWithCategory> }) => {
    return (
        <div className="space-y-6">
            {lesson.contentBlocks?.map(block => (
                <ContentBlockRenderer key={block.id} block={block} problemMap={problemMap} />
            ))}
        </div>
    );
};


// Main page component
export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();

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
                    
                    if (courseData.isPremium && !isPro) {
                        router.push('/pricing');
                        return; 
                    }
                    
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
    }, [courseId, lessonId, router, isPro, user, authLoading]);

    if (loading || authLoading) {
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
                                                            {getLessonIcon(lesson)}
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
                    <main className="h-full flex flex-col bg-background relative">
                         {userData && (
                            <div
                              className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 flex flex-wrap gap-x-20 gap-y-10 opacity-20">
                                {Array.from({ length: 200 }).map((_, i) => (
                                  <span
                                    key={i}
                                    className="text-foreground/50 font-bold text-lg -rotate-45 whitespace-nowrap"
                                  >
                                    {userData.email}
                                  </span>
                                ))}
                              </div>
                            </div>
                        )}
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
