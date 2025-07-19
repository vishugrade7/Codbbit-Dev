
"use client";

import type { Metadata } from 'next';
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { updateActiveSession } from "@/app/profile/actions";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";


const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const { brandingSettings, loadingBranding, isPro } = useAuth();
  const { theme } = useTheme();

  const logoSrc = useMemo(() => {
    if (!brandingSettings) return "/favicon.ico";
    const isDark = theme === 'dark';
    if (isPro) {
      return (isDark ? brandingSettings.logo_pro_dark : brandingSettings.logo_pro_light) || '/favicon.ico';
    }
    return (isDark ? brandingSettings.logo_dark : brandingSettings.logo_light) || '/favicon.ico';
  }, [brandingSettings, isPro, theme]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    if (!auth) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Firebase is not configured. Please check your environment variables.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
          await sendEmailVerification(user);
          await auth.signOut();
          toast({
              variant: "destructive",
              title: "Email Not Verified",
              description: "Please check your inbox to verify your email. A new verification link has been sent.",
              duration: 9000,
          });
          setIsLoading(false);
          return;
      }

      sessionStorage.setItem('isLoggingIn', 'true');

      // Force a new session to be created to log out other devices.
      const newSessionId = crypto.randomUUID();
      sessionStorage.setItem('appSessionId', newSessionId);
      await updateActiveSession(user.uid, newSessionId);

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      sessionStorage.setItem('showWelcomeTip', 'true');
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email is required.",
      });
      return;
    }
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase is not configured.",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox (and spam folder) for the reset link.",
      });
      setIsResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send reset email. Please ensure the email address is correct and registered.",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };
  
  const handleOpenResetDialog = (open: boolean) => {
    if (open) {
      const emailValue = form.getValues('email');
      if (emailValue) {
        setResetEmail(emailValue);
      }
    }
    setIsResetDialogOpen(open);
  }

  return (
    <>
      <title>Login</title>
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-neutral-900/50 border-neutral-800 text-white">
          <CardHeader className="text-center">
             <div className="flex justify-center mb-4">
              {loadingBranding ? (
                  <Skeleton className="h-10 w-10 rounded-lg bg-neutral-700" />
              ) : (
                  <Link href="/" className="flex items-center gap-2">
                      <Image src={logoSrc} alt="Codbbit logo" width={40} height={40} />
                  </Link>
              )}
             </div>
            <CardTitle className="text-2xl font-headline">Welcome back</CardTitle>
            <CardDescription className="text-neutral-400">
              Don't have an account?{" "}
              <Link href="/signup" className="underline text-primary hover:text-primary/80">
                Sign up
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                          <Input
                            placeholder="user@example.com"
                            {...field}
                            className="pl-10 bg-neutral-800/50 border-neutral-700 focus-visible:ring-primary focus-visible:ring-offset-neutral-900"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Dialog open={isResetDialogOpen} onOpenChange={handleOpenResetDialog}>
                              <DialogTrigger asChild>
                                  <Button
                                      type="button"
                                      variant="link"
                                      className="p-0 h-auto text-sm font-medium text-primary hover:text-primary/80"
                                  >
                                      Forgot password?
                                  </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800 text-white">
                                  <DialogHeader>
                                  <DialogTitle>Reset Password</DialogTitle>
                                  <DialogDescription className="text-neutral-400">
                                      Enter your email address and we'll send you a link to reset your password.
                                  </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="reset-email" className="text-right">
                                      Email
                                      </Label>
                                      <Input
                                      id="reset-email"
                                      value={resetEmail}
                                      onChange={(e) => setResetEmail(e.target.value)}
                                      className="col-span-3 bg-neutral-800/50 border-neutral-700"
                                      placeholder="your@email.com"
                                      />
                                  </div>
                                  </div>
                                  <DialogFooter>
                                  <Button type="button" onClick={handlePasswordReset} disabled={isResettingPassword}>
                                      {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Send Reset Link
                                  </Button>
                                  </DialogFooter>
                              </DialogContent>
                          </Dialog>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                          <Input 
                              type={showPassword ? "text" : "password"} 
                              {...field}
                              className="pl-10 pr-10 bg-neutral-800/50 border-neutral-700 focus-visible:ring-primary focus-visible:ring-offset-neutral-900"
                              placeholder="Your password"
                          />
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-neutral-400 hover:bg-transparent hover:text-white"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full !rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
