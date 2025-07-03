
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, FileText, ChevronRight, Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const cardColorClasses = [
  "bg-sky-100/50 dark:bg-sky-900/30 hover:border-sky-500/50",
  "bg-amber-100/50 dark:bg-amber-900/30 hover:border-amber-500/50",
  "bg-emerald-100/50 dark:bg-emerald-900/30 hover:border-emerald-500/50",
  "bg-violet-100/50 dark:bg-violet-900/30 hover:border-violet-500/50",
  "bg-rose-100/50 dark:bg-rose-900/30 hover:border-rose-500/50",
  "bg-fuchsia-100/50 dark:bg-fuchsia-900/30 hover:border-fuchsia-500/50",
];

export default function ProblemSheetsListPage() {
  const [sheets, setSheets] = useState<ProblemSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'all' | 'my-sheets' | 'subscribed'>('all');

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

  const filteredSheets = useMemo(() => {
    if (filterMode === 'subscribed') {
      if (!userData?.subscribedSheetIds) return [];
      const subscribedIds = new Set(userData.subscribedSheetIds);
      return sheets.filter(sheet => subscribedIds.has(sheet.id));
    }
    if (filterMode === 'my-sheets') {
        if (!authUser) return [];
        return sheets.filter(sheet => sheet.createdBy === authUser.uid);
    }
    return sheets;
  }, [sheets, filterMode, userData, authUser]);

  const getRelativeDate = (date: any) => {
    if (!date) return 'Just now';
    try {
      return formatDistanceToNow(date.toDate(), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header />
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
                    <TabsTrigger value="subscribed" disabled={!authUser}>Subscribed</TabsTrigger>
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
              const isCreator = authUser?.uid === sheet.createdBy;
              const subscribersCount = sheet.subscribers?.length || 0;
              const colorClass = cardColorClasses[index % cardColorClasses.length];

              return (
                <div key={sheet.id} className="relative group">
                  {isCreator && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 z-10 bg-card/80 hover:bg-card"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/problem-sheets/create?id=${sheet.id}`);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Sheet</span>
                    </Button>
                  )}
                  <Link href={`/sheets/${sheet.id}`} className="block">
                    <Card className={cn(
                        "flex flex-col transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border-transparent backdrop-blur-sm",
                        colorClass
                    )}>
                      <CardHeader>
                          <CardTitle className="flex items-start gap-3 pr-10">
                            <FileText className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                            <span className="flex-1">{sheet.name}</span>
                          </CardTitle>
                          <CardDescription>
                            {sheet.problemIds.length} {sheet.problemIds.length === 1 ? "Problem" : "Problems"}
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow flex flex-col justify-end">
                         <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={sheet.creatorAvatarUrl} alt={sheet.creatorName} />
                                    <AvatarFallback>{sheet.creatorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>
                                    By {sheet.creatorName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                                <Users className="h-4 w-4" />
                                <span>{subscribersCount} {subscribersCount === 1 ? 'subscriber' : 'subscribers'}</span>
                            </div>
                         </div>
                      </CardContent>
                       <div className="p-4 pt-2 flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              {getRelativeDate(sheet.createdAt)}
                            </span>
                            <div className="flex items-center text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                                <span>View Sheet</span>
                                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                    {filterMode === 'all' && 'No Problem Sheets Yet'}
                    {filterMode === 'my-sheets' && 'You haven\'t created any sheets'}
                    {filterMode === 'subscribed' && 'No Subscribed Sheets'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {filterMode === 'all' && 'Get started by creating a new sheet.'}
                    {filterMode === 'my-sheets' && 'Create a sheet to see it here.'}
                    {filterMode === 'subscribed' && 'Subscribe to sheets to see them here.'}
                </p>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
