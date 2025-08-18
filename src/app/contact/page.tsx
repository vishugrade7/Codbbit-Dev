"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

export default function Contact() {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Feature not implemented",
      description: "The contact form is not yet connected.",
    });
  }

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground mt-2">
          Have a question or feedback? We'd love to hear from you.
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" defaultValue={user?.displayName || ''}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" defaultValue={user?.email || ''} />
            </div>
          </div>
           <div className="space-y-2">
              <Label htmlFor="inquiry">Reason for Inquiry</Label>
              <Select defaultValue="general">
                  <SelectTrigger id="inquiry">
                      <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="general">General Question</SelectItem>
                      <SelectItem value="sales">Enterprise/Sales</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="feedback">Feedback/Suggestion</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Your message..." />
          </div>
          <Button type="submit">Send Message</Button>
        </form>
      </div>
    </main>
  );
}
