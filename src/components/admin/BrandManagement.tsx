
"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { getBrandingSettings, uploadBrandingImage, type LogoType } from "@/app/upload-problem/actions";
import type { BrandingSettings } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud } from "lucide-react";

export function BrandManagementView() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<BrandingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<{ [key in LogoType]?: boolean }>({});
    const fileInputRefs = {
        logo_light: useRef<HTMLInputElement>(null),
        logo_dark: useRef<HTMLInputElement>(null),
        logo_pro_light: useRef<HTMLInputElement>(null),
        logo_pro_dark: useRef<HTMLInputElement>(null),
        favicon: useRef<HTMLInputElement>(null),
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const result = await getBrandingSettings();
            if (result.success) {
                setSettings(result.settings);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [toast]);

    const handleFileChange = async (logoType: LogoType, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
            return;
        }

        setUploading(prev => ({ ...prev, [logoType]: true }));

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            const result = await uploadBrandingImage(logoType, dataUrl);
            if (result.success && result.url) {
                toast({ title: 'Upload Successful!', description: `${logoType} has been updated.` });
                setSettings(prev => ({ ...(prev || {}), [logoType]: result.url as any }));
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setUploading(prev => ({ ...prev, [logoType]: false }));
            if (fileInputRefs[logoType].current) {
                fileInputRefs[logoType].current.value = "";
            }
        };
        reader.onerror = () => {
            setUploading(prev => ({ ...prev, [logoType]: false }));
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
        };
    };

    const LogoUploader = ({ logoType, label }: { logoType: LogoType; label: string }) => {
        const currentLogoUrl = settings?.[logoType];
        const isUploading = uploading[logoType];

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <div className="w-full h-24 bg-muted/50 rounded-md flex items-center justify-center p-2">
                        {currentLogoUrl ? (
                            <Image src={currentLogoUrl} alt={label} width={96} height={96} className="object-contain h-full" />
                        ) : (
                            <span className="text-sm text-muted-foreground">No Logo</span>
                        )}
                    </div>
                     <input
                        type="file"
                        ref={fileInputRefs[logoType]}
                        onChange={(e) => handleFileChange(logoType, e)}
                        className="hidden"
                        accept="image/*,.svg"
                        disabled={isUploading}
                    />
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => fileInputRefs[logoType].current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {currentLogoUrl ? 'Change' : 'Upload'}
                    </Button>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Brand Management</CardTitle>
                    <CardDescription>Upload and manage your site logos and favicon.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Brand Management</CardTitle>
                <CardDescription>Upload and manage your site logos and favicon. Changes may take a few moments to appear due to caching.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <LogoUploader logoType="logo_light" label="Standard Logo (Light)" />
                    <LogoUploader logoType="logo_dark" label="Standard Logo (Dark)" />
                    <LogoUploader logoType="logo_pro_light" label="Pro Logo (Light)" />
                    <LogoUploader logoType="logo_pro_dark" label="Pro Logo (Dark)" />
                    <LogoUploader logoType="favicon" label="Favicon" />
                </div>
            </CardContent>
        </Card>
    );
}
