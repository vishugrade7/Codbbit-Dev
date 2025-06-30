import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Signup() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold">Sign Up</h1>
        <p className="text-muted-foreground mt-2">
          Sign up functionality is temporarily disabled.
        </p>
      </main>
      <Footer />
    </div>
  );
}
