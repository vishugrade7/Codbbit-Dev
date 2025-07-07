
"use client";
import type { Metadata } from 'next';
import ApexProblemsView from "@/components/apex-problems-view";

// This will be treated as static metadata
export const metadata: Metadata = {
  title: 'Apex Practice Problems | Codbbit',
  description: 'Boost your Salesforce developer skills with our collection of Apex practice problems. Solve challenges in SOQL, Triggers, and more.',
};

export default function ApexProblemsPage() {
    return <ApexProblemsView />;
}
