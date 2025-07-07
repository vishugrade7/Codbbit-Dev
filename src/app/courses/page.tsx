
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { Loader2, BookOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPro, userData } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const coursesRef = collection(db, "courses");
        const q = query(coursesRef, where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        coursesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <main className="flex-1 container py-8">
      <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Deepen your Salesforce knowledge with our expert-led courses.
          </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => {
            const theme = cardColorThemes[index % cardColorThemes.length];
            const isLocked = course.isPremium && !isPro;

            const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
            const allLessonIds = new Set(course.modules.flatMap(m => m.lessons.map(l => l.id)));
            const completedInCourse = userData?.completedLessons 
                ? Object.keys(userData.completedLessons).filter(id => allLessonIds.has(id)).length 
                : 0;
            const progressPercentage = totalLessons > 0 ? (completedInCourse / totalLessons) * 100 : 0;

            return (
            <Link key={course.id} href={`/courses/${course.id}`} className="block group">
              <Card className={cn("overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border h-full flex flex-col", theme.card)}>
                <div className="aspect-video relative">
                     {isLocked && (
                        <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                     )}
                     <Image 
                       src={course.thumbnailUrl || 'https://placehold.co/600x400.png'} 
                       alt={course.title || 'Course thumbnail'}
                       fill
                       sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                       className={cn(
                         "object-cover transition-transform duration-300 group-hover:scale-105",
                         isLocked && "filter blur-sm"
                       )}
                     />
                  </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                      <Badge variant="secondary" className="w-fit mb-2">{course.category}</Badge>
                      <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors flex-grow">
                          {course.title || 'Untitled Course'}
                      </h3>
                      
                      <div className="mt-4 pt-2">
                        {userData && totalLessons > 0 ? (
                            <div>
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className={cn("font-medium", theme.progressText)}>Progress</span>
                                    <span className={cn("font-semibold opacity-80", theme.progressText)}>{completedInCourse} / {totalLessons}</span>
                                </div>
                                <Progress value={progressPercentage} className={cn("h-2", theme.progressBg)} indicatorClassName={theme.progressFg} />
                            </div>
                        ) : !userData && totalLessons > 0 ? (
                           <div className="h-8 flex items-center">
                             <p className="text-muted-foreground text-xs">
                                <Link href="/login" className="underline text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>Log in</Link> to track progress.
                            </p>
                           </div>
                        ) : (
                          <div className="h-8" />
                        )}
                      </div>
                </CardContent>
              </Card>
            </Link>
          )})}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Check back soon for new content!</p>
          </div>
      )}
    </main>
  );
}
