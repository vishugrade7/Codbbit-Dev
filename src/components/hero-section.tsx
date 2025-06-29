"use client"

import { Button } from "@/components/ui/button";
import { Rocket, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  
  return (
    <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080801f_1px,transparent_1px),linear-gradient(to_bottom,#8080801f_1px,transparent_1px)] bg-[size:4rem_4rem]">
          <div className="absolute left-0 top-0 right-0 bottom-0 bg-[radial-gradient(circle_500px_at_50%_200px,#29abe233,transparent)]"></div>
      </div>
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-1">
          <div className="flex flex-col justify-center space-y-6 text-center">
            <div className="space-y-4">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-7xl/none text-white">
                Master Salesforce Development
              </h1>
              <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl">
                Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
              </p>
            </div>
            <div className="flex justify-center flex-col gap-4 min-[400px]:flex-row mx-auto">
              <Button size="lg" asChild>
                <Link href="/courses">
                    <Rocket className="mr-2 h-5 w-5" />
                    Get Started
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/leaderboard">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    View Leaderboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
