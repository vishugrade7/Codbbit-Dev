
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const coursesRef = collection(db, "courses");
        const q = query(coursesRef, where("isPublished", "==", true), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="block group">
                <Card className="h-full flex flex-col bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
                  <CardHeader className="p-0">
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                       <Image 
                         src={course.thumbnailUrl || 'https://placehold.co/600x400.png'} 
                         alt={course.title}
                         fill
                         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                         className="object-cover transition-transform duration-300 group-hover:scale-110"
                       />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <Badge variant="secondary" className="w-fit mb-2">{course.category}</Badge>
                    <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                    <CardDescription className="flex-grow">{course.description}</CardDescription>
                  </CardContent>
                  <CardFooter>
                    <div className="flex items-center text-sm text-primary font-semibold">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Start Learning</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon for new content!</p>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
