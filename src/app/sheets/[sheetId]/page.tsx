'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProblemSheet, Problem, ApexProblemsData } from '@/types';
import { formatDistanceToNow } from 'date-fns';

import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ProblemDetailWithCategory = Problem & { categoryName: string };

export default function SheetDisplayPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const sheetId = params.sheetId as string;
    
    const [sheet, setSheet] = useState<ProblemSheet | null>(null);
    const [problems, setProblems] = useState<ProblemDetailWithCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sheetId || !db) return;

        const fetchSheetAndProblems = async () => {
            setLoading(true);
            try {
                // Fetch the sheet document
                const sheetDocRef = doc(db, 'problem-sheets', sheetId);
                const sheetSnap = await getDoc(sheetDocRef);

                if (!sheetSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Sheet not found' });
                    setSheet(null);
                    setProblems([]);
                    setLoading(false);
                    return;
                }
                
                const sheetData = { id: sheetSnap.id, ...sheetSnap.data() } as ProblemSheet;
                setSheet(sheetData);
                
                if (sheetData.problemIds && sheetData.problemIds.length > 0) {
                    // Fetch all problems from Apex collection
                    const apexDocRef = doc(db, "problems", "Apex");
                    const apexSnap = await getDoc(apexDocRef);
                    
                    if (apexSnap.exists()) {
                        const categoriesData = apexSnap.data().Category as ApexProblemsData;
                        const allProblems = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) => 
                            (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                        );

                        const problemIdsSet = new Set(sheetData.problemIds);
                        const sheetProblems = allProblems.filter(p => problemIdsSet.has(p.id));
                        
                        // Sort problems in the order they appear in the sheet
                        const sortedProblems = sheetData.problemIds.map(id => 
                            sheetProblems.find(p => p.id === id)
                        ).filter((p): p is ProblemDetailWithCategory => p !== undefined);

                        setProblems(sortedProblems);
                    }
                }

            } catch (error) {
                console.error("Error fetching sheet:", error);
                toast({ variant: 'destructive', title: 'Failed to load sheet' });
            } finally {
                setLoading(false);
            }
        };

        fetchSheetAndProblems();
    }, [sheetId, toast]);
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
    };

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
          case 'medium': return 'bg-primary/20 text-primary border-primary/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
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

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!sheet) {
         return (
            <div className="flex h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex-1 container py-8 flex items-center justify-center text-center">
                    <div>
                        <h1 className="text-2xl font-bold text-destructive">Sheet Not Found</h1>
                        <p className="text-muted-foreground">The requested problem sheet could not be found.</p>
                        <Button asChild className="mt-4" variant="outline"><Link href="/problem-sheets">Create a Sheet</Link></Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1 container py-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => router.push('/problem-sheets')}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back to Problem Sheets</span>
                    </Button>
                </div>
                
                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-3xl font-headline">{sheet.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={sheet.creatorAvatarUrl} alt={sheet.creatorName} />
                                        <AvatarFallback>{sheet.creatorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>Created by {sheet.creatorName} {timeAgo}</span>
                                </CardDescription>
                            </div>
                            <Button onClick={handleCopyLink}><Copy className="mr-2 h-4 w-4" /> Copy Shareable Link</Button>
                        </div>
                    </CardHeader>
                </Card>
                
                {problems.length > 0 ? (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Difficulty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {problems.map((problem, index) => (
                                    <TableRow key={problem.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`)}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell>{problem.title}</TableCell>
                                        <TableCell><Badge variant="secondary">{problem.categoryName}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                {problem.difficulty}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">This sheet has no problems yet.</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
