
import Link from "next/link";
import { Button } from "./ui/button";

export default function CallToAction() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="bg-secondary text-secondary-foreground p-8 sm:p-12 md:p-16 rounded-2xl flex flex-col items-center text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
            <span className="text-primary">{'{Discover}'}</span> how you can boost completions, enhance job-readiness, and increase your ROI.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Button asChild>
              <Link href="/contact">Get a Demo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Try for Free</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
