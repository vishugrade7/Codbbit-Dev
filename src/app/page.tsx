import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Rocket, BarChart, Database, Code, Trophy } from "lucide-react";
import FeaturedContent from "@/components/featured-content";
import Testimonials from "@/components/testimonials";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
                Master Salesforce Development
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Build, test, and deploy Salesforce solutions faster with our comprehensive platform for SOQL queries, Apex code, and Lightning Web Components.
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 px-8 sm:px-0">
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
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-card/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>SOQL Mastery</CardTitle>
                  <CardDescription>
                    Practice complex queries with real-time validation and feedback.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Code className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Apex Development</CardTitle>
                  <CardDescription>
                    Write and execute Apex code with instant testing on live Salesforce orgs.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card">
                <CardHeader className="items-center text-center">
                   <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Competitive Learning</CardTitle>
                  <CardDescription>
                    Compete with developers worldwide and track your progress.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Build faster, future-proof your org</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  You can customize Salesforce with a flexible UI framework, advanced theming options, and robust tools for designers and developers. SLDS 2 paves the way to dark mode and sets the foundation for future agentic capabilities.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12 mt-12">
              <Card>
                <CardContent className="p-0">
                  <Image
                    src="https://placehold.co/600x400.png"
                    data-ai-hint="orange abstract"
                    alt="Admins"
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover"
                  />
                  <div className="p-6 space-y-2">
                    <h3 className="text-xl font-bold">Admins</h3>
                    <p className="text-muted-foreground">
                      Adopt Salesforce Cosmos to get the new design and SLDS 2 features.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Image
                    src="https://placehold.co/600x400.png"
                    data-ai-hint="red abstract"
                    alt="Designers"
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover"
                  />
                  <div className="p-6 space-y-2">
                    <h3 className="text-xl font-bold">Designers</h3>
                    <p className="text-muted-foreground">
                      Connect to essential components and tools to create great experiences.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Image
                    src="https://placehold.co/600x400.png"
                    data-ai-hint="blue abstract"
                    alt="Developers"
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover"
                  />
                  <div className="p-6 space-y-2">
                    <h3 className="text-xl font-bold">Developers</h3>
                    <p className="text-muted-foreground">
                      Access the framework for building consistent and scalable interfaces.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <FeaturedContent />

        <Testimonials />

      </main>
      <Footer />
    </div>
  );
}
