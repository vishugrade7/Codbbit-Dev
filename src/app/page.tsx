'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, BarChart, Code, BookOpenCheck, Trophy, Play } from "lucide-react";
import Testimonials from "@/components/testimonials";

const features = [
  {
    icon: Code,
    title: "Practice Problems",
    description: "Sharpen your skills with a vast library of challenges in Apex, SOQL, and LWC.",
    delay: "0.4s",
  },
  {
    icon: BookOpenCheck,
    title: "Interactive Courses",
    description: "Learn by doing with our hands-on courses designed by Salesforce experts.",
    delay: "0.5s",
  },
  {
    icon: Trophy,
    title: "Competitive Leaderboard",
    description: "Compete with developers worldwide and see how you rank.",
    delay: "0.6s",
  },
  {
    icon: Play,
    title: "LWC Playground",
    description: "Instantly build, test, and deploy Lightning Web Components to your org.",
    delay: "0.7s",
  },
];

export default function Home() {
  return (
    <>
      <section className="w-full pt-24 pb-12 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Master Salesforce Development
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Button asChild size="lg">
                  <Link href="/apex-problems">
                    <Rocket className="mr-2 h-5 w-5" />
                    Get Started
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/leaderboard">
                    <BarChart className="mr-2 h-5 w-5" />
                    View Leaderboard
                  </Link>
                </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full pb-12 md:pb-24 lg:pb-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="animate-fade-in-up" style={{ animationDelay: feature.delay }}>
                 <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="p-3 rounded-md bg-primary/10 w-fit mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
    </>
  );
}
