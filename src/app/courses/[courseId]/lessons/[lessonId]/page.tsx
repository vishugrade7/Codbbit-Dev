

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
import { Loader2, ArrowLeft, PlayCircle, BookOpen, Lock, BrainCircuit, ArrowRight, Code, AlertTriangle, CheckSquare, FileQuestion, CheckCircle, XCircle, ChevronRight, Milestone, GitFork, FlaskConical, Play, CheckCircle2 } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
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


const getLessonIcon = (lesson: Lesson) => {
    return <BookOpen className="h-5 w-5" />;
};

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';
type ProblemWithCategory = Problem & { categoryName: string };

const MermaidRenderer = ({ chart }: { chart: string }) => {
    const { theme } = useTheme();
    const mermaidId = useMemo(() => `mermaid-container-${Math.random().toString(36).substr(2, 9)}`, []);
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
        });

        const renderMermaid = async () => {
             try {
                const element = document.getElementById(mermaidId);
                if (element) {
                    // Use a unique ID for rendering that doesn't conflict with the container
                    const renderId = `mermaid-graph-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(renderId, chart);
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

        const timer = setTimeout(renderMermaid, 100);
        return () => clearTimeout(timer);

    }, [chart, theme, mermaidId, isClient]);
    
    return (
        <div id={mermaidId} className="not-prose my-6 w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">
            <div className="flex justify-center items-center min-h-[200px] text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
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

const ContentRenderer = ({ contentBlocks, allProblems }: { contentBlocks: ContentBlock[], allProblems: ProblemWithCategory[] }) => {
  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  };
  const { theme } = useTheme();

  const renderInnerBlock = (block: ContentBlock) => {
      switch (block.type) {
        case 'text':
          return (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {block.content || ''}
            </ReactMarkdown>
          );
        case 'code':
          return (
              <div className="not-prose w-full overflow-x-auto rounded-lg shadow-lg border bg-slate-900 border-slate-700 my-6">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
                      <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-sm text-slate-400 font-semibold tracking-wider">
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
                          backgroundColor: 'transparent',
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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
                         <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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
                              <Link href={`/problems/apex/${encodeURIComponent(block.content.categoryName)}/${block.content.problemId}`}>
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

  return (
    <>
      {(contentBlocks || []).map(block => {
        const wrapperStyle = {
            ...(block.backgroundColor ? { backgroundColor: block.backgroundColor } : {}),
            ...(block.textColor ? { color: block.textColor } : {}),
        };
        const wrapperClassName = block.backgroundColor ? "p-4 rounded-lg my-6" : "";

        if (block.backgroundColor || block.textColor) {
             return (
                <div key={block.id} style={wrapperStyle} className={wrapperClassName}>
                    {renderInnerBlock(block)}
                </div>
             )
        }
        
        return <div key={block.id}>{renderInnerBlock(block)}</div>;
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

    
