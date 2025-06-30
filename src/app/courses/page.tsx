import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Courses() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold">Courses</h1>
        <p className="text-muted-foreground mt-2">
          Deepen your Salesforce knowledge with our expert-led courses.
        </p>
      </main>
      <Footer />
    </div>
  );
}
