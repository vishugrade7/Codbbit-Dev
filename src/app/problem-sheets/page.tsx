
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusCircle, Users, Search, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";


const cardColorClasses = [
  "bg-[#15803d] text-white border-green-400/30 hover:border-green-400", // Dark Green
  "bg-[#b45309] text-white border-amber-400/30 hover:border-amber-400", // Amber
  "bg-[#6d28d9] text-white border-violet-400/30 hover:border-violet-400", // Violet
  "bg-[#0369a1] text-white border-sky-400/30 hover:border-sky-400", // Sky
  "bg-[#be185d] text-white border-rose-400/30 hover:border-rose-400", // Rose
  "bg-[#86198f] text-white border-fuchsia-400/30 hover:border-fuchsia-400", // Fuchsia
];


export default function ProblemSheetsListPage() {
  const [sheets, setSheets] = useState<ProblemSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { authUser, userData } = useAuth();
  const [filterMode, setFilterMode] = useState<'all' | 'my-sheets' | 'following'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    let filtered = sheets;
    
    if (filterMode === 'following') {
      if (!userData?.subscribedSheetIds) filtered = [];
      else {
        const subscribedIds = new Set(userData.subscribedSheetIds);
        filtered = sheets.filter(sheet => subscribedIds.has(sheet.id));
      }
    } else if (filterMode === 'my-sheets') {
        if (!authUser) filtered = [];
        else {
          filtered = sheets.filter(sheet => sheet.createdBy === authUser.uid);
        }
    }
    
    if (searchTerm) {
        filtered = filtered.filter(sheet => sheet.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return filtered;
  }, [sheets, filterMode, userData, authUser, searchTerm]);

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
              <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Problem Sheets</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
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

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as any)} className="w-full md:w-auto">
              <TabsList>
                  <TabsTrigger value="all">All Sheets</TabsTrigger>
                  <TabsTrigger value="my-sheets" disabled={!authUser}>My Sheets</TabsTrigger>
                  <TabsTrigger value="following" disabled={!authUser}>Following</TabsTrigger>
              </TabsList>
          </Tabs>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search sheets..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredSheets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSheets.map((sheet, index) => {
            const subscribersCount = sheet.subscribers?.length || 0;
            const colorClass = cardColorClasses[index % cardColorClasses.length];

            return (
              <Link key={sheet.id} href={`/sheets/${sheet.id}`} className="block group">
                <Card className={cn("transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 border", colorClass)}>
                    <CardContent className="p-5 flex flex-col text-white/90">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-lg bg-white/20">
                               <ClipboardList className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-xl flex-1">{sheet.name}</h3>
                        </div>

                        <div className="flex-grow grid grid-cols-2 gap-4 my-4">
                            <div>
                                <p className="text-sm opacity-80">Questions</p>
                                <p className="text-2xl font-bold">{sheet.problemIds.length}</p>
                            </div>
                             <div>
                                <p className="text-sm opacity-80">Followers</p>
                                <p className="text-2xl font-bold">{subscribersCount}</p>
                            </div>
                        </div>

                        <Separator className="bg-white/20 my-2" />

                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-80">Created by {sheet.creatorName}</span>
                             <div className="px-4 py-1.5 rounded-full bg-white/20 font-semibold hover:bg-white/30 transition-colors">
                                View
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                  {searchTerm ? 'No sheets found' : 'No sheets to display'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'Try a different filter or create a new sheet.'}
              </p>
          </div>
      )}
    </main>
  );
}
