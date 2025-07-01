import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Unlock your full potential with our premium features. Get unlimited access to all problems, advanced analytics, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>For individuals starting their Salesforce journey.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access to free problems</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Basic profile stats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Community support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Your Current Plan</Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="border-primary shadow-lg relative">
             <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                 <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">Most Popular</div>
             </div>
            <CardHeader className="pt-8">
              <CardTitle>Pro</CardTitle>
              <CardDescription>For professionals aiming to master their skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">$12<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Free</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access to all premium problems</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced analytics & insights</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Upgrade to Pro</Button>
            </CardFooter>
          </Card>

          {/* Enterprise Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For teams and organizations seeking success.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-4xl font-bold">Contact Us</div>
               <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Pro</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Team management & dashboards</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Custom problem sets</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Dedicated account manager</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Contact Sales</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
