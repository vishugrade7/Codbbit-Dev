import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { courses } from "@/lib/data";

export default function CoursesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl text-primary">Courses</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Choose a topic to start solving problems and earning points.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <course.icon className="h-10 w-10 text-primary" />
                    <CardTitle className="font-headline">{course.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{course.description}</CardDescription>
                  <Link href={course.href} className="mt-4 inline-flex items-center font-semibold text-primary">
                    Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
