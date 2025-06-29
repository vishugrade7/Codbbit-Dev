import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Code, Trophy } from "lucide-react";

const features = [
  {
    icon: Database,
    title: "SOQL Mastery",
    description: "Practice complex queries with real-time validation and feedback."
  },
  {
    icon: Code,
    title: "Apex Development",
    description: "Write and execute Apex code with instant testing on live Salesforce orgs."
  },
  {
    icon: Trophy,
    title: "Competitive Learning",
    description: "Compete with developers worldwide and track your progress."
  }
];

export default function FeatureSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card border-border/50 text-center p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg">
              <CardHeader className="items-center">
                <div className="p-4 bg-primary/10 rounded-full inline-block">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
