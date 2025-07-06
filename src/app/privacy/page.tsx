import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Codbbit',
};

export default function Privacy() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground">
                Last Updated: June 2024
            </p>
            <div className="mt-8 space-y-6 text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us when you create an account, such as your name, email address, company, and country. We also collect information about your activity on our Service, such as problems solved, points earned, and code submissions.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to operate, maintain, and provide you with the features and functionality of the Service. This includes displaying your profile information (like your name, username, points, and achievements) on public leaderboards and your public profile page.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">3. Information Sharing</h2>
                    <p>
                       Your profile information, including your name, username, and activity, is public. We do not share your email address with other users unless you explicitly choose to make it public in your profile settings. We do not sell your personal information to third parties.
                    </p>
                </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">4. Security</h2>
                    <p>
                        We use commercially reasonable safeguards to help keep the information collected through the Service secure and take reasonable steps to verify your identity before granting you access to your account.
                    </p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at support@codbbit.com.
                    </p>
                </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
