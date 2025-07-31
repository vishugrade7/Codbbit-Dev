
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProblemSheet, Problem, ApexProblemsData } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toggleSheetFollow } from '../actions';
import { getCache, setCache } from '@/lib/cache';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, UserCheck, FileText, CheckCircle2, Circle, Search, Lock, PanelLeft, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from '@/components/ui/progress';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type ProblemDetailWithCategory = Problem & { categoryName: string };
const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function SheetDisplayPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: authUser, userData, isPro } = useAuth();
    const sheetId = params.sheetId as string;
    const isMobile = useIsMobile();
    
    const [sheet, setSheet] = useState<ProblemSheet | null>(null);
    const [problems, setProblems] = useState<ProblemDetailWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowed, setIsFollowed] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");

    useEffect(() => {
        if (!sheetId || !db) return;
    
        setLoading(true);
        const sheetDocRef = doc(db, 'problem-sheets', sheetId);
    
        const unsubscribe = onSnapshot(sheetDocRef, async (sheetSnap) => {
            if (!sheetSnap.exists()) {
                toast({ variant: 'destructive', title: 'Sheet not found' });
                setSheet(null);
                setProblems([]);
                setLoading(false);
                return;
            }
            
            const sheetData = { id: sheetSnap.id, ...sheetSnap.data() } as ProblemSheet;
            setSheet(sheetData);

            const followers = sheetData.followers || [];
            setFollowersCount(followers.length);
            if (authUser) {
                setIsFollowed(followers.includes(authUser.uid));
            } else {
                setIsFollowed(false);
            }
            
            if (sheetData.problemIds && sheetData.problemIds.length > 0) {
                 const processProblems = (data: ApexProblemsData | null) => {
                    if (!data) return;
                    const allProblems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );

                    const problemIdsSet = new Set(sheetData.problemIds);
                    const sheetProblems = allProblems.filter(p => problemIdsSet.has(p.id));
                    
                    const sortedProblems = sheetData.problemIds.map(id => 
                        sheetProblems.find(p => p.id === id)
                    ).filter((p): p is ProblemDetailWithCategory => p !== undefined);

                    setProblems(sortedProblems);
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
            setLoading(false);
        }, (error) => {
            console.error("Error fetching sheet:", error);
            toast({ variant: 'destructive', title: 'Failed to load sheet' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sheetId, authUser, toast]);

    const { solvedCount, progressPercentage } = useMemo(() => {
        if (!authUser || !userData || !problems || problems.length === 0) {
            return { solvedCount: 0, progressPercentage: 0 };
        }
        const count = problems.filter(p => userData.solvedProblems?.[p.id]).length;
        const percentage = (count / problems.length) * 100;
        return { solvedCount: count, progressPercentage: percentage };
    }, [authUser, userData, problems]);

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => {
            if (statusFilter === "All") return true;
            const isSolved = !!userData?.solvedProblems?.[p.id];
            if (statusFilter === "Solved") return isSolved;
            if (statusFilter === "Unsolved") return !isSolved;
            return true;
          })
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => categoryFilter === "All" || p.categoryName === categoryFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter, statusFilter, categoryFilter, userData]);

    const uniqueCategories = useMemo(() => {
        if (!problems || problems.length === 0) return [];
        const categorySet = new Set(problems.map(p => p.categoryName));
        return Array.from(categorySet);
    }, [problems]);
    
    const categoryCompletionStatus = useMemo(() => {
        if (!authUser || !userData?.solvedProblems || problems.length === 0) {
            return {};
        }

        const completionStatus: { [categoryName: string]: boolean } = {};
        const solvedProblemIds = new Set(Object.keys(userData.solvedProblems));

        uniqueCategories.forEach(category => {
            const problemsInCategory = problems.filter(p => p.categoryName === category);
            const allSolved = problemsInCategory.length > 0 && problemsInCategory.every(p => solvedProblemIds.has(p.id));
            completionStatus[category] = allSolved;
        });

        return completionStatus;
    }, [authUser, userData, problems, uniqueCategories]);
    
    const difficultyStats = useMemo(() => {
        if (!problems || problems.length === 0) {
            return { Easy: 0, Medium: 0, Hard: 0, total: 0 };
        }
        const stats = problems.reduce((acc, problem) => {
            const difficulty = problem.difficulty as keyof typeof acc;
            if (difficulty in acc) {
                acc[difficulty]++;
            }
            return acc;
        }, { Easy: 0, Medium: 0, Hard: 0 });

        return { ...stats, total: problems.length };
    }, [problems]);

    const getPercentage = (count: number, total: number) => {
        if (total === 0) return 0;
        return (count / total) * 100;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
    };

    const handleToggleFollow = async () => {
        if (!authUser) {
            toast({ variant: 'destructive', title: 'Please log in to follow.' });
            return;
        }
        if (isTogglingFollow || !db) return;
    
        setIsTogglingFollow(true);
    
        const result = await toggleSheetFollow(authUser.uid, sheetId, isFollowed);

        if (result.success) {
            toast({
                title: result.message,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: result.error,
            });
        }
        setIsTogglingFollow(false);
    };

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
          case 'medium': return 'bg-yellow-400/20 text-yellow-500 border-yellow-400/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
        }
    };

    const getDifficultyRowClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-500/5 hover:bg-green-500/10';
          case 'medium': return 'bg-yellow-500/5 hover:bg-yellow-500/10';
          case 'hard': return 'bg-destructive/5 hover:bg-destructive/10';
          default: return 'hover:bg-muted/50';
        }
    };
    
    const timeAgo = useMemo(() => {
        if (!sheet?.createdAt) return '';
        try {
            if (sheet.createdAt && typeof sheet.createdAt.toDate === 'function') {
                return formatDistanceToNow(sheet.createdAt.toDate(), { addSuffix: true });
            }
        } catch (e) {
            console.error("Error formatting date:", e);
        }
        return '';
    }, [sheet]);

    const SheetDetails = () => (
        <ScrollArea>
            <div className="space-y-6 p-4 sm:p-0 sm:pr-4">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <h2 className="text-xl font-headline font-semibold">{sheet!.name}</h2>
                             <div className="flex items-center gap-2 mt-2">
                                {sheet!.creatorAvatarUrl && (
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={sheet!.creatorAvatarUrl} alt={sheet!.creatorName} />
                                        <AvatarFallback>{sheet!.creatorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    Created by{' '}
                                    {sheet!.creatorUsername ? (
                                        <Link href={`/profile/${sheet!.creatorUsername}`} className="font-semibold text-foreground hover:underline">
                                            {sheet!.creatorName}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold text-foreground">{sheet!.creatorName}</span>
                                    )}{' '}
                                    {timeAgo}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Button onClick={handleToggleFollow} disabled={!authUser || isTogglingFollow} size="sm">
                                {isTogglingFollow ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : isFollowed ? (<UserCheck className="mr-2 h-4 w-4" />) : (<UserPlus className="mr-2 h-4 w-4" />)}
                                {isFollowed ? 'Following' : 'Follow'}
                            </Button>
                            <Button onClick={handleCopyLink} variant="outline" size="sm"><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{followersCount} {followersCount === 1 ? 'follower' : 'followers'}</span>
                    </div>
                </div>

                {(uniqueCategories.length > 0 || problems.length > 0) && (
                    <div className="space-y-6 pt-6 border-t">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground">PROGRESS</h4>
                            <div className="relative">
                                <Progress value={progressPercentage} className="h-4" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary-foreground mix-blend-difference">
                                        {Math.round(progressPercentage)}%
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-right">{solvedCount} / {difficultyStats.total} solved</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-16 text-muted-foreground">Easy</span>
                                <div className="flex-1 bg-muted rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Easy, difficultyStats.total)}%` }}></div>
                                </div>
                                <span className="w-8 text-right font-semibold">{difficultyStats.Easy}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-16 text-muted-foreground">Medium</span>
                                <div className="flex-1 bg-muted rounded-full h-2">
                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Medium, difficultyStats.total)}%` }}></div>
                                </div>
                                <span className="w-8 text-right font-semibold">{difficultyStats.Medium}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-16 text-muted-foreground">Hard</span>
                                <div className="flex-1 bg-muted rounded-full h-2">
                                    <div className="bg-destructive h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Hard, difficultyStats.total)}%` }}></div>
                                </div>
                                <span className="w-8 text-right font-semibold">{difficultyStats.Hard}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground">TOPICS COVERED</h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant={categoryFilter === 'All' ? 'default' : 'secondary'}
                                    onClick={() => setCategoryFilter('All')}
                                    className="cursor-pointer"
                                >
                                    All Topics
                                </Badge>
                                {uniqueCategories.map(category => {
                                    const isCompleted = categoryCompletionStatus[category];
                                    return (
                                        <Badge
                                            key={category}
                                            variant={categoryFilter === category ? 'default' : 'secondary'}
                                            onClick={() => setCategoryFilter(category)}
                                            className="cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span>{category}</span>
                                            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    const ProblemList = () => (
        <div className="flex flex-col h-full pl-0 md:pl-4">
            {problems.length > 0 && (
                <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search problems..."
                            className="w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Filter className="h-4 w-4" />
                            <span className="sr-only">Filters</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            <DropdownMenuRadioItem value="All">All Statuses</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Solved">Solved</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Unsolved">Unsolved</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={difficultyFilter} onValueChange={setDifficultyFilter}>
                            <DropdownMenuRadioItem value="All">All Difficulties</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Easy">Easy</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Medium">Medium</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Hard">Hard</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
            
            <ScrollArea className={cn("flex-1", isMobile && "-mx-8 px-[2px]")}>
                {filteredProblems.length > 0 ? (
                    <div className={cn("rounded-lg border", isMobile && "border-x-0")}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] text-center hidden sm:table-cell">#</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="hidden md:table-cell">Category</TableHead>
                                    <TableHead className="text-right">Difficulty</TableHead>
                                    <TableHead className="w-[80px] text-center hidden sm:table-cell">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProblems.map((problem, index) => {
                                    const isLocked = problem.isPremium && !isPro;
                                    return (
                                    <TableRow 
                                        key={problem.id} 
                                        className={cn(
                                            "cursor-pointer",
                                            getDifficultyRowClass(problem.difficulty),
                                            isLocked && "cursor-not-allowed opacity-60 hover:bg-transparent"
                                        )}
                                        onClick={() => {
                                            if (isLocked) {
                                                router.push('/pricing');
                                            } else {
                                                router.push(`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`)
                                            }
                                        }}>
                                        <TableCell className="font-medium text-center hidden sm:table-cell">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                                                <span className={cn("font-medium", isLocked && "filter blur-sm")}>{problem.title}</span>
                                            </div>
                                            <div className="md:hidden mt-1 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="mr-2">{problem.categoryName}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell"><Badge variant="secondary">{problem.categoryName}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                {problem.difficulty}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex justify-center">
                                                {userData?.solvedProblems?.[problem.id] ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg h-full flex flex-col justify-center items-center">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">{problems.length > 0 ? "No Matches" : "Sheet is Empty"}</h3>
                        <p className="text-muted-foreground mt-1 text-sm">{problems.length > 0 ? "No problems found for the selected criteria." : "This sheet has no problems yet."}</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!sheet) {
         return (
            <main className="flex-1 container py-8 flex items-center justify-center text-center">
                <div>
                    <h1 className="text-2xl font-bold text-destructive">Sheet Not Found</h1>
                    <p className="text-muted-foreground">The requested problem sheet could not be found.</p>
                    <Button asChild className="mt-4" variant="outline"><Link href="/problem-sheets">Create a Sheet</Link></Button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 container py-8 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => router.push('/problem-sheets')}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Back to Problem Sheets</span>
                </Button>
                <h1 className="text-2xl font-bold font-headline truncate">{sheet.name}</h1>
                {isMobile && (
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-auto">
                                <PanelLeft className="mr-2 h-4 w-4" /> View Details
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="p-0 rounded-t-lg bg-background/60 backdrop-blur-lg">
                             <SheetHeader>
                                <SheetTitle className="sr-only">{sheet.name} Details</SheetTitle>
                            </SheetHeader>
                            <div className="w-full">
                                <SheetDetails />
                            </div>
                        </SheetContent>
                    </Sheet>
                )}
            </div>
            
            {isMobile ? (
                <ProblemList />
            ) : (
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={35} minSize={25}>
                        <SheetDetails />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={65} minSize={30}>
                        <ProblemList />
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}
        </main>
    );
}
