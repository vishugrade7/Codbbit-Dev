
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Problem, SOQLProblemsData } from "@/types";
import type { ImperativePanelHandle } from "react-resizable-panels";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-sql';
import Confetti from 'react-confetti';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, ArrowLeft, CheckCircle2, Database, Play, RefreshCw, Settings, Star, Menu, Search, Maximize, Minimize, XCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { executeQuery, submitSOQLSolution } from "@/app/salesforce/actions";
import { toggleStarProblem } from "@/app/profile/actions";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
type RunStatus = 'idle' | 'running' | 'success' | 'error';

export default function SOQLWorkspacePage() {
    const router = useRouter();
    const params = useParams();
    const categoryName = decodeURIComponent(params.categoryName as string);
    const problemId = params.problemId as string;
    
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [problem, setProblem] = useState<Problem | null>(null);
    const [allProblems, setAllProblems] = useState<Problem[]>([]);
    const [loading, setLoading] = useState(true);
    const [runStatus, setRunStatus] = useState<RunStatus>('idle');
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
    
    const [code, setCode] = useState("");
    const [results, setResults] = useState<any>(null);
    const [isStarred, setIsStarred] = useState(false);
    const [isStarring, setIsStarring] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<string>("All");

    const [isFullScreen, setIsFullScreen] = useState(false);
    const leftPanelRef = useRef<ImperativePanelHandle>(null);

    const toggleFullScreen = () => {
        const panel = leftPanelRef.current;
        if (panel) {
            panel.isCollapsed() ? panel.expand() : panel.collapse();
        }
    };

    useEffect(() => {
        if (!categoryName || !problemId) return;

        setLoading(true);
        const soqlDocRef = doc(db, "problems", "SOQL");

        const unsubscribe = onSnapshot(soqlDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as { Category: SOQLProblemsData };
                const categoryData = data.Category?.[categoryName];
                
                if (categoryData && categoryData.Questions) {
                    const allQuestions = categoryData.Questions;
                    setAllProblems(allQuestions);

                    const currentProblem = allQuestions.find(p => p.id === problemId);
                    if (currentProblem) {
                        setProblem(currentProblem);
                        setCode(currentProblem.sampleCode);
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
    }, [categoryName, problemId]);
    
    useEffect(() => {
        setIsStarred(userData?.starredProblems?.includes(problemId) ?? false);
    }, [userData, problemId]);

    const isSolved = useMemo(() => {
        return userData?.solvedProblems?.includes(problemId) ?? false;
    }, [userData, problemId]);

    const filteredProblems = useMemo(() => {
        return allProblems
            .filter(p => difficultyFilter === "All" || p.difficulty === difficultyFilter)
            .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allProblems, searchTerm, difficultyFilter]);

    const handleRun = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: "Please log in to run queries." });
            return;
        }
        setRunStatus('running');
        setResults(null);

        const response = await executeQuery(user.uid, code);
        
        if (response.success) {
            setResults(response.result);
            setRunStatus('success');
        } else {
            setResults({ error: response.error || 'An unknown error occurred during execution.' });
            setRunStatus('error');
        }
    };

    const handleSubmit = async () => {
        if (!user || !problem) {
            toast({ variant: "destructive", title: "Cannot Submit", description: "You must be logged in and viewing a problem to submit a solution." });
            return;
        }
        setSubmissionStatus('submitting');
        
        const response = await submitSOQLSolution(user.uid, problem, code);
        
        if (response.success) {
            setSubmissionStatus('success');
            if (response.pointsAwarded && response.pointsAwarded > 0) {
                setShowConfetti(true);
                toast({ title: "Congratulations!", description: response.message });
            } else {
                toast({ title: "Already Solved!", description: response.message });
            }
        } else {
            setSubmissionStatus('error');
            toast({ variant: "destructive", title: "Submission Failed", description: response.message });
        }
    };

    const handleToggleStar = async () => {
        if (!user || isStarring) return;

        setIsStarring(true);
        const result = await toggleStarProblem(user.uid, problemId, isStarred);

        if (result.success) {
            setIsStarred(!isStarred);
            toast({ title: !isStarred ? "Problem Starred" : "Problem Unstarred" });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsStarring(false);
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!problem) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Problem Not Found</h1>
                    <p className="text-muted-foreground">The requested problem could not be found.</p>
                    <Button asChild className="mt-4"><Link href={`/problems/soql/${categoryName}`}>Go Back</Link></Button>
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
    
    const renderRunStatus = () => {
        switch (runStatus) {
            case 'running':
                return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Executing...</span></div>;
            case 'success':
                 return <div className="flex items-center gap-2 text-green-400"><CheckCircle2 className="h-4 w-4" /><span>Success</span></div>;
            case 'error':
                 return <div className="flex items-center gap-2 text-destructive"><XCircle className="h-4 w-4" /><span>Error</span></div>;
            default:
                return <span>Results</span>;
        }
    };

    return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
        {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4 shrink-0">
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
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search problems..." className="w-full pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground">DIFFICULTY</span>
                                <div className="flex gap-2 mt-2">
                                    {["All", "Easy", "Medium", "Hard"].map(diff => (
                                        <Button key={diff} variant={difficultyFilter === diff ? "default" : "outline"} size="sm" onClick={() => setDifficultyFilter(diff)} className="flex-1">{diff}</Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="py-2 overflow-y-auto flex-1">
                            {filteredProblems.length > 0 ? filteredProblems.map(p => (
                                <Link key={p.id} href={`/problems/soql/${encodeURIComponent(categoryName)}/${p.id}`} className={cn("flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-accent", p.id === problemId && "bg-accent")}>
                                    <span className="truncate pr-4">{p.title}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyClass(p.difficulty))}>{p.difficulty}</Badge>
                                        {(userData?.solvedProblems?.includes(p.id)) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    </div>
                                </Link>
                            )) : (
                                <p className="text-muted-foreground text-center text-sm py-4">No problems found.</p>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullScreen}>
                                {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                                <span className="sr-only">{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <Button variant="outline" size="sm" onClick={handleToggleStar} disabled={isStarring}>
                    {isStarring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className={cn("mr-2 h-4 w-4", isStarred && "fill-yellow-400 text-yellow-400")} />}
                    {isStarred ? 'Starred' : 'Star'}
                </Button>
                 <Button variant="outline" size="sm" onClick={() => router.push('/settings')}><Settings className="mr-2 h-4 w-4" />Settings</Button>
            </div>
        </header>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel ref={leftPanelRef} defaultSize={33} minSize={20} collapsible collapsedSize={0} onCollapse={() => setIsFullScreen(true)} onExpand={() => setIsFullScreen(false)} className={cn(isFullScreen && "transition-all duration-300 ease-in-out")}>
                <div className="p-4 h-full overflow-y-auto">
                    <Tabs defaultValue="description">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="schema">Schema</TabsTrigger>
                        </TabsList>
                        <TabsContent value="description" className="mt-4 space-y-6">
                            <h1 className="text-2xl font-bold font-headline">{problem.title}</h1>
                            <div className="flex items-center gap-4">
                               <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
                               <Badge variant="secondary">{categoryName}</Badge>
                               {isSolved && <div className="flex items-center gap-1.5 text-sm text-green-400"><CheckCircle2 className="h-4 w-4" /><span>Solved</span></div>}
                            </div>
                            <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br />') }} />
                            
                            {problem.examples.map((example, index) => (
                                <div key={index}>
                                    <h3 className="font-semibold mb-2">Example {index + 1}</h3>
                                    <Card className="bg-card/50"><CardContent className="p-4 font-code text-sm">
                                        {example.input && <p><strong>Input:</strong> {example.input}</p>}
                                        <p><strong>Output:</strong> {example.output}</p>
                                        {example.explanation && <p className="mt-2 text-muted-foreground"><strong>Explanation:</strong> {example.explanation}</p>}
                                    </CardContent></Card>
                                </div>
                            ))}
                        </TabsContent>
                         <TabsContent value="schema" className="mt-4"><p className="text-muted-foreground text-center py-8">Schema browser coming soon.</p></TabsContent>
                    </Tabs>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={67} minSize={30}>
                 <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={65} minSize={25}>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-2 border-b">
                                <div className="flex items-center gap-2 font-semibold"><Database className="h-5 w-5" /><span>SOQL Query</span></div>
                                <div className="flex items-center gap-2">
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCode(problem.sampleCode)}><RefreshCw /></Button></TooltipTrigger>
                                            <TooltipContent><p>Reset Query</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <Button variant="outline" size="sm" onClick={handleRun} disabled={runStatus === 'running'}>
                                        {runStatus === 'running' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                        Run Query
                                    </Button>
                                    <Button size="sm" onClick={handleSubmit} disabled={submissionStatus === 'submitting' || !problem.testcases}>
                                        {submissionStatus === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Submit
                                    </Button>
                                </div>
                            </div>
                            <div className="editor-container flex-1 w-full h-full overflow-auto">
                                <Editor value={code} onValueChange={setCode} highlight={code => highlight(code, languages.sql, 'sql')} padding={16} className="editor" />
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={35} minSize={15}>
                         <div className="flex flex-col h-full">
                            <Tabs defaultValue="results" className="h-full flex flex-col">
                                <TabsList className="shrink-0 rounded-none border-b bg-transparent p-0">
                                    <TabsTrigger value="results" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
                                        {renderRunStatus()}
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="results" className="flex-1 p-4 overflow-auto">
                                    {runStatus === 'running' && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Executing query...</span></div>}
                                    {results?.error && <pre className="text-sm text-destructive whitespace-pre-wrap font-code">{results.error}</pre>}
                                    {results?.records && (
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-2">Returned {results.records.length} of {results.totalSize} total records.</p>
                                            {results.records.length > 0 ? (
                                            <div className="w-full overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {Object.keys(results.records[0]).filter(key => key !== 'attributes').map(key => <TableHead key={key}>{key}</TableHead>)}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.records.map((record: any, index: number) => (
                                                            <TableRow key={index}>
                                                                {Object.keys(record).filter(key => key !== 'attributes').map(key => (
                                                                    <TableCell key={key} className="font-code text-xs whitespace-pre">
                                                                        {record[key] !== null && typeof record[key] === 'object' ? JSON.stringify(record[key], null, 2) : String(record[key])}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            ) : <p className="text-sm text-muted-foreground">Query executed successfully and returned 0 records.</p>}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                         </div>
                    </ResizablePanel>
                 </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    </div>
    )
}
