
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";
import { Loader2, User as UserIcon, Building, Link as LinkIcon, Github, Linkedin, Twitter, Phone, CheckCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { verifyPhoneNumber } from "../app/profile/actions";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  about: z.string().max(200, "About text must be 200 characters or less.").optional(),
  isEmailPublic: z.boolean().optional(),
  company: z.string().optional(),
  companyLogoUrl: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  trailheadUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
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

type EditProfileModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User;
};

export default function EditProfileModal({ isOpen, onOpenChange, user }: EditProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || "",
      about: user.about || "",
      isEmailPublic: user.isEmailPublic || false,
      company: user.company || "",
      companyLogoUrl: user.companyLogoUrl || "",
      phone: user.phone || "",
      trailheadUrl: user.trailheadUrl || "",
      githubUrl: user.githubUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      twitterUrl: user.twitterUrl || "",
    },
  });

  const [companyLogo, setCompanyLogo] = useState<string | null>(user.companyLogoUrl || null);
  const [logoError, setLogoError] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(user.company || null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);


  const companyValue = form.watch("company");
  const phoneValue = form.watch("phone");
  
  useEffect(() => {
    if (!isOpen) {
        // Reset phone verification state when modal closes
        setIsVerifyingPhone(false);
        setOtpSent(false);
        setOtpCode("");
        setConfirmationResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (companyValue !== selectedCompanyName) {
      setCompanyLogo(null);
      setSelectedCompanyName(null);
    }
    
    if (!companyValue || companyValue.trim().length < 2 || companyValue === selectedCompanyName) {
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
  }, [companyValue, selectedCompanyName]);

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    form.setValue('company', suggestion.name, { shouldValidate: true });
    setCompanyLogo(suggestion.logo);
    setSelectedCompanyName(suggestion.name);
    setLogoError(false);
    setIsSuggestionsOpen(false);
    setSuggestions([]);
  };

  const handleResendVerification = async () => {
    if (!currentUser) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder) to verify your email.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send verification email. Please try again later.",
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const setupRecaptcha = () => {
      if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
  }
  
  async function handlePhoneVerify() {
    if (!currentUser || !phoneValue) return;
    setIsVerifyingPhone(true);
    try {
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, phoneValue, appVerifier);
        setConfirmationResult(result);
        setOtpSent(true);
        toast({ title: 'OTP Sent', description: 'Please enter the code you received via SMS.' });
    } catch (error: any) {
        console.error("Error sending OTP", error);
        toast({ variant: 'destructive', title: 'Failed to send OTP', description: error.message });
        setIsVerifyingPhone(false);
    }
  }

  async function handleConfirmOtp() {
      if (!confirmationResult || !otpCode) return;
      try {
          await confirmationResult.confirm(otpCode);
          // Now update firestore
          const verifyResult = await verifyPhoneNumber(currentUser!.uid);
          if (verifyResult.success) {
            toast({ title: "Phone Verified!", description: "Your phone number has been successfully verified." });
            setOtpSent(false); // Go back to normal view
          } else {
             toast({ variant: 'destructive', title: 'Verification Failed', description: verifyResult.error });
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Invalid Code', description: 'The OTP you entered was incorrect. Please try again.' });
      } finally {
          setIsVerifyingPhone(false);
      }
  }

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name: values.name,
        about: values.about,
        isEmailPublic: values.isEmailPublic,
        company: values.company,
        companyLogoUrl: companyLogo || '',
        phone: values.phone,
        trailheadUrl: values.trailheadUrl,
        githubUrl: values.githubUrl,
        linkedinUrl: values.linkedinUrl,
        twitterUrl: values.twitterUrl,
      });
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-full sm:h-auto flex flex-col">
        <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
                Make changes to your profile here. Click save when you're done.
            </DialogDescription>
        </DialogHeader>
        <div id="recaptcha-container"></div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {currentUser && !currentUser.emailVerified && (
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
                    Your email is not verified. 
                    <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-800 dark:text-yellow-300" onClick={handleResendVerification} disabled={isSendingVerification}>
                      {isSendingVerification ? <Loader2 className="h-4 w-4 animate-spin"/> : "Resend verification email."}
                    </Button>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Your full name" {...field} className="pl-10" />
                        </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About</FormLabel>
                        <Textarea placeholder="Tell us a little about yourself" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isEmailPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Show Email</FormLabel>
                        <FormDescription>
                          Allow others to see your email on your public profile.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      {otpSent ? (
                        <div className="flex items-center gap-2">
                           <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
                           <Button type="button" onClick={handleConfirmOtp} disabled={isVerifyingPhone}>
                                {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Confirm'}
                           </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="+1 (555) 123-4567" {...field} className="pl-10" />
                            </div>
                            {phoneValue && !user.phoneVerified && (
                                <Button type="button" variant="outline" size="sm" onClick={handlePhoneVerify} disabled={isVerifyingPhone}>
                                    {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Verify'}
                                </Button>
                            )}
                            {user.phoneVerified && (
                                <div className="flex items-center gap-1.5 text-sm text-green-500 font-medium">
                                    <CheckCircle className="h-4 w-4" /> Verified
                                </div>
                            )}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                        <div className="relative">
                          <FormControl>
                              <div className="relative">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {companyLogo && !logoError ? (
                                        <Image
                                          src={companyLogo}
                                          alt="Company Logo"
                                          width={20}
                                          height={20}
                                          onError={() => setLogoError(true)}
                                        />
                                    ) : (
                                        <Building className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <Input 
                                    placeholder="Your company or college" 
                                    {...field} 
                                    className="pl-10"
                                    autoComplete="off"
                                    onFocus={() => companyValue && suggestions.length > 0 && setIsSuggestionsOpen(true)}
                                    onBlur={() => setIsSuggestionsOpen(false)}
                                  />
                              </div>
                          </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trailheadUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailhead URL</FormLabel>
                      <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="https://trailblazer.me/id/..." {...field} className="pl-10" />
                        </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub URL</FormLabel>
                      <div className="relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="https://github.com/..." {...field} className="pl-10" />
                        </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="https://linkedin.com/in/..." {...field} className="pl-10" />
                        </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twitterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter / X URL</FormLabel>
                      <div className="relative">
                            <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="https://x.com/..." {...field} className="pl-10" />
                        </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
