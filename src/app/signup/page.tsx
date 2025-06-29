"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { countries } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, AtSign, Building, Globe, Mail, Lock, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  username: z.string().optional(),
  company: z.string().optional(),
  country: z.string({ required_error: "Please select a country." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      username: "",
      company: "",
      email: "",
      password: "",
    },
  });

  const companyValue = form.watch("company");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (companyValue) {
        setCompanyLogo(`https://logo.clearbit.com/${companyValue.toLowerCase().replace(/\s/g, "")}`);
        setLogoError(false);
      } else {
        setCompanyLogo(null);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [companyValue]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      let avatarUrl = '';
      let companyLogoUrl = '';
      const emailDomain = values.email.split('@')[1];
      const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

      // Use Clearbit logo if a company name is given and it's not a common free email provider
      if (values.company && emailDomain && !freeEmailDomains.includes(emailDomain.toLowerCase())) {
        const logoUrl = `https://logo.clearbit.com/${emailDomain}`;
        avatarUrl = logoUrl;
        companyLogoUrl = logoUrl;
      } else {
        const userInitials = values.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
        avatarUrl = `https://placehold.co/128x128.png?text=${userInitials}`;
      }

      // Create a document for the new user in Firestore
      await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: values.fullName,
          username: values.username || values.email?.split('@')[0] || `user${user.uid.substring(0,5)}`,
          company: values.company || '',
          country: values.country,
          points: 0,
          rank: 0,
          avatarUrl: avatarUrl,
          companyLogoUrl: companyLogoUrl,
          achievements: [],
          contributions: [],
          isAdmin: false,
      });

      toast({
        title: "Account created",
        description: "You have successfully created an account.",
      });
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.code === 'auth/email-already-in-use' 
            ? 'This email is already associated with an account.'
            : error.message,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Create an account</CardTitle>
          <CardDescription>
             Already have an account?{" "}
            <Link href="/login" className="underline text-primary hover:text-primary/80">
              Login
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="e.g. Tim Cook" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="e.g. tim_cook" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / College <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                        <div className="relative">
                            {companyLogo && !logoError ? (
                                <Image
                                  src={companyLogo}
                                  alt="Company Logo"
                                  width={20}
                                  height={20}
                                  className="absolute left-3 top-1/2 -translate-y-1/2"
                                  onError={() => setLogoError(true)}
                                />
                            ) : (
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            )}
                            <Input placeholder="e.g. Apple" {...field} className="pl-10" />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                     <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                                <SelectItem key={country.value} value={country.label}>{country.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="user@example.com" {...field} className="pl-10" />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            {...field}
                            className="pl-10 pr-10"
                            placeholder="min 6 chars"
                        />
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent"
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
          <p className="mt-6 px-8 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
