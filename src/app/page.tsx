import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Welcome to your New App
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
                This is a starter template. Start editing{' '}
                <code className="font-mono bg-muted p-1 rounded-sm">src/app/page.tsx</code>{' '}
                to see your changes.
            </p>
            <Button asChild>
                <Link href="https://firebase.google.com/docs/studio" target="_blank">
                    Read the Docs
                </Link>
            </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
