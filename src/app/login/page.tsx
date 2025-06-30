import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Login() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold">Login</h1>
        <p className="text-muted-foreground mt-2">
          Login functionality is temporarily disabled.
        </p>
      </main>
      <Footer />
    </div>
  );
}
