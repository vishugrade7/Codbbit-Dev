





"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, Achievement } from "@/types";
import type { ImperativePanelHandle } from "react-resizable-panels";
import MonacoEditor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import ReactConfetti from 'react-confetti';
import Image from "next/image";


import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, CheckCircle2, Code, Play, RefreshCw, Send, Settings, Star, Menu, Search, Maximize, Minimize, XCircle, Award, Flame, FileText, Circle, Filter, Text, ZoomIn, ZoomOut, ArrowRight, TestTube2, Book } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { submitApexSolution } from "@/app/salesforce/actions";
import { toggleStarProblem } from "@/app/profile/actions";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProModal } from "@/components/pro-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BadgeUnlockedModal from "@/components/badge-unlocked-modal";


const DefaultLine = ({ line, index }: { line: string, index: number }) => (
  <div style={{ animationDelay: `${index * 75}ms` }} className="opacity-0 animate-fade-in-up flex items-start gap-3">
    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
    <p className="font-code text-sm flex-1 text-muted-foreground">{line.replace(/^>/, '').trim()}</p>
  </div>
);

const CongratsLine = ({ line, index }: { line: string, index: number }) => (
  <div style={{ animationDelay: `${index * 75}ms` }} className="opacity-0 animate-fade-in-up flex items-start gap-3">
    <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
    <p className="font-code text-sm flex-1 text-foreground font-semibold">{line.replace(/^>/, '').trim()}</p>
  </div>
);

const BadgeLine = ({ line, index }: { line: string, index: number }) => (
  <div style={{ animationDelay: `${index * 75}ms` }} className="opacity-0 animate-fade-in-up flex items-start gap-3">
    <Award className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
    <p className="font-code text-sm flex-1 text-foreground font-semibold">{line.replace(/^>/, '').trim()}</p>
  </div>
);

const HeadingLine = ({ line, index }: { line: string, index: number }) => (
   <div style={{ animationDelay: `${index * 75}ms` }} className="opacity-0 animate-fade-in-up">
    <p className="font-code text-sm text-foreground font-bold pt-4 pb-1">{line}</p>
  </div>
);

const ErrorBlock = ({ lines, index }: { lines: string[], index: number }) => (
  <div style={{ animationDelay: `${index * 75}ms` }} className="opacity-0 animate-fade-in-up bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
    {lines.map((line, idx) => (
      <div key={idx} className="flex items-start gap-3">
        {idx === 0 && <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />}
        <p className={`font-code text-sm text-destructive flex-1 ${idx > 0 ? 'pl-8' : 'font-semibold'}`}>{line}</p>
      </div>
    ))}
  </div>
);


const SubmissionResultsView = ({ log, isSubmitting }: { log: string, isSubmitting: boolean }) => {
  const logElements = useMemo(() => {
    if (!log) return [];
    const lines = log.split('\n').filter(l => l.trim() !== '');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('--- ERROR ---')) {
        const errorContent: string[] = [];
        errorContent.push(line.replace('--- ERROR ---', 'ERROR').trim());
        while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('---')) {
          i++;
          errorContent.push(lines[i].replace(/^>/, '').trim());
        }
        elements.push(<ErrorBlock key={`error-block-${i}`} lines={errorContent} index={elements.length} />);
      } else if (line.includes('Congratulations')) {
        elements.push(<CongratsLine key={i} line={line} index={elements.length} />);
      } else if (line.includes('New Badges Earned')) {
        elements.push(<BadgeLine key={i} line={line} index={elements.length} />);
      } else if (line.trim().startsWith('---')) {
        elements.push(<HeadingLine key={i} line={line} index={elements.length} />);
      } else {
        elements.push(<DefaultLine key={i} line={line} index={elements.length} />);
      }
    }
    return elements;
  }, [log]);
  

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="font-semibold">Running Submission...</p>
          <p className="text-sm text-muted-foreground">Please wait while we connect to Salesforce and run your tests.</p>
      </div>
    );
  }

  if (!log.trim() && !isSubmitting) {
      return (
         <div className="flex flex-col items-center justify-center h-full text-center">
             <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Play className="h-8 w-8 text-primary" />
             </div>
             <p className="font-semibold">Ready to Run</p>
             <p className="text-sm text-muted-foreground">Submit your solution to run tests against the problem's criteria.</p>
         </div>
      )
  }

  return (
    <div className="space-y-2">
      {logElements}
    </div>
  );
};

