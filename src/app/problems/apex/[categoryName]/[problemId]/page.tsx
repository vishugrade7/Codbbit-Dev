















"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, ApexProblemsData, Achievement } from "@/types";
import type { ImperativePanelHandle } from "react-resizable-panels";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import ReactConfetti from 'react-confetti';
import Image from "next/image";


import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, CheckCircle2, Code, Play, RefreshCw, Send, Settings, Star, Menu, Search, Maximize, Minimize, XCircle, Award, Flame, FileText, Circle, Filter, Text, ZoomIn, ZoomOut, ArrowRight, TestTube2, Book, Lightbulb, X } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";


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

const MermaidDiagram = ({ chart }: { chart: string }) => {
    const { resolvedTheme } = useTheme();
    const id = useMemo(() => `mermaid-chart-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
      const renderMermaid = async () => {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
            startOnLoad: false,
            theme: resolvedTheme === 'dark' ? 'dark' : 'neutral'
        });
        const element = document.getElementById(id);
        if (element) {
            mermaid.run({
                nodes: [element],
            });
        }
      };

      if (typeof window !== 'undefined') {
        renderMermaid();
      }
    }, [chart, resolvedTheme, id]);

    return <div id={id} className="mermaid w-full flex justify-center">{chart}</div>;
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
        <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
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
                
                {problem.mermaidDiagram && (
                    <div className="my-6">
                        <MermaidDiagram chart={problem.mermaidDiagram} />
                    </div>
                )}

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
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Lightbulb className="mr-2 h-4 w-4" /> Show Hints
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4">
                                <Card className="bg-card/50">
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold mb-2">Hints</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                            {problem.hints.map((hint, index) => (
                                                <li key={index}>{hint.value}</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

const NextProblemCard = ({
  nextProblem,
  categoryName,
  categoryProgress,
  onNext,
  onClose,
}: {
  nextProblem: Problem | null;
  categoryName: string;
  categoryProgress: number;
  onNext: () => void;
  onClose: () => void;
}) => {
  const getDifficultyClass = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
             <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{nextProblem ? "Next Up" : "Category Complete!"}</p>
                <h4 className="font-semibold">{nextProblem ? nextProblem.title : categoryName}</h4>
             </div>
             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-2 -mt-2" onClick={onClose}><X className="h-5 w-5"/></Button>
          </div>
           
           {nextProblem && (
               <Badge variant="outline" className={cn("mt-1", getDifficultyClass(nextProblem.difficulty))}>
                   {nextProblem.difficulty}
               </Badge>
           )}

          <div className="mt-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                  <span>Category Progress</span>
                  <span>{Math.round(categoryProgress)}%</span>
              </div>
              <Progress value={categoryProgress} className="h-1.5" />
          </div>

          <Button onClick={onNext} className="w-full mt-4">
             {nextProblem ? 'Next Problem' : 'Back to Category'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
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

    const [isClient, setIsClient] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [awardedPoints, setAwardedPoints] = useState(0);
    const [unlockedBadge, setUnlockedBadge] = useState<Omit<Achievement, 'date'> | null>(null);
    const [nextProblem, setNextProblem] = useState<Problem | null>(null);


    const [fontSize, setFontSize] = useState(14);
    const MIN_FONT_SIZE = 10;
    const MAX_FONT_SIZE = 24;

    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const applyCoverageHighlighting = (coverage: any) => {
        if (!editorRef.current || !monacoRef.current || !coverage) return;
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        const decorations: any[] = [];
        coverage.uncoveredLines.forEach((line: number) => {
            decorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: { isWholeLine: true, className: 'coverage-uncovered-line' }
            });
        });
        coverage.coveredLines.forEach((line: number) => {
             decorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: { isWholeLine: true, className: 'coverage-covered-line' }
            });
        });

        editor.deltaDecorations([], decorations);
    };

     const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
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
        
        if (editorRef.current) {
            // Clear previous decorations
            editorRef.current.deltaDecorations(editorRef.current.getModel().getAllDecorations().map((d: any) => d.id), []);
        }

        setIsSubmitting(true);
        setResults("");

        const response = await submitApexSolution(user.uid, problem, code);
        
        setResults(response.details || response.message);
        
        if (response.codeCoverage) {
            applyCoverageHighlighting(response.codeCoverage);
        }

        if (response.success) {
            toast({ title: "Submission Successful!", description: response.message });
            
            if (response.awardedBadges && response.awardedBadges.length > 0) {
                setUnlockedBadge(response.awardedBadges[0]);
            }
            
            const pointsMatch = response.message.match(/You've earned (\d+) points/);
            if (pointsMatch) {
              const points = parseInt(pointsMatch[1], 10);
              if (points > 0) {
                setAwardedPoints(points);
              }
            }
            
            // Set next problem for the success card
            const currentIndex = allProblems.findIndex(p => p.id === problemId);
            const next = allProblems[currentIndex + 1] || null;
            setNextProblem(next);
            setShowSuccess(true);


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
         if (editorRef.current) {
            // Clear decorations on reset
            editorRef.current.deltaDecorations(editorRef.current.getModel().getAllDecorations().map((d: any) => d.id), []);
        }
      }
    }

    const handleNavigateToNext = () => {
        if (nextProblem) {
            router.push(`/problems/apex/${encodeURIComponent(categoryName || '')}/${nextProblem.id}`);
        } else {
            router.push(`/apex-problems/${encodeURIComponent(categoryName || '')}`);
        }
        setShowSuccess(false);
    }
    
    const categoryProgress = useMemo(() => {
        if (!userData || allProblems.length === 0) return 0;
        const solvedInCategory = allProblems.filter(p => userData.solvedProblems?.[p.id]).length;
        return (solvedInCategory / allProblems.length) * 100;
    }, [userData, allProblems]);

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

        {isClient && !unlockedBadge && (
            <ReactConfetti recycle={false} numberOfPieces={awardedPoints > 0 ? 500 : 0} />
        )}
        
        {showSuccess && isClient && (
            <NextProblemCard 
                nextProblem={nextProblem}
                categoryName={categoryName || ''}
                categoryProgress={categoryProgress}
                onNext={handleNavigateToNext}
                onClose={() => setShowSuccess(false)}
            />
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
                        <ScrollArea className="py-2 flex-1">
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
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
                 <Sheet>
                    <SheetTrigger asChild>
                       <Button variant="outline" size="sm" className="lg:hidden"><Book className="mr-2 h-4 w-4"/> View Problem</Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Problem Description</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto">
                            <ProblemDescriptionPanel problem={problem} isSolved={isSolved} />
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

        <div className="flex-1 flex overflow-hidden pt-12 md:pt-0">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={45} minSize={30} className="hidden lg:flex">
                    <ProblemDescriptionPanel problem={problem} isSolved={isSolved} />
                </ResizablePanel>
                 <ResizableHandle withHandle className="hidden lg:flex"/>
                <ResizablePanel defaultSize={55} minSize={40}>
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
                                                onMount={handleEditorDidMount}
                                                options={{ readOnly: true, fontSize, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
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
                                            </div>
                                            <MonacoEditor
                                                height="100%"
                                                language="java"
                                                value={code}
                                                onChange={(v) => setCode(v || '')}
                                                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                                options={{ fontSize, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
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
                                        onMount={handleEditorDidMount}
                                        options={{ fontSize, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, fontFamily: 'var(--font-source-code-pro)', }}
                                    />
                                </div>
                            )}
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={35} minSize={15}>
                            <div className="flex flex-col h-full">
                                <div className="p-2 border-t border-b flex items-center justify-between">
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
                                        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                            Run
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-4">
                                        <SubmissionResultsView log={results} isSubmitting={isSubmitting} />
                                    </div>
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </div>
    )
}
