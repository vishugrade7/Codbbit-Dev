
import { Code2, BookOpenCheck, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export default function FeatureGrid() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {'{Sharpen}'} Your Salesforce Skills
            </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <Card className="flex flex-col bg-background">
              <CardContent className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="inline-block rounded-lg bg-primary p-3 text-primary-foreground mb-4 w-fit">
                  <Code2 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold">Practice Problems</h3>
                <p className="mt-4 text-muted-foreground flex-1">
                  Challenge yourself with exercises crafted to strengthen different coding techniques and master Apex, SOQL, and LWC.
                </p>
                 <div className="mt-6">
                    <Button asChild variant="outline">
                    <Link href="/apex-problems">
                        Start Solving
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col bg-background">
              <CardContent className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="inline-block rounded-lg bg-secondary p-3 text-secondary-foreground mb-4 w-fit">
                  <BookOpenCheck className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold">Interactive Courses</h3>
                <p className="mt-4 text-muted-foreground flex-1">
                 Solve Apex & LWC problems right in the browser and use test cases (TDD) to check your work as you progress.
                </p>
                 <div className="mt-6">
                    <Button asChild variant="outline">
                    <Link href="/courses">
                        Explore Courses
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col bg-background">
              <CardContent className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="inline-block rounded-lg bg-secondary p-3 text-secondary-foreground mb-4 w-fit">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold">Earn Ranks and Honor</h3>
                <p className="mt-4 text-muted-foreground flex-1">
                  As you complete higher-ranked problems, you
                  level up your profile and push your software development skills to their highest potential.
                </p>
                 <div className="mt-6">
                    <Button asChild variant="outline">
                    <Link href="/leaderboard">
                        View Leaderboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </section>
  );
}
