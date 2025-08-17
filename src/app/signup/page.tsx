
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { countries } from "@/lib/countries";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building, Eye, EyeOff } from "lucide-react";
import AuthImage from "@/components/auth-image";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  company: z.string().optional(),
  country: z.string({ required_error: "Please select a country." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type CompanySuggestion = {
  name: string;
  domain: string;
  logo: string;
};

const CompanySuggestionItem = ({ suggestion, onClick }: { suggestion: CompanySuggestion, onClick: (suggestion: CompanySuggestion) => void }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <li>
      <button
        type="button"
        className="flex items-center w-full text-left px-3 py-2.5 cursor-pointer hover:bg-accent"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick(suggestion);
        }}
      >
        {logoError ? (
          <div className="h-[24px] w-[24px] mr-3 rounded-sm bg-muted flex items-center justify-center shrink-0">
            <Building className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <Image
            src={suggestion.logo}
            alt={`${suggestion.name} logo`}
            width={24}
            height={24}
            className="mr-3 rounded-sm shrink-0"
            onError={() => setLogoError(true)}
          />
        )}
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-foreground truncate">{suggestion.name}</p>
        </div>
        <p className="text-sm text-muted-foreground ml-4 shrink-0">{suggestion.domain}</p>
      </button>
    </li>
  );
};

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      company: "",
      email: "",
      password: "",
    },
  });

  const companyValue = form.watch("company");

  useEffect(() => {
    if (!companyValue || companyValue.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyValue)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data) && data.length > 0) {
            setSuggestions(data);
            setIsSuggestionsOpen(true);
          } else {
            setSuggestions([]);
            setIsSuggestionsOpen(false);
          }
        } else {
          setSuggestions([]);
          setIsSuggestionsOpen(false);
        }
      } catch (error) {
        console.error("Failed to fetch company suggestions:", error);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [companyValue]);

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    form.setValue('company', suggestion.name, { shouldValidate: true });
    setIsSuggestionsOpen(false);
    setSuggestions([]);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    sessionStorage.setItem('isLoggingIn', 'true');

    if (!auth || !db) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Firebase is not configured. Please check your environment variables.",
        });
        setIsLoading(false);
        sessionStorage.removeItem('isLoggingIn');
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userInitials = values.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'U';
      const avatarUrl = `https://placehold.co/128x128.png?text=${userInitials}`;
      
      const companyLogoRes = await fetch(`https://logo.clearbit.com/${values.company?.toLowerCase().replace(/ /g, '')}.com`);
      const companyLogoUrl = companyLogoRes.ok ? `https://logo.clearbit.com/${values.company?.toLowerCase().replace(/ /g, '')}.com` : '';


      const sessionId = crypto.randomUUID();
      sessionStorage.setItem('appSessionId', sessionId);

      const isAdmin = values.email === 'gradevishu@gmail.com';

      await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: values.fullName,
          username: values.email?.split('@')[0] || `user${user.uid.substring(0,5)}`,
          company: values.company || '',
          country: values.country,
          points: 0,
          rank: 9999,
          avatarUrl: avatarUrl,
          companyLogoUrl: companyLogoUrl,
          achievements: {},
          contributions: [],
          isAdmin: isAdmin,
          isEmailPublic: false,
          solvedProblems: {},
          dsaStats: { Easy: 0, Medium: 0, Hard: 0 },
          categoryPoints: {},
          submissionHeatmap: {},
          currentStreak: 0,
          maxStreak: 0,
          lastSolvedDate: "",
          starredProblems: [],
          activeSessionId: sessionId,
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
            : 'An unexpected error occurred. Please try again.',
      });
      sessionStorage.removeItem('isLoggingIn');
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to get started for free.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Tim Cook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / College <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                          <Input 
                            placeholder="e.g. Apple" 
                            {...field}
                            autoComplete="off"
                            onFocus={() => companyValue && suggestions.length > 0 && setIsSuggestionsOpen(true)}
                            onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 150)}
                          />
                           {isSuggestionsOpen && suggestions.length > 0 && (
                            <Card className="absolute z-10 w-full mt-1 bg-popover border-border shadow-lg">
                              <CardContent className="p-0">
                                <ul className="flex flex-col">
                                  {suggestions.map((suggestion) => (
                                    <CompanySuggestionItem key={suggestion.domain} suggestion={suggestion} onClick={handleSuggestionClick} />
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                                <SelectItem key={country.value} value={country.label}>{country.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="user@example.com" {...field} />
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
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            {...field}
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
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline text-primary hover:text-primary/80">
              Login
            </Link>
          </div>
        </div>
      </div>
      <AuthImage />
    </div>
  );
}
