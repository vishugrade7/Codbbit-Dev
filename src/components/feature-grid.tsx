
import { Code2, ThumbsUp, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export default function FeatureGrid() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:gap-8">
          {/* Top Card */}
          <Card className="lg:grid lg:grid-cols-2 lg:gap-8 overflow-hidden">
            <CardContent className="p-6 md:p-12 flex flex-col justify-center">
              <div className="inline-block rounded-lg bg-primary/10 p-3 text-primary mb-4 w-fit">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">Sharpen Your Salesforce Skills</h2>
              <p className="mt-4 text-muted-foreground">
                Challenge yourself on small Salesforce coding exercises. Each problem is crafted by the community to help you
                strengthen different coding techniques. Master Apex, SOQL, and LWC, or quickly pick up any of the
                supported technologies.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href="/apex-problems">
                    Explore Problems
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
            <div className="p-6 md:p-8 flex items-center justify-center bg-muted/30">
                 
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Bottom Left Card */}
            <Card className="flex flex-col">
              <CardContent className="p-6 md:p-12 flex-1 flex flex-col">
                <div className="inline-block rounded-lg bg-primary/10 p-3 text-primary mb-4 w-fit">
                  <ThumbsUp className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold">Get Instant Feedback</h3>
                <p className="mt-4 text-muted-foreground flex-1">
                  Solve problems with your coding style right in the browser and use test cases (TDD) to check it as
                  you progress. Retrain with new, creative, and optimized approaches. Find all of the bugs in your
                  programming practice.
                </p>
                 <div className="mt-6 -mx-6 -mb-6 md:-mx-12 md:-mb-12">
                     
                </div>
              </CardContent>
            </Card>

            {/* Bottom Right Card */}
            <Card className="flex flex-col">
              <CardContent className="p-6 md:p-12 flex-1 flex flex-col">
                <div className="inline-block rounded-lg bg-primary/10 p-3 text-primary mb-4 w-fit">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold">Earn Ranks and Honor</h3>
                <p className="mt-4 text-muted-foreground flex-1">
                  Code challenges are ranked from beginner to expert level. As you complete higher-ranked problems, you
                  level up your profile and push your software development skills to your highest potential.
                </p>
                 <div className="mt-6 -mx-6 -mb-6 md:-mx-12 md:-mb-12">
                     
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
