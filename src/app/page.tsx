
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Trophy, Code, BookOpen, Award } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import Testimonials from "@/components/testimonials";


export default function Home() {
  return (
    <main>
      <section className="w-full py-20 md:py-32 lg:py-40 overflow-hidden">
        <div className="container px-4 md:px-6 text-center">
          <div style={{ animationDelay: '0.1s' }} className="flex justify-center items-center gap-2 mb-4 opacity-0 animate-fade-in-up">
            <div className="flex -space-x-2 overflow-hidden">
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 1" data-ai-hint="woman face" />
                    <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 2" data-ai-hint="man face" />
                    <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="User 3" data-ai-hint="woman portrait" />
                    <AvatarFallback>U3</AvatarFallback>
                </Avatar>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Trusted by 503+ developers</p>
          </div>
          <div className="max-w-4xl mx-auto space-y-4">
            <p style={{ animationDelay: '0.2s' }} className="text-primary font-semibold opacity-0 animate-fade-in-up">Codbbit – Build Your Code Habit</p>
            <h1 style={{ animationDelay: '0.3s' }} className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline opacity-0 animate-fade-in-up">
              Practice <span className="text-primary">{'{Apex}'}</span> Coding Problems
            </h1>
            <p style={{ animationDelay: '0.4s' }} className="text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto opacity-0 animate-fade-in-up">
              Join thousands of developers building skills, cracking interviews, and landing internships. Kickstart your coding journey—no boring lectures, just real practice!
            </p>
          </div>
          <div style={{ animationDelay: '0.5s' }} className="mt-8 flex flex-col sm:flex-row justify-center gap-4 opacity-0 animate-fade-in-up">
            <Button asChild size="lg">
              <Link href="/apex-problems">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/leaderboard">
                View Leaderboard <Trophy className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      <section className="w-full py-20 md:py-32">
        <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                    {'{Sharpen}'} Your Salesforce Skills
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <Code className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Practice Problems</h3>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-muted-foreground">
                            Challenge yourself with exercises crafted to strengthen different coding techniques and master Apex, SOQL, and LWC.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="ghost" asChild>
                            <Link href="/apex-problems">Start Solving <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                         <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Interactive Courses</h3>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-muted-foreground">
                           Solve Apex & LWC problems right in the browser and use test cases (TDD) to check your work as you progress.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button variant="ghost" asChild>
                            <Link href="/courses">Explore Courses <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                         <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <Award className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Earn Ranks and Honor</h3>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-muted-foreground">
                          As you complete higher-ranked problems, you level up your profile and push your software development skills to their highest potential.
                        </p>
                    </CardContent>
                    <CardFooter>
                         <Button variant="ghost" asChild>
                            <Link href="/leaderboard">View Leaderboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
      </section>

      <Testimonials />
    </main>
  );
}
