import Header from "@/components/header";
import Footer from "@/components/footer";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Codbbit',
};

export default function Terms() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight">Terms & Conditions</h1>
            <p className="mt-4 text-muted-foreground">
                Last updated on June 22, 2024
            </p>
            <div className="mt-8 space-y-6 text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Use of the Website</h2>
                    <p>We use your profile information to display your data. By continuing to use our site, you consent to us using your profile information.</p>
                    <p>The content on this website is for your general information and use only. It is subject to change without notice.</p>
                    <p>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness, or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors, and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</p>
                    <p>Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It is your responsibility to ensure that any products, services, or information available through this website meet your specific requirements.</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Intellectual Property</h2>
                    <p>This website contains material that is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</p>
                    <p>All trademarks reproduced in this website which are not the property of, or licensed to, the operator are acknowledged on the website.</p>
                    <p>Unauthorized use of this website may give rise to a claim for damages and/or be a criminal offense.</p>
                </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Links to Other Websites</h2>
                    <p>From time to time, this website may include links to other websites. These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s). We have no responsibility for the content of the linked website(s).</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Limitation of Liability</h2>
                    <p>We as a merchant shall be under no liability whatsoever in respect of any loss or damage arising directly or indirectly out of the decline of authorization for any transaction, on account of the cardholder having exceeded the preset limit mutually agreed by us with our acquiring bank from time to time.</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Governing Law</h2>
                    <p>Your use of this website and any dispute arising out of such use of the website is subject to the laws of India or other regulatory authority.</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Contact Information</h2>
                    <p>For any questions or concerns regarding these terms and conditions, please contact us at support@codbbit.com.</p>
                </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
