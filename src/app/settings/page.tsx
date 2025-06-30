
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold font-headline">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and app settings.</p>

          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="theme">Theme</Label>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                      <Label>Salesforce Connection</Label>
                      <p className="text-sm text-muted-foreground">Connect your Salesforce org to run code.</p>
                   </div>
                    <Button variant="outline">Connect</Button>
                 </div>
                 <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                      <Label className="text-destructive">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                   </div>
                    <Button variant="destructive">Delete</Button>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
