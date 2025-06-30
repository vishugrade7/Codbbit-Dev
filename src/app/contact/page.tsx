import Header from "@/components/header";
import Footer from "@/components/footer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="text-muted-foreground mt-2">
            Have a question or feedback? We'd love to hear from you.
          </p>
          <form className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message..." />
            </div>
            <Button type="submit">Send Message</Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
