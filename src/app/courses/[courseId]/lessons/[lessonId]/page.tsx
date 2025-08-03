

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Module, Lesson, ContentBlock, Problem, ApexProblemsData, MindmapNode } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, PlayCircle, BookOpen, Lock, BrainCircuit, ArrowRight, Code, AlertTriangle, CheckSquare, FileQuestion, CheckCircle, XCircle, ChevronRight, Milestone, GitFork, FlaskConical, Play, CheckCircle2, Check, PartyPopper, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Progress } from '@/components/ui/progress';
import { markLessonAsComplete } from '@/app/profile/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCache, setCache } from '@/lib/cache';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import mermaid from 'mermaid';
import MonacoEditor from '@monaco-editor/react';
import { executeSalesforceCode } from '@/app/salesforce/actions';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import ReactConfetti from 'react-confetti';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';


const getLessonIcon = (lesson: Lesson) => {
    return <BookOpen className="h-5 w-5" />;
};

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';
type ProblemWithCategory = Problem & { categoryName: string };

const LiveCodeRenderer = ({ blockContent }: { blockContent: { html?: string; css?: string; js?: string } }) => {
    const { theme } = useTheme();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const srcDoc = useMemo(() => {
        const { html = '', css = '', js = '' } = blockContent;
        return `
            <html>
                <head>
                    <style>
                        body { 
                            font-family: sans-serif;
                            padding: 0.5rem;
                            color: ${theme === 'dark' ? '#fff' : '#000'};
                            background-color: transparent;
                        }
                        ${css}
                    </style>
                </head>
                <body>
                    ${html}
                    <script>${js}</script>
                </body>
            </html>
        `;
    }, [blockContent, theme]);

    if (!isClient) {
        return <div className="w-full h-48 bg-muted rounded-md animate-pulse" />;
    }

    return (
        <div className="not-prose my-6 w-full h-64 border rounded-lg overflow-hidden bg-background">
            <iframe
                title="Live Code Preview"
                srcDoc={srcDoc}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-modals"
            />
        </div>
    );
};


