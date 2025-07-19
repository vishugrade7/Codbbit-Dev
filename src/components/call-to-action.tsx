
import Link from "next/link";
import { Button } from "./ui/button";

export default function CallToAction() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-black">
      <div className="container px-4 md:px-6">
        <div className="bg-primary text-black p-8 sm:p-12 md:p-16 rounded-2xl flex flex-col items-center text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
            <span className="text-white">{'{Discover}'}</span> how you can boost completions, enhance job-readiness, and increase your ROI.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Button asChild variant="outline" className="bg-white text-black hover:bg-neutral-200 border-transparent">
              <Link href="/contact">Get a Demo</Link>
            </Button>
            <Button asChild variant="secondary" className="bg-black text-white hover:bg-neutral-800">
              <Link href="/signup">Try for Free</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
