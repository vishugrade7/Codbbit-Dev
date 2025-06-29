"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/app/profile/actions";
import { countries } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "./ui/card";
import { Loader2, User as UserIcon, AtSign, Building, Globe, Linkedin, Twitter, Github, Link as LinkIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  company: z.string().optional(),
  country: z.string().optional(),
  trailheadUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  linkedinUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  twitterUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  githubUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

interface EditProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

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

export default function EditProfileModal({ isOpen, onOpenChange, user }: EditProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(user.companyLogoUrl || null);
  const [logoError, setLogoError] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(user.company || null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      company: user.company || "",
      country: user.country || "",
      trailheadUrl: user.trailheadUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      twitterUrl: user.twitterUrl || "",
      githubUrl: user.githubUrl || "",
    },
  });

  const companyValue = form.watch("company");

  useEffect(() => {
    form.reset({
      name: user.name || "",
      username: user.username || "",
      company: user.company || "",
      country: user.country || "",
      trailheadUrl: user.trailheadUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      twitterUrl: user.twitterUrl || "",
      githubUrl: user.githubUrl || "",
    });
    setCompanyLogo(user.companyLogoUrl || null);
    setSelectedCompanyName(user.company || null);
  }, [user, form]);

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
          setSuggestions(Array.isArray(data) ? data : []);
          setIsSuggestionsOpen(Array.isArray(data) && data.length > 0);
        } else {
          setSuggestions([]);
          setIsSuggestionsOpen(false);
        }
      } catch (error) {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [companyValue, selectedCompanyName]);

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    form.setValue('company', suggestion.name, { shouldValidate: true });
    setCompanyLogo(suggestion.logo);
    setSelectedCompanyName(suggestion.name);
    setLogoError(false);
    setIsSuggestionsOpen(false);
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const result = await updateUserProfile(user.uid, { ...values, companyLogoUrl: companyLogo || '' });
    setIsLoading(false);

    if (result.success) {
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "Update failed", description: result.error });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                      <FormLabel>Username</FormLabel>
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
                    <FormLabel>Company / College</FormLabel>
                    <div className="relative">
                      <FormControl>
                          <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {companyLogo && !logoError ? (
                                    <Image src={companyLogo} alt="Company Logo" width={20} height={20} onError={() => setLogoError(true)} />
                                ) : (
                                    <Building className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <Input placeholder="e.g. Apple" {...field} className="pl-10" autoComplete="off" onFocus={() => companyValue && suggestions.length > 0 && setIsSuggestionsOpen(true)} onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 150)} />
                          </div>
                      </FormControl>
                      {isSuggestionsOpen && suggestions.length > 0 && (
                        <Card className="absolute z-10 w-full mt-1 bg-popover border-border shadow-lg">
                          <CardContent className="p-0 max-h-48 overflow-y-auto">
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                     <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                        <Select onValueChange={field.onChange} value={field.value}>
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
              <div className="space-y-2 pt-4">
                <h4 className="text-sm font-medium">Social Links</h4>
                <FormField control={form.control} name="trailheadUrl" render={({ field }) => (<FormItem><FormControl><div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Trailhead URL" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="githubUrl" render={({ field }) => (<FormItem><FormControl><div className="relative"><Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="GitHub URL" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (<FormItem><FormControl><div className="relative"><Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="LinkedIn URL" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="twitterUrl" render={({ field }) => (<FormItem><FormControl><div className="relative"><Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Twitter / X URL" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
              </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
