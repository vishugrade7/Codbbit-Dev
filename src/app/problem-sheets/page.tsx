
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Users, Pencil, Bookmark, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toggleSheetFollow } from "../sheets/actions";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const cardColorThemes = [
    { // Blue
        card: "bg-blue-100 dark:bg-blue-900/30",
        progressBg: "bg-blue-200 dark:bg-blue-800/30",
        progressFg: "bg-blue-500",
        progressText: "text-blue-900 dark:text-blue-200",
    },
    { // Orange
        card: "bg-orange-100 dark:bg-orange-900/30",
        progressBg: "bg-orange-200 dark:bg-orange-800/30",
        progressFg: "bg-orange-500",
        progressText: "text-orange-900 dark:text-orange-200",
    },
    { // Green
        card: "bg-green-100 dark:bg-green-900/30",
        progressBg: "bg-green-200 dark:bg-green-800/30",
        progressFg: "bg-green-500",
        progressText: "text-green-900 dark:text-green-200",
    },
    { // Purple
        card: "bg-purple-100 dark:bg-purple-900/30",
        progressBg: "bg-purple-200 dark:bg-purple-800/30",
        progressFg: "bg-purple-500",
        progressText: "text-purple-900 dark:text-purple-200",
    },
    { // Teal
        card: "bg-teal-100 dark:bg-teal-900/30",
        progressBg: "bg-teal-200 dark:bg-teal-800/30",
        progressFg: "bg-teal-500",
        progressText: "text-teal-900 dark:text-teal-200",
    }
];

export default function ProblemSheetsListPage() {
  const [sheets, setSheets] = useState<ProblemSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'all' | 'my-sheets' | 'following'>('all');
  const [isTogglingFollow, setIsTogglingFollow] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheets = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const sheetsRef = collection(db, "problem-sheets");
        const q = query(sheetsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const sheetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemSheet));
        setSheets(sheetsData);
      } catch (error) {
        console.error("Error fetching problem sheets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSheets();
  }, []);

  const handleFollow = async (sheetId: string) => {
    if (!authUser) {
        toast({ variant: 'destructive', title: 'Please log in to follow sheets.' });
        return;
    }
    setIsTogglingFollow(sheetId);
    const isCurrentlyFollowing = userData?.followingSheetIds?.includes(sheetId) ?? false;
    const result = await toggleSheetFollow(authUser.uid, sheetId, isCurrentlyFollowing);

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
    setIsTogglingFollow(null);
  };

  const filteredSheets = useMemo(() => {
    if (filterMode === 'following') {
      if (!userData?.followingSheetIds) return [];
      const followingIds = new Set(userData.followingSheetIds);
      return sheets.filter(sheet => followingIds.has(sheet.id));
    }
    if (filterMode === 'my-sheets') {
        if (!authUser) return [];
        return sheets.filter(sheet => sheet.createdBy === authUser.uid);
    }
    return sheets;
  }, [sheets, filterMode, userData, authUser]);

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
              <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Problem Sheets</h1>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                  Browse community-created problem sheets or create your own.
              </p>
          </div>
           <Button asChild>
              <Link href="/problem-sheets/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Sheet
              </Link>
          </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
          <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as any)} className="w-auto">
              <TabsList>
                  <TabsTrigger value="all">All Sheets</TabsTrigger>
                  <TabsTrigger value="my-sheets" disabled={!authUser}>My Sheets</TabsTrigger>
                  <TabsTrigger value="following" disabled={!authUser}>Following</TabsTrigger>
              </TabsList>
          </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredSheets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSheets.map((sheet, index) => {
            const theme = cardColorThemes[index % cardColorThemes.length];
            const isCreator = authUser?.uid === sheet.createdBy;
            const followersCount = sheet.followers?.length || 0;
            const totalProblems = sheet.problemIds.length;
            const solvedCount = authUser && userData ? sheet.problemIds.filter(id => userData.solvedProblems?.[id]).length : 0;
            const progressPercentage = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
            const isFollowed = !!(authUser && userData?.followingSheetIds?.includes(sheet.id));
            const isTogglingThisFollow = isTogglingFollow === sheet.id;

            return (
              <Card key={sheet.id} className={cn("flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border", theme.card)}>
                  {isCreator && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-10 right-3 h-8 w-8 z-10 bg-card/80 hover:bg-card"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/problem-sheets/create?id=${sheet.id}`);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Sheet</span>
                    </Button>
                  )}
                  {/* Top progress bar */}
                  {authUser && (
                       <div className={cn("h-[30px] relative flex items-center justify-center", theme.progressBg)}>
                          <div 
                              className={cn("absolute top-0 left-0 h-full transition-all duration-500", theme.progressFg)}
                              style={{ width: `${progressPercentage}%` }}
                          />
                          <span className={cn("relative text-xs font-bold", theme.progressText)}>
                              {Math.round(progressPercentage)}%
                          </span>
                      </div>
                  )}

                  <div className="p-4 flex-grow flex flex-col">
                      <div className="flex justify-between items-start">
                          <Link href={`/sheets/${sheet.id}`} className="block flex-1 pr-4">
                              <CardTitle className="text-base font-bold hover:underline">{sheet.name}</CardTitle>
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                              <Users className="h-4 w-4" />
                              <span>{followersCount.toLocaleString()} Followers</span>
                          </div>
                      </div>

                      {sheet.description && (
                          <Link href={`/sheets/${sheet.id}`} className="block mt-2">
                              <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                                  {sheet.description}
                              </CardDescription>
                          </Link>
                      )}

                      <div className="mt-auto pt-4 flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <ClipboardList className="h-4 w-4" />
                              <span>{sheet.problemIds.length} questions</span>
                          </div>

                          {!isCreator && authUser && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground"
                                          onClick={(e) => {
                                              e.preventDefault();
                                              handleFollow(sheet.id);
                                          }}
                                          disabled={isTogglingThisFollow}
                                      >
                                          {isTogglingThisFollow ? <Loader2 className="h-4 w-4 animate-spin"/> : <Bookmark className={cn("h-5 w-5", isFollowed && "fill-current text-foreground")} />}
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{isFollowed ? 'Unfollow' : 'Follow'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                          )}
                      </div>
                  </div>
              </Card>
            );
          })}
        </div>
      ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                  {filterMode === 'all' && 'No Problem Sheets Yet'}
                  {filterMode === 'my-sheets' && 'You haven\'t created any sheets'}
                  {filterMode === 'following' && 'No Followed Sheets'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                  {filterMode === 'all' && 'Get started by creating a new sheet.'}
                  {filterMode === 'my-sheets' && 'Create a sheet to see it here.'}
                  {filterMode === 'following' && 'Follow sheets to see them here.'}
              </p>
          </div>
      )}
    </main>
  );
}
