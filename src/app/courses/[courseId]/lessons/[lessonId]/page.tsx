

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Module, Lesson, ContentBlock, Problem, ApexProblemsData } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, PlayCircle, BookOpen, Lock, BrainCircuit, ArrowRight, Code, AlertTriangle, CheckSquare, FileQuestion } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Progress } from '@/components/ui/progress';
import { markLessonAsComplete } from '@/app/profile/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCache, setCache } from '@/lib/cache';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const getLessonIcon = (lesson: Lesson) => {
    return <BookOpen className="h-5 w-5" />;
};

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';
type ProblemWithCategory = Problem & { categoryName: string };

const LessonContent = ({ contentBlocks, allProblems }: { contentBlocks: ContentBlock[], allProblems: ProblemWithCategory[] }) => {
  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="prose dark:prose-invert max-w-none">
      {(contentBlocks || []).map(block => {
        switch (block.type) {
          case 'text':
            return (
              <ReactMarkdown key={block.id} remarkPlugins={[remarkGfm]}>
                {block.content}
              </ReactMarkdown>
            );
          case 'code':
            return (
                <div key={block.id} className="not-prose my-6 w-fit max-w-full overflow-x-auto rounded-lg shadow-lg border bg-slate-900 border-slate-700">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
                        <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                        {block.content.language?.toUpperCase() || 'CODE'}
                        </span>
                    </div>
                     <SyntaxHighlighter
                        language={block.content.language === 'apex' ? 'java' : block.content.language}
                        style={vscDarkPlus}
                        showLineNumbers={true}
                        customStyle={{ 
                            margin: 0, 
                            padding: '1rem', 
                            backgroundColor: '#1E1E1E'
                        }}
                        codeTagProps={{ style: { fontFamily: 'var(--font-source-code-pro)', fontSize: '0.95rem' } }}
                        lineNumberStyle={{ color: '#858585', fontSize: '0.95rem' }}
                    >
                        {String(block.content.code || '').trim()}
                    </SyntaxHighlighter>
                </div>
            );
           case 'heading1':
                return <h1 key={block.id} className="text-4xl font-bold mt-8 mb-4 border-b pb-2">{block.content}</h1>;
            case 'heading2':
                return <h2 key={block.id} className="text-3xl font-semibold mt-8 mb-4 border-b pb-2">{block.content}</h2>;
            case 'heading3':
                return <h3 key={block.id} className="text-2xl font-semibold mt-6 mb-3">{block.content}</h3>;
            case 'quote':
                return (
                    <blockquote key={block.id} className="not-prose mt-6 border-l-4 border-primary bg-muted/50 p-4 rounded-r-lg">
                        <div className="prose prose-sm dark:prose-invert text-muted-foreground italic">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {block.content}
                            </ReactMarkdown>
                        </div>
                    </blockquote>
                );
            case 'callout':
                return (
                    <div key={block.id} className="not-prose my-6 flex items-start gap-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
                        <div className="text-2xl pt-1">{block.content.icon}</div>
                        <div className="prose dark:prose-invert max-w-none text-primary/90">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {block.content.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                );
            case 'divider':
                return <hr key={block.id} className="my-8" />;
            case 'bulleted-list':
            case 'numbered-list':
              return (
                <ReactMarkdown key={block.id} remarkPlugins={[remarkGfm]}>
                  {block.content}
                </ReactMarkdown>
              );
            case 'todo-list':
              return (
                <div key={block.id} className="not-prose my-6 space-y-2">
                  {(block.content as {text: string, checked: boolean}[]).map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                      <Checkbox id={`task-${block.id}-${index}`} checked={item.checked} disabled />
                      <label htmlFor={`task-${block.id}-${index}`} className={`flex-1 text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </label>
                    </div>
                  ))}
                </div>
              );
            case 'toggle-list':
              return (
                <div key={block.id} className="not-prose my-6">
                  <Accordion type="single" collapsible className="w-full bg-transparent">
                      <AccordionItem value="item-1" className="border rounded-md shadow-sm overflow-hidden">
                          <AccordionTrigger className="px-4 font-semibold hover:no-underline bg-muted/50 hover:bg-muted/80">
                             {block.content.title}
                          </AccordionTrigger>
                          <AccordionContent className="p-4 pt-4 bg-background border-t">
                               <div className="prose dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {block.content.text}
                                </ReactMarkdown>
                               </div>
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
                </div>
              );
            case 'problem':
                const problemDetails = allProblems.find(p => p.id === block.content.problemId);
                return (
                    <Card key={block.id} className="not-prose my-6">
                        <CardHeader>
                            <div className='flex justify-between items-start'>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileQuestion className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Challenge</h3>
                                    </div>
                                    <CardTitle>{block.content.title}</CardTitle>
                                    <CardDescription>{block.content.categoryName}</CardDescription>
                                </div>
                                {problemDetails && (
                                    <Badge variant="outline" className={cn("justify-center", getDifficultyBadgeClass(problemDetails.difficulty))}>
                                      {problemDetails.difficulty}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardFooter>
                            <Button asChild>
                                <Link href={`/problems/apex/${encodeURIComponent(block.content.categoryName)}/${block.content.problemId}`}>
                                    Solve Problem
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            case 'image':
                return (
                    <div key={block.id} className="not-prose relative w-full aspect-video my-6 rounded-lg overflow-hidden">
                        <Image
                            src={block.content}
                            alt="Lesson image"
                            fill
                            className="object-cover"
                        />
                    </div>
                );
            case 'video':
                // Simple YouTube/Vimeo embed logic
                const isYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');
                const isVimeo = block.content.includes('vimeo.com');
                let videoSrc = block.content;

                if (isYouTube) {
                    const videoId = block.content.split('v=')[1]?.split('&')[0] || block.content.split('/').pop();
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                } else if (isVimeo) {
                    const videoId = block.content.split('/').pop();
                    videoSrc = `https://player.vimeo.com/video/${videoId}`;
                }

                return (
                    <div key={block.id} className="not-prose aspect-video my-6">
                        <iframe
                            className="w-full h-full rounded-lg"
                            src={videoSrc}
                            title="Video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                );
            case 'audio':
                return (
                    <div key={block.id} className="not-prose my-6">
                        <audio controls src={block.content}>
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                );
          default:
            return null;
        }
      })}
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
    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    
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
                // Fetch course data
                const courseDocRef = doc(db, 'courses', courseId);
                const courseSnap = await getDoc(courseDocRef);

                if (courseSnap.exists()) {
                    const courseData = { id: courseSnap.id, ...courseSnap.data() } as Course;
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

                        // If lesson has problem blocks, fetch all problems
                        if (lesson.contentBlocks.some(b => b.type === 'problem')) {
                            const processProblems = (data: ApexProblemsData) => {
                                const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                                );
                                setAllProblems(problems);
                            };

                            const cachedProblems = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
                            if (cachedProblems) {
                                processProblems(cachedProblems);
                            } else {
                                const apexDocRef = doc(db, "problems", "Apex");
                                const apexSnap = await getDoc(apexDocRef);
                                if (apexSnap.exists()) {
                                    const data = apexSnap.data().Category as ApexProblemsData;
                                    setCache(APEX_PROBLEMS_CACHE_KEY, data);
                                    processProblems(data);
                                }
                            }
                        }
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
                                <LessonContent contentBlocks={currentLesson.contentBlocks} allProblems={allProblems}/>
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