const MermaidRenderer = ({ chart }: { chart: string }) => {
    const { theme } = useTheme();
    const mermaidId = useMemo(() => `mermaid-container-${Math.random().toString(36).substr(2, 9)}`, []);
    
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
        if (isClient) {
            mermaid.initialize({
                startOnLoad: false,
                theme: theme === 'dark' ? 'dark' : 'default',
            });
        }
    }, [isClient, theme]);
    
    useEffect(() => {
        if (!isClient || !chart) return;
    
        const renderMermaid = async () => {
             try {
                const element = document.getElementById(mermaidId);
                if (element) {
                    element.innerHTML = ''; // Clear previous render
                    const { svg } = await mermaid.render(mermaidId + '-graph', chart);
                    element.innerHTML = svg;
                }
            } catch (error) {
                console.error('Mermaid render error:', error);
                 const element = document.getElementById(mermaidId);
                 if (element) {
                     element.innerHTML = `<div class="p-4 text-destructive bg-destructive/10 rounded-md text-xs font-mono whitespace-pre-wrap w-full"><p class="font-bold mb-2">Mermaid Render Error:</p>${(error as Error).message}</div>`
                 }
            }
        };
    
        // Use a small timeout to ensure the DOM is ready for mermaid
        const timer = setTimeout(renderMermaid, 50);
        return () => clearTimeout(timer);
    
    }, [chart, mermaidId, isClient]);
    
    return (
        <div id={mermaidId} className="not-prose my-6 w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">
            {!isClient && (
                <div className="flex justify-center items-center min-h-[200px] text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
        </div>
    );
};

const McqChallenge = ({ blockContent }: { blockContent: any }) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const isCorrect = selectedOption === blockContent.correctAnswerIndex;

    const handleCheckAnswer = () => {
        if (selectedOption !== null) {
            setIsAnswered(true);
        }
    };

    return (
        <Card className="not-prose my-6">
            <CardHeader>
                <CardTitle className="text-lg">{blockContent.question}</CardTitle>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={selectedOption !== null ? String(selectedOption) : undefined}
                    onValueChange={(val) => setSelectedOption(Number(val))}
                    disabled={isAnswered}
                    className="space-y-3"
                >
                    {blockContent.options.map((option: { text: string }, index: number) => (
                        <div
                            key={index}
                            className={cn(
                                "flex items-center space-x-3 p-3 rounded-md border transition-colors",
                                isAnswered && index === blockContent.correctAnswerIndex && "bg-green-500/10 border-green-500/30",
                                isAnswered && index !== blockContent.correctAnswerIndex && selectedOption === index && "bg-destructive/10 border-destructive/30"
                            )}
                        >
                            <RadioGroupItem value={String(index)} id={`option-${blockContent.id}-${index}`} />
                            <Label htmlFor={`option-${blockContent.id}-${index}`} className="flex-1 cursor-pointer">{option.text}</Label>
                            {isAnswered && index === blockContent.correctAnswerIndex && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {isAnswered && index !== blockContent.correctAnswerIndex && selectedOption === index && <XCircle className="h-5 w-5 text-destructive" />}
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                <Button onClick={handleCheckAnswer} disabled={selectedOption === null || isAnswered}>
                    Check Answer
                </Button>
                {isAnswered && (
                     <div className={cn("w-full p-4 rounded-md text-sm", isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-destructive/10 text-destructive dark:text-red-300")}>
                        <p className="font-bold">{isCorrect ? "Correct!" : "Incorrect."}</p>
                        {blockContent.explanation && <p className="mt-2">{blockContent.explanation}</p>}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};

const InteractiveCodeChallenge = ({ blockContent }: { blockContent: any }) => {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const { resolvedTheme } = useTheme();

    const [code, setCode] = useState(blockContent.defaultCode || '');
    const [testCode, setTestCode] = useState(blockContent.testClassCode || '');
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSolved, setIsSolved] = useState(false);
    const [executionSteps, setExecutionSteps] = useState<{ text: string; status: 'pending' | 'success' | 'error' | 'running' }[]>([]);
    const [debugOutput, setDebugOutput] = useState<string | null>(null);

    const editorLanguage = useMemo(() => {
        switch (blockContent.executionType) {
            case 'soql': return 'sql';
            case 'class':
            case 'anonymous':
            default:
                return 'java';
        }
    }, [blockContent.executionType]);

    const handleCodeChange = (v: string | undefined) => {
        setCode(v || '');
        setIsSolved(false); // Reset solved status on code change
    };
    
    const handleTestCodeChange = (v: string | undefined) => {
        setTestCode(v || '');
        setIsSolved(false);
    };

    const handleExecute = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In' });
            return;
        }
        if (!userData?.sfdcAuth?.connected) {
            toast({ variant: 'destructive', title: 'Salesforce Not Connected', description: 'Please connect your Salesforce org in settings.' });
            router.push('/settings');
            return;
        }

        setIsExecuting(true);
        setDebugOutput(null);
        setIsSolved(false);

        const steps = [{ text: 'Initializing...', status: 'running' as const }];
        setExecutionSteps(steps);

        const response = await executeSalesforceCode(
            user.uid, 
            code, 
            blockContent.executionType || 'anonymous',
            blockContent.executionType === 'class' ? testCode : undefined
        );
        
        if (response.success) {
            steps[0] = { text: 'Execution finished successfully', status: 'success' };
            setExecutionSteps([...steps]);
            setDebugOutput(response.result);
            setIsSolved(true);
        } else {
            steps[0] = { text: 'Execution failed', status: 'error' };
            setExecutionSteps([...steps]);
            setDebugOutput(response.result);
        }
        setIsExecuting(false);
    };

    const SoqlResultsTable = ({ data }: { data: { totalSize: number, records: any[] } }) => {
        if (!data || data.totalSize === 0) {
            return <p>Query returned 0 records.</p>;
        }
        const headers = data.records.length > 0 ? Object.keys(data.records[0]).filter(key => key !== 'attributes') : [];
        return (
            <div>
                <p className="mb-4">Query returned {data.totalSize} record(s).</p>
                <div className="rounded-md border bg-background max-h-64 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.records.map((record, index) => (
                                <TableRow key={index}>
                                    {headers.map(header => (
                                        <TableCell key={header} className="font-code text-xs">
                                            {record[header] === null ? 'null' : (typeof record[header] === 'object' ? JSON.stringify(record[header]) : String(record[header]))}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }
    
    return (
         <Card className="not-prose my-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <FlaskConical className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg">Try It Yourself</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-background/50 border">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">{blockContent.title || 'Assignment'}</h4>
                        {isSolved && <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-500/30">Solved</Badge>}
                    </div>
                    <Separator />
                    <p className="text-muted-foreground pt-2 text-sm">{blockContent.description}</p>
                </div>

                {blockContent.executionType === 'class' ? (
                     <Tabs defaultValue="class">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="class">Apex Class</TabsTrigger>
                            <TabsTrigger value="test">Test Class</TabsTrigger>
                        </TabsList>
                        <TabsContent value="class" className="mt-2">
                            <div className="h-64 w-full border rounded-md overflow-hidden">
                                <MonacoEditor height="100%" language={editorLanguage} value={code} onChange={handleCodeChange} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
                            </div>
                        </TabsContent>
                        <TabsContent value="test" className="mt-2">
                            <div className="h-64 w-full border rounded-md overflow-hidden">
                                <MonacoEditor height="100%" language={editorLanguage} value={testCode} onChange={handleTestCodeChange} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="h-64 w-full border rounded-md overflow-hidden">
                        <MonacoEditor height="100%" language={editorLanguage} value={code} onChange={handleCodeChange} theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'} options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
                    </div>
                )}
                
                <Button onClick={handleExecute} disabled={isExecuting}>
                    {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isExecuting ? 'Executing...' : 'Execute'}
                </Button>

                {executionSteps.length > 0 && (
                    <div className="space-y-2 text-sm pt-4">
                        {executionSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2">
                                {step.status === 'running' ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : step.status === 'error' ? (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                <span className={step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{step.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                {debugOutput && (
                    <Card className="mt-4 bg-background/50">
                        <CardHeader className="p-3 border-b">
                            <CardTitle className="text-sm">Debug Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            {blockContent.executionType === 'soql' && typeof debugOutput === 'object' ? (
                                <SoqlResultsTable data={debugOutput as any} />
                            ) : (
                               <pre className="text-xs font-code whitespace-pre-wrap">{debugOutput}</pre>
                            )}
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
};

const StepperChallenge = ({ blockContent, allProblems }: { blockContent: any; allProblems: ProblemWithCategory[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const steps = blockContent.steps || [];

    const handleNext = () => {
        if (currentIndex < steps.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else if (currentIndex === steps.length - 1) {
            setIsCompleted(true);
        }
    };
    const handlePrev = () => {
        if (isCompleted) {
            setIsCompleted(false);
        } else if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const currentStep = steps[currentIndex];

    return (
        <div className="not-prose my-6 w-full text-center relative overflow-hidden">
            {isCompleted && <ReactConfetti recycle={false} numberOfPieces={200} />}
            {blockContent.title && <h3 className="text-2xl font-semibold mb-2">{blockContent.title}</h3>}
            <div className="flex items-center justify-center my-8 max-w-xl mx-auto">
                {steps.map((step: any, index: number) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-white font-bold border-2 transition-all",
                                isCompleted || index < currentIndex ? "bg-green-500 border-green-500" :
                                index === currentIndex ? "bg-primary border-primary scale-110" :
                                "bg-muted border-border"
                            )}>
                                {(isCompleted || index < currentIndex) ? <Check className="h-5 w-5" /> : <span className={cn(index === currentIndex ? "text-primary-foreground" : "text-muted-foreground")}>{index + 1}</span>}
                            </div>
                            <p className="text-sm mt-2 text-muted-foreground">{step.title}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="flex-1 h-0.5 border-t-2 border-dashed border-border mx-2"></div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrev} disabled={!isCompleted && currentIndex === 0}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Card className="flex-1 text-left min-h-[200px]">
                    {isCompleted ? (
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                            <PartyPopper className="h-12 w-12 text-primary"/>
                             <h4 className="text-2xl font-bold">Completed!</h4>
                             <p className="text-muted-foreground">Great job finishing all the steps.</p>
                        </CardContent>
                    ) : (
                        <CardContent className="p-6">
                            <div className="prose dark:prose-invert max-w-none">
                                <ContentRenderer contentBlocks={currentStep?.content || []} allProblems={allProblems} />
                            </div>
                        </CardContent>
                    )}
                </Card>
                 <Button size="icon" onClick={handleNext} disabled={isCompleted}>
                    {currentIndex === steps.length - 1 ? (
                        <Check className="h-4 w-4"/>
                    ) : (
                        <ArrowRight className="h-4 w-4" />
                    )}
                </Button>
            </div>
             {blockContent.body && <p className="text-muted-foreground mt-4">{blockContent.body}</p>}
        </div>
    );
};

// #region Mindmap Component
const NODE_WIDTH = 180;
const NODE_HEIGHT = 44;
const HORIZONTAL_SPACING = 150;
const VERTICAL_SPACING = 30;

type ProcessedNode = MindmapNode & {
    x: number;
    y: number;
    width: number;
    height: number;
    depth: number;
    children?: ProcessedNode[];
};

const MindmapRenderer = ({ content }: { content: string }) => {
    const [mapData, setMapData] = useState<MindmapNode | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        try {
            const parsed = JSON.parse(content);
            setMapData(parsed.root);
            setExpandedNodes({ [parsed.root.id]: true }); // Expand root by default
        } catch (e) {
            console.error("Failed to parse mindmap JSON:", e);
            setMapData(null);
        }
    }, [content]);

    const toggleNode = useCallback((nodeId: string) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    }, []);

    const { positionedNodes, connections } = useMemo(() => {
        if (!mapData) return { positionedNodes: [], connections: [] };

        const positionedMap = new Map<string, ProcessedNode>();
        const connectionList: { from: ProcessedNode, to: ProcessedNode }[] = [];

        const calculateLayout = (node: MindmapNode, x: number, y: number, depth: number): { height: number; subtreeNodes: ProcessedNode[] } => {
            const isExpanded = expandedNodes[node.id] && node.children && node.children.length > 0;
            let totalHeight = NODE_HEIGHT;
            const subtreeNodes: ProcessedNode[] = [];
            
            const processedNode: ProcessedNode = { ...node, x, y, width: NODE_WIDTH, height: NODE_HEIGHT, depth };
            subtreeNodes.push(processedNode);
            positionedMap.set(node.id, processedNode);

            if (isExpanded) {
                let currentY = y - ((node.children!.length - 1) * (NODE_HEIGHT + VERTICAL_SPACING)) / 2;
                
                node.children!.forEach(child => {
                    const childLayout = calculateLayout(child, x + NODE_WIDTH + HORIZONTAL_SPACING, currentY, depth + 1);
                    
                    connectionList.push({ from: processedNode, to: childLayout.subtreeNodes[0] });
                    subtreeNodes.push(...childLayout.subtreeNodes);

                    const childSubtreeHeight = childLayout.height;
                    currentY += childSubtreeHeight + VERTICAL_SPACING;
                });

                const childrenHeights = node.children.map(child => calculateLayout(child, 0, 0, depth + 1).height);
                const totalChildrenHeight = childrenHeights.reduce((sum, h) => sum + h, 0) + (childrenHeights.length - 1) * VERTICAL_SPACING;
                totalHeight = Math.max(NODE_HEIGHT, totalChildrenHeight);

                // Re-center parent node based on its children block
                const firstChild = positionedMap.get(node.children[0].id);
                const lastChild = positionedMap.get(node.children[node.children.length - 1].id);
                if (firstChild && lastChild) {
                    processedNode.y = firstChild.y + (lastChild.y - firstChild.y) / 2;
                }
            }
             
            return { height: totalHeight, subtreeNodes };
        };
        
        const finalLayout = calculateLayout(mapData, 50, 300, 0);

        let maxX = 0, maxY = 0;
        finalLayout.subtreeNodes.forEach(n => {
            if (n.x + n.width > maxX) maxX = n.x + n.width;
            if (n.y + n.height > maxY) maxY = n.y + n.height;
        });

        setCanvasSize({ width: maxX + 50, height: Math.max(maxY + 50, 600) });

        return { positionedNodes: finalLayout.subtreeNodes, connections: connectionList };

    }, [mapData, expandedNodes]);

    if (!mapData) {
        return <div className="p-4 text-destructive bg-destructive/10 rounded-md">Invalid Mindmap Data</div>;
    }

    const getBezierPath = (from: ProcessedNode, to: ProcessedNode) => {
        const startX = from.x + from.width;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y + to.height / 2;
        const cp1X = startX + HORIZONTAL_SPACING / 2;
        const cp1Y = startY;
        const cp2X = endX - HORIZONTAL_SPACING / 2;
        const cp2Y = endY;
        return `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
    };

    return (
        <div className="not-prose my-6 w-full p-4 overflow-auto bg-slate-900/50 dark:bg-black/20 rounded-lg border border-slate-700/50">
            <svg width={canvasSize.width} height={canvasSize.height}>
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
                    </marker>
                </defs>
                
                {connections.map(({ from, to }, index) => (
                    <path key={index} d={getBezierPath(from, to)} stroke="hsl(var(--border) / 0.3)" strokeWidth="1" fill="none" />
                ))}

                {positionedNodes.map(node => (
                    <foreignObject key={node.id} x={node.x} y={node.y} width={node.width} height={node.height} className="overflow-visible">
                        <div
                            className={cn(
                                "border rounded-lg shadow-md h-full flex items-center justify-center p-2 group relative transition-all",
                                "bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700/80 hover:border-slate-600"
                            )}
                            title={node.content}
                        >
                            <span className="text-sm text-center font-medium">{node.label}</span>
                            {node.children && node.children.length > 0 && (
                                <button
                                    onClick={() => toggleNode(node.id)}
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border hover:bg-muted flex items-center justify-center z-10"
                                >
                                    {expandedNodes[node.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                            )}
                        </div>
                    </foreignObject>
                ))}
            </svg>
        </div>
    );
};
// #endregion

const markdownComponents: Components = {
    span: ({ node, ...props }) => {
        const dataComment = (node?.properties as any)?.dataComment;
        if (dataComment) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span {...props} className="comment-highlight" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-background/80 backdrop-blur-md">
                            <div>{dataComment}</div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        return <span {...props} />;
    },
};


const ContentRenderer = ({ contentBlocks, allProblems }: { contentBlocks: ContentBlock[] | string, allProblems: ProblemWithCategory[] }) => {
  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-[#1ca350]/20 text-[#1ca350] border border-[#1ca350]/30';
      case 'medium': return 'bg-primary/20 text-primary border border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border border-destructive/30';
      default: return 'bg-muted border';
    }
  };
  const { theme } = useTheme();

  // Handle legacy string content for Stepper for backward compatibility
  if (typeof contentBlocks === 'string') {
    return <p>{contentBlocks}</p>;
  }

  const renderInnerBlock = (block: ContentBlock) => {
      switch (block.type) {
        case 'text':
          return (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {block.content || ''}
            </ReactMarkdown>
          );
        case 'code':
          return (
              <div className="not-prose w-full overflow-x-auto rounded-lg shadow-lg border my-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800">
                      <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                      {block.content.language?.toUpperCase() || 'CODE'}
                      </span>
                  </div>
                   <SyntaxHighlighter
                      language={block.content.language === 'apex' ? 'java' : block.content.language}
                      style={theme === 'dark' ? vscDarkPlus : vs}
                      showLineNumbers={true}
                      customStyle={{ 
                          margin: 0, 
                          padding: '1.5rem', 
                          background: 'transparent',
                          fontSize: '1rem',
                      }}
                      codeTagProps={{ style: { fontFamily: 'var(--font-source-code-pro)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                      lineNumberStyle={{ color: '#858585', fontSize: '1rem' }}
                  >
                      {String(block.content.code || '').trim()}
                  </SyntaxHighlighter>
              </div>
          );
         case 'heading1':
              return <h1 className="text-4xl font-bold mt-8 mb-4 border-b pb-2">{block.content}</h1>;
          case 'heading2':
              return <h2 className="text-3xl font-semibold mt-8 mb-4 border-b pb-2">{block.content}</h2>;
          case 'heading3':
              return <h3 className="text-2xl font-semibold mt-6 mb-3">{block.content}</h3>;
          case 'quote':
              return (
                  <blockquote className="not-prose mt-6 border-l-4 border-primary bg-muted/50 p-4 rounded-r-lg">
                      <div className="prose prose-sm dark:prose-invert text-muted-foreground italic">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                              {block.content}
                          </ReactMarkdown>
                      </div>
                  </blockquote>
              );
          case 'callout':
              return (
                  <div className="not-prose my-6 flex items-start gap-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
                      <div className="text-2xl pt-1">{block.content.icon}</div>
                      <div className="prose dark:prose-invert max-w-none text-primary/90">
                         <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                              {block.content.text}
                          </ReactMarkdown>
                      </div>
                  </div>
              );
          case 'divider':
              return <hr className="my-8" />;
          case 'bulleted-list':
          case 'numbered-list':
            return (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {block.content || ''}
              </ReactMarkdown>
            );
          case 'todo-list':
            return (
              <div className="not-prose my-6 space-y-2">
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
              <div className="not-prose my-6">
                <Accordion type="single" collapsible className="w-full bg-transparent">
                    <AccordionItem value="item-1" className="border rounded-md shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-4 font-semibold hover:no-underline bg-muted/50 hover:bg-muted/80">
                           {block.content.title}
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-4 bg-background border-t">
                             <div className="prose dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
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
                  <Card className="not-prose my-6">
                      <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                  <FileQuestion className="h-4 w-4" />
                                  <span>Challenge</span>
                              </div>
                              {problemDetails && (
                                  <Badge variant="outline" className={cn("justify-center", getDifficultyBadgeClass(problemDetails.difficulty))}>
                                      {problemDetails.difficulty}
                                  </Badge>
                              )}
                          </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                           <h4 className="text-xl font-bold">{block.content.title}</h4>
                           {problemDetails?.metadataType && (
                              <p className="text-sm text-muted-foreground mt-1">{problemDetails.metadataType}</p>
                           )}
                      </CardContent>
                      <CardFooter>
                          <Button asChild>
                              <Link href={`/problems/apex/${encodeURIComponent(problemDetails?.categoryName || '')}/${block.content.problemId}`}>
                                  Solve Problem
                              </Link>
                          </Button>
                      </CardFooter>
                  </Card>
              );
          case 'image':
              return (
                  <div className="not-prose relative w-full aspect-video my-6 rounded-lg overflow-hidden">
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
                  <div className="not-prose aspect-video my-6">
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
                  <div className="not-prose my-6 w-fit">
                      <audio controls src={block.content}>
                          Your browser does not support the audio element.
                      </audio>
                  </div>
              );
          case 'table':
              return (
                  <div className="not-prose my-6 overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                          <thead>
                          <tr className="bg-muted">
                              {block.content.headers.map((header: string, index: number) => (
                              <th key={index} className="p-3 font-semibold text-left border">{header}</th>
                              ))}
                          </tr>
                          </thead>
                          <tbody>
                          {block.content.rows.map((row: { values: string[] }, rowIndex: number) => (
                              <tr key={rowIndex} className="border-b">
                              {row.values.map((cell: string, cellIndex: number) => (
                                  <td key={cellIndex} className="p-3 border">{cell}</td>
                              ))}
                              </tr>
                          ))}
                          </tbody>
                      </table>
                  </div>
              );
          case 'mcq':
              return <McqChallenge blockContent={block.content} />;
          case 'breadcrumb':
              return (
                  <nav aria-label="Breadcrumb" className="not-prose my-6 p-3 bg-muted/50 rounded-md">
                      <ol className="flex items-center space-x-2 text-sm">
                          {(block.content as {id: string, text: string, href?: string}[]).map((item, index, arr) => (
                              <li key={item.id} className="flex items-center space-x-2">
                                  {item.href ? (
                                      <Link href={item.href} className="text-primary hover:underline">{item.text}</Link>
                                  ) : (
                                      <span className="text-muted-foreground">{item.text}</span>
                                  )}
                                  {index < arr.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </li>
                          ))}
                      </ol>
                  </nav>
              );
          case 'mermaid':
               return <MermaidRenderer chart={block.content} />;
          case 'interactive-code':
                return <InteractiveCodeChallenge blockContent={block.content} />;
          case 'stepper':
                return <StepperChallenge blockContent={block.content} allProblems={allProblems}/>;
          case 'live-code':
              return <LiveCodeRenderer blockContent={block.content} />;
          case 'mindmap':
              return <MindmapRenderer content={block.content} />;
          case 'two-column':
              return (
                  <div className="not-prose my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <ContentRenderer contentBlocks={block.content.column1} allProblems={allProblems} />
                      </div>
                      <div className="space-y-4">
                          <ContentRenderer contentBlocks={block.content.column2} allProblems={allProblems} />
                      </div>
                  </div>
              );
          case 'three-column':
              return (
                  <div className="not-prose my-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                          <ContentRenderer contentBlocks={block.content.column1} allProblems={allProblems} />
                      </div>
                      <div className="space-y-4">
                         <ContentRenderer contentBlocks={block.content.column2} allProblems={allProblems} />
                      </div>
                      <div className="space-y-4">
                          <ContentRenderer contentBlocks={block.content.column3} allProblems={allProblems} />
                      </div>
                  </div>
              );
        default:
          return null;
      }
  };

  if (!Array.isArray(contentBlocks)) {
    return <p>{contentBlocks}</p>;
  }

  return (
    <>
      {(contentBlocks || []).map(block => {
        const wrapperStyle: React.CSSProperties = {
            ...(block.backgroundColor ? { backgroundColor: block.backgroundColor } : {}),
            ...(block.textColor ? { color: block.textColor } : {}),
            ...(block.width ? { width: block.width, maxWidth: '100%' } : {}),
        };
        const wrapperClassName = cn(
            "my-4",
            block.backgroundColor && "p-4 rounded-lg",
            block.align === 'center' && 'mx-auto',
            block.align === 'right' && 'ml-auto',
        );

        return (
            <div key={block.id} style={wrapperStyle} className={wrapperClassName}>
                {renderInnerBlock(block)}
            </div>
        );
      })}
    </>
  );
};

const LessonContent = ({ contentBlocks, allProblems }: { contentBlocks: ContentBlock[], allProblems: ProblemWithCategory[] }) => {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ContentRenderer contentBlocks={contentBlocks} allProblems={allProblems} />
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
                        if (lesson.contentBlocks.some(b => b.type === 'problem' || b.type === 'stepper')) {
                            const processProblems = async (data: ApexProblemsData) => {
                                const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                                );
                                setAllProblems(problems);
                            };

                            const cachedProblems = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
                            if (cachedProblems) {
                                processProblems(cachedProblems);
                            } else {
                                const apexDocRef = doc(db, "problems", "Apex");
                                const apexSnap = await getDoc(apexDocRef);
                                if (apexSnap.exists()) {
                                    const data = apexSnap.data().Category as ApexProblemsData;
                                    await setCache(APEX_PROBLEMS_CACHE_KEY, data);
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
    
    const CourseSidebar = () => (
        <ScrollArea className="h-full p-4">
            <div className="mb-4">
                <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Course
                </Button>
                <h2 className="text-lg font-semibold">{course.title}</h2>
                {totalLessonsCount > 0 && (
                    <div className="mt-2 space-y-1">
                        <div className="relative">
                            <Progress value={progressPercentage} className="h-2 bg-muted" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-background dark:text-foreground">
                                    {completedLessonsCount} / {totalLessonsCount}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% completed</p>
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
    );

    return (
        <div className="h-screen flex flex-col pt-16 md:pt-0">
             <div className="md:hidden fixed bottom-6 right-6 z-50">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="icon" className="rounded-full shadow-lg h-14 w-14">
                            <LayoutGrid className="h-6 w-6" />
                            <span className="sr-only">Open Course Index</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 max-w-sm flex flex-col bg-background/80 backdrop-blur-sm">
                       <CourseSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                <ResizablePanel defaultSize={25} minSize={20} className="hidden md:block bg-card">
                    <CourseSidebar />
                </ResizablePanel>
                 <ResizableHandle withHandle className="hidden md:flex"/>
                <ResizablePanel defaultSize={75}>
                    <main className="h-full flex flex-col bg-background relative">
                        <div className="p-4 border-b flex items-center justify-between bg-background/60 backdrop-blur-sm">
                            <h1 className="text-2xl font-bold font-headline">{currentLesson.title}</h1>
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
