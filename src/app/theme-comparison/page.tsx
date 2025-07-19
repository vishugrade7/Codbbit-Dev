
import type { Metadata } from 'next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Theme Comparison | Codbbit',
  description: 'A detailed comparison of light and dark theme properties and their impact on user experience, readability, and battery life.',
};

const themeComparisonData = [
  { feature: 'Background Color', light: 'Light (e.g., white, off-white)', dark: 'Dark (e.g., black, deep gray)' },
  { feature: 'Text Color', light: 'Dark (e.g., black, dark gray)', dark: 'Light (e.g., white, light gray)' },
  { feature: 'Best Use Environment', light: 'Well-lit environments, daytime', dark: 'Low-light environments, nighttime' },
  { feature: 'Eye Strain', light: 'Can cause strain in low light', dark: 'Reduces strain in low light, potentially increases in bright light' },
  { feature: 'Battery Life (OLED)', light: 'Higher consumption', dark: 'Lower consumption (significant savings)' },
  { feature: 'Blue Light Emission', light: 'Higher', dark: 'Lower' },
  { feature: 'Readability', light: 'Generally better for long-form text in bright light', dark: 'Can be challenging for long-form text, especially in bright light' },
  { feature: 'Aesthetics', light: 'Clean, classic, professional', dark: 'Sleek, modern, sophisticated, immersive' },
  { feature: 'Content Emphasis', light: 'Good for text, can make visuals blend', dark: 'Makes visuals "pop" more, highlights media' },
];

export default function ThemeComparisonPage() {
  return (
    <main className="flex-1 container py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold font-headline text-center">Light vs. Dark Theme</h1>
        <p className="text-muted-foreground mt-4 text-center">
          A side-by-side comparison of the properties and use cases for different UI themes.
        </p>
        
        <Card className="mt-12">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="font-semibold">Feature</TableHead>
                            <TableHead>
                                <div className="flex items-center gap-2">
                                    <Sun className="h-5 w-5 text-orange-500" />
                                    <span className="font-semibold">Light Theme</span>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center gap-2">
                                    <Moon className="h-5 w-5 text-blue-400" />
                                    <span className="font-semibold">Dark Theme</span>
                                </div>
                            </TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {themeComparisonData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{row.feature}</TableCell>
                                <TableCell>{row.light}</TableCell>
                                <TableCell>{row.dark}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
