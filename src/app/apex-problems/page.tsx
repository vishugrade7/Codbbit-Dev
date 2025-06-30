import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";

const categories = [
  { name: "List", problems: 1, href: "#" },
  { name: "Map", problems: 0, href: "#" },
  { name: "String", problems: 0, href: "#" },
  { name: "Trigger", problems: 0, href: "#" },
];

export default function ApexProblems() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container flex flex-col items-center justify-center py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Apex Problems
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Hone your skills by solving a curated list of problems.
          </p>
        </div>

        <div className="relative w-full max-w-md mx-auto mt-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search categories..."
            className="pl-10"
          />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {categories.map((category) => (
            <Link key={category.name} href={category.href} className="group">
              <Card className="bg-primary text-primary-foreground h-full flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out group-hover:-translate-y-1.5">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {category.name}
                </CardTitle>
                <div className="flex justify-between items-center mt-8">
                  <p className="text-sm font-medium">
                    {category.problems} Problem{category.problems !== 1 ? 's' : ''}
                  </p>
                  <ArrowRight className="h-6 w-6 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