const ProblemDescriptionPanel = ({ problem, isSolved }: { problem: Problem, isSolved: boolean }) => {
    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
        case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    return (
        <div className="p-4 h-full overflow-y-auto space-y-6">
            <h1 className="text-2xl font-bold font-headline">{problem.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
               <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
               <Badge variant="secondary">{problem.categoryName}</Badge>
               {problem.company && (
                    <div className="hidden sm:flex items-center gap-1.5">
                        {problem.companyLogoUrl && <Image src={problem.companyLogoUrl} alt={problem.company} width={16} height={16} className="rounded-sm" />}
                        <span className="text-sm font-medium">{problem.company}</span>
                    </div>
                )}
               {isSolved && (
                <div className="flex items-center gap-1.5 text-sm text-green-400">
                   <CheckCircle2 className="h-4 w-4" />
                   <span>Solved</span>
                </div>
               )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br />') }} />
            
            {problem.examples.map((example, index) => (
                <div key={index}>
                    <h3 className="font-semibold mb-2">Example {index + 1}</h3>
                    <Card className="bg-card/50">
                        <CardContent className="p-4 font-code text-sm">
                            {example.input && <p><strong>Input:</strong> {example.input}</p>}
                            <p><strong>Output:</strong> {example.output}</p>
                            {example.explanation && <p className="mt-2 text-muted-foreground"><strong>Explanation:</strong> {example.explanation}</p>}
                        </CardContent>
                    </Card>
                </div>
            ))}

             {problem.hints && problem.hints.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Constraints</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {problem.hints.map((hint, index) => (
                            <li key={index}>{hint}</li>
                        ))}
                    </ul>
                </div>
             )}
        </div>
    );
}

export default function ProblemWorkspacePage() {
    const router = useRouter();
    const params = useParams();
    const { resolvedTheme } = useTheme();
    const proModal = useProModal();

    const { categoryName, problemId } = useMemo(() => ({
        categoryName: params?.categoryName ? decodeURIComponent(params.categoryName as string) : null,
        problemId: params?.problemId ? (params.problemId as string) : null
    }), [params]);
    
    const { user, userData, isPro } = useAuth();
    const { toast } = useToast();
    const [problem, setProblem] = useState<Problem | null>(null);
    const [allProblems, setAllProblems] = useState<Problem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [code, setCode] = useState("");
    const [results, setResults] = useState("");
    const [isStarred, setIsStarred] = useState(false);
    const [isStarring, setIsStarring] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [isFullScreen, setIsFullScreen] = useState(false);
    const leftPanelRef = useRef<ImperativePanelHandle>(null);

    const [isClient, setIsClient] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [awardedPoints, setAwardedPoints] = useState(0);
    const [unlockedBadge, setUnlockedBadge] = useState<Omit<Achievement, 'date'> | null>(null);


    const [fontSize, setFontSize] = useState(14);
    const MIN_FONT_SIZE = 10;
    const MAX_FONT_SIZE = 24;

    useEffect(() => {
        setIsClient(true);
    }, []);

    const toggleFullScreen = () => {
        const panel = leftPanelRef.current;
        if (panel) {
            if (isFullScreen) {
                panel.expand();
            } else {
                panel.collapse();
            }
            setIsFullScreen(!isFullScreen);
        }
    };


    useEffect(() => {
        if (!categoryName || !problemId) return;

        setLoading(true);
        const apexDocRef = doc(db, "problems", "Apex");

        const unsubscribe = onSnapshot(apexDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as { Category: ApexProblemsData };
                const categoryData = data.Category?.[categoryName];
                
                if (categoryData && categoryData.Questions) {
                    const allQuestions = categoryData.Questions;
                    setAllProblems(allQuestions);

                    const currentProblem = allQuestions.find(p => p.id === problemId);
                    if (currentProblem) {
                        if (currentProblem.isPremium && !isPro) {
                            proModal.setIsOpen(true);
                            return;
                        }
                        setProblem({...currentProblem, categoryName});
                        const initialCode = currentProblem.metadataType === 'Test Class' ? currentProblem.testcases : currentProblem.sampleCode;
                        setCode(initialCode);
                    } else {
                        setProblem(null);
                    }
                } else {
                    setProblem(null);
                    setAllProblems([]);
                }
            } else {
                setProblem(null);
                setAllProblems([]);
            }
            setLoading(false);
        }, (error) => {
            console.error(`Error fetching problems for ${categoryName}:`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [categoryName, problemId, isPro, router, proModal]);
    
    useEffect(() => {
        if (userData?.starredProblems && problemId) {
            setIsStarred(userData.starredProblems.includes(problemId));
        } else {
            setIsStarred(false);
        }
    }, [userData, problemId]);

    const isSolved = useMemo(() => {
        if (!problemId) return false;
        return !!userData?.solvedProblems?.[problemId];
    }, [userData, problemId]);

    const filteredProblems = useMemo(() => {
        return allProblems
            .filter((p) => {
                if (difficultyFilter === "All") return true;
                return p.difficulty === difficultyFilter;
            })
             .filter((p) => {
                if (statusFilter === "All") return true;
                const isSolved = !!userData?.solvedProblems?.[p.id];
                if (statusFilter === "Solved") return isSolved;
                if (statusFilter === "Unsolved") return !isSolved;
                return true;
             })
            .filter((p) => {
                return p.title.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [allProblems, searchTerm, difficultyFilter, statusFilter, userData]);

    const handleSubmit = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to submit a solution." });
            return;
        }
        if (!userData?.sfdcAuth?.connected) {
            toast({
              variant: "destructive",
              title: "Salesforce Not Connected",
              description: "Please connect your Salesforce account in settings.",
            });
            router.push('/settings');
            return;
        }
        if (!problem) {
            toast({ variant: "destructive", title: "No Problem Loaded", description: "Cannot submit without a problem." });
            return;
        }

        setIsSubmitting(true);
        setResults("");

        const response = await submitApexSolution(user.uid, problem, code);
        
        setResults(response.details || response.message);

        if (response.success) {
            toast({ title: "Submission Successful!", description: response.message });
            
            if (response.awardedBadges && response.awardedBadges.length > 0) {
                setUnlockedBadge(response.awardedBadges[0]);
            }

            const pointsMatch = response.message.match(/You've earned (\d+) points/);
            const points = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;
            if (points > 0) {
                setAwardedPoints(points);
                setShowSuccess(true);
            }

            // Auto-navigate after a delay
            setTimeout(() => {
                setShowSuccess(false);
                const currentIndex = allProblems.findIndex(p => p.id === problemId);
                const nextProblem = allProblems[currentIndex + 1];

                if (nextProblem) {
                    router.push(`/problems/apex/${encodeURIComponent(categoryName || '')}/${nextProblem.id}`);
                } else {
                    toast({ title: "Category Complete!", description: "You've finished all problems in this category." });
                    router.push(`/apex-problems/${encodeURIComponent(categoryName || '')}`);
                }
            }, 3000); // 3-second delay for celebration

        } else {
            toast({ variant: "destructive", title: "Submission Failed", description: response.message, duration: 9000 });
        }
        
        setIsSubmitting(false);
    };

    const handleToggleStar = async () => {
        if (!user || !problem) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "You must be logged in to star a problem.",
            });
            return;
        }
        if (isStarring) return;

        setIsStarring(true);
        const result = await toggleStarProblem(user.uid, problem.id, isStarred);

        if (result.success) {
            const newStarredStatus = !isStarred;
            setIsStarred(newStarredStatus);
            toast({
                title: newStarredStatus ? "Problem Starred" : "Problem Unstarred",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error,
            });
        }
        setIsStarring(false);
    };
    
    const resetCode = () => {
      if (problem) {
        const initialCode = problem.metadataType === 'Test Class' ? problem.testcases : problem.sampleCode;
        setCode(initialCode);
      }
    }


    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!problem) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Problem Not Found</h1>
                    <p className="text-muted-foreground">The requested problem could not be found.</p>
                    <Button asChild className="mt-4"><Link href={`/apex-problems`}>Go Back</Link></Button>
                </div>
            </div>
        );
    }
    
    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
        case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    
    const statusOptions = ['All', 'Solved', 'Unsolved'];
    const difficultyOptions = ['All', 'Easy', 'Medium', 'Hard'];

    return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
        {isClient && <BadgeUnlockedModal badge={unlockedBadge} user={userData} onOpenChange={() => setUnlockedBadge(null)} />}

        {showSuccess && isClient && !unlockedBadge && <ReactConfetti recycle={false} numberOfPieces={500} />}
        {showSuccess && !unlockedBadge && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="text-center">
                    <div className="animate-points-animation">
                        <div className="text-6xl font-bold text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            +{awardedPoints}
                        </div>
                        <div className="text-3xl font-semibold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            Points!
                        </div>
                    </div>
                     <div className="mt-8 text-white text-lg font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        Moving to next problem...
                    </div>
                </div>
            </div>
        )}
        <header className="fixed md:relative top-0 left-0 right-0 flex h-12 items-center justify-between gap-2 border-b bg-card px-4 shrink-0 z-40">
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 max-w-sm flex flex-col">
                        <SheetHeader className="p-4 border-b shrink-0">
                            <SheetTitle>{categoryName}</SheetTitle>
                        </SheetHeader>
                        <div className="p-4 border-b space-y-4 shrink-0">
                           <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search problems..."
                                        className="w-full pl-9 h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                            <Filter className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-0" align="end">
                                        <div className="py-2">
                                            <p className="text-sm font-medium px-4 mb-2">Status</p>
                                            {statusOptions.map(option => (
                                                <button
                                                    key={option}
                                                    className="flex items-center w-full px-4 py-1.5 text-sm text-left hover:bg-accent"
                                                    onClick={() => setStatusFilter(option)}
                                                >
                                                    <span className={cn("h-2 w-2 rounded-full mr-3", statusFilter === option ? "bg-primary" : "bg-transparent")}></span>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                        <Separator />
                                        <div className="py-2">
                                            <p className="text-sm font-medium px-4 mb-2">Difficulty</p>
                                            {difficultyOptions.map(option => (
                                                <button
                                                    key={option}
                                                    className="flex items-center w-full px-4 py-1.5 text-sm text-left hover:bg-accent"
                                                    onClick={() => setDifficultyFilter(option)}
                                                >
                                                    <span className={cn("h-2 w-2 rounded-full mr-3", difficultyFilter === option ? "bg-primary" : "bg-transparent")}></span>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                           </div>
                        </div>
                        <div className="py-2 overflow-y-auto flex-1">
                            {filteredProblems.length > 0 ? filteredProblems.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/problems/apex/${encodeURIComponent(categoryName || '')}/${p.id}`}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent",
                                        p.id === problemId && "bg-accent"
                                    )}
                                >
                                    {userData?.solvedProblems?.[p.id] ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1">{p.title}</span>
                                    <Badge variant="outline" className={cn("w-20 justify-center shrink-0", getDifficultyClass(p.difficulty))}>
                                        {p.difficulty}
                                    </Badge>
                                </Link>
                            )) : (
                                <p className="text-muted-foreground text-center text-sm py-4">No problems found.</p>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-semibold">
                    <Flame className="h-5 w-5 text-primary" />
                    <span>{userData?.points?.toLocaleString() ?? 0}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleStar} disabled={isStarring}>
                    {isStarring ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Star className={cn("mr-2 h-4 w-4", isStarred && "fill-yellow-400 text-yellow-400")} />
                    )}
                    {isStarred ? 'Starred' : 'Star'}
                </Button>
                 <Button variant="outline" size="sm" onClick={() => router.push('/settings')}><Settings className="mr-2 h-4 w-4" />Settings</Button>
            </div>
        </header>

        {/* Desktop Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 hidden lg:flex">
            <ResizablePanel 
                ref={leftPanelRef}
                defaultSize={33}
                minSize={20}
                collapsible
                collapsedSize={0}
                onCollapse={() => setIsFullScreen(true)}
                onExpand={() => setIsFullScreen(false)}
                className={cn(isFullScreen && "transition-all duration-300 ease-in-out")}
            >
                <ProblemDescriptionPanel problem={problem} isSolved={isSolved} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={67} minSize={30}>
                 <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={65} minSize={25}>
                        {problem.metadataType === 'Test Class' ? (
                             <ResizablePanelGroup direction="horizontal">
                                <ResizablePanel defaultSize={50} minSize={30}>
                                    <div className="flex flex-col h-full">
                                         <div className="flex items-center justify-between p-1 px-2 border-b border-r">
                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                <Book className="h-4 w-4" />
                                                <span>Apex Code (Read-only)</span>
                                            </div>
                                         </div>
                                        <MonacoEditor
                                            height="100%"
                                            language="java"
                                            value={problem.sampleCode}
                                            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                            options={{ readOnly: true, fontSize, minimap: { enabled: true }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
                                        />
                                    </div>
                                </ResizablePanel>
                                <ResizableHandle withHandle/>
                                 <ResizablePanel defaultSize={50} minSize={30}>
                                      <div className="flex flex-col h-full">
                                         <div className="flex items-center justify-between p-1 px-2 border-b">
                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                <TestTube2 className="h-4 w-4" />
                                                <span>Your Test Code</span>
                                            </div>
                                            {/* Toolbar here */}
                                        </div>
                                        <MonacoEditor
                                            height="100%"
                                            language="java"
                                            value={code}
                                            onChange={(v) => setCode(v || '')}
                                            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                            options={{ fontSize, minimap: { enabled: true }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
                                        />
                                    </div>
                                </ResizablePanel>
                             </ResizablePanelGroup>
                        ) : (
                            <div className="flex flex-col h-full">
                                <MonacoEditor
                                    height="100%"
                                    language="java"
                                    value={code}
                                    onChange={(newValue) => setCode(newValue || "")}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize, minimap: { enabled: true }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
                                />
                            </div>
                        )}
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={35} minSize={15}>
                        <div className="flex flex-col h-full">
                            <div className="p-2 border-b flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Test Results</h3>
                                 <div className="flex items-center gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><Text className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setFontSize(prev => Math.max(MIN_FONT_SIZE, prev - 1))}><ZoomOut className="mr-2 h-4 w-4" />Decrease Font Size</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFontSize(prev => Math.min(MAX_FONT_SIZE, prev + 1))}><ZoomIn className="mr-2 h-4 w-4" />Increase Font Size</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFontSize(14)}><RefreshCw className="mr-2 h-4 w-4" />Reset Font Size</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetCode}><RefreshCw className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Reset Code</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullScreen}>
                                                    {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                                    <span className="sr-only">{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        Run
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <SubmissionResultsView log={results} isSubmitting={isSubmitting} />
                            </div>
                        </div>
                    </ResizablePanel>
                 </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
        
        {/* Mobile Layout */}
        <div className="flex-1 flex flex-col lg:hidden overflow-hidden pt-12">
            <Tabs defaultValue="problem" className="flex-1 flex flex-col h-full">
                <TabsList className="shrink-0 rounded-none border-b bg-transparent justify-start px-2">
                    <TabsTrigger value="problem">Problem</TabsTrigger>
                    <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent value="problem" className="flex-1 overflow-auto mt-0">
                    <ProblemDescriptionPanel problem={problem} isSolved={isSolved} />
                </TabsContent>

                <TabsContent value="code" className="flex-1 flex flex-col overflow-hidden mt-0">
                    <ResizablePanelGroup direction="vertical">
                        <ResizablePanel defaultSize={60} minSize={20}>
                            {problem.metadataType === 'Test Class' ? (
                                <Tabs defaultValue="test" className="flex flex-col h-full">
                                    <TabsList className="shrink-0 rounded-none bg-transparent justify-start px-2 grid grid-cols-2">
                                        <TabsTrigger value="apex">Apex Code</TabsTrigger>
                                        <TabsTrigger value="test">Test Code</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="apex" className="flex-1 overflow-auto mt-0">
                                        <MonacoEditor height="100%" language="java" value={problem.sampleCode} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ readOnly: true, fontSize: 14, minimap: { enabled: true }, scrollBeyondLastLine: false, fontFamily: 'var(--font-source-code-pro)' }} />
                                    </TabsContent>
                                     <TabsContent value="test" className="flex-1 overflow-auto mt-0">
                                        <MonacoEditor height="100%" language="java" value={code} onChange={(v) => setCode(v || '')} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: true }, scrollBeyondLastLine: false, fontFamily: 'var(--font-source-code-pro)' }} />
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                 <MonacoEditor
                                    height="100%"
                                    language="java"
                                    value={code}
                                    onChange={(newValue) => setCode(newValue || "")}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize: 14, minimap: { enabled: true }, scrollBeyondLastLine: false, fontFamily: 'var(--font-source-code-pro)', }}
                                />
                            )}
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={40} minSize={15}>
                            <div className="flex flex-col h-full">
                                <div className="p-2 border-b border-t flex items-center justify-between">
                                    <h3 className="font-semibold text-sm">Test Results</h3>
                                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        Run
                                    </Button>
                                </div>
                                <div className="flex-1 p-4 overflow-auto">
                                    <SubmissionResultsView log={results} isSubmitting={isSubmitting} />
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </TabsContent>
            </Tabs>
        </div>
    </div>
    )
}
