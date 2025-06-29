
"use client";

import { useState } from 'react';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-sql';
import { Button } from './ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setHasCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  // PrismJS sometimes adds a trailing newline, which we don't want to display.
  const trimmedCode = code.trimEnd();

  return (
    <div className="relative group">
      <pre className="!bg-[#0d1117] !p-4 !pt-10 !rounded-md !text-sm !font-code !text-gray-300 overflow-x-auto">
        <code
          className="language-sql"
          dangerouslySetInnerHTML={{ __html: highlight(trimmedCode, languages.sql, 'sql') }}
        />
      </pre>
      <div className="absolute top-0 left-0 right-0 h-8 bg-[#0d1117] rounded-t-md flex items-center px-4">
        <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500"></span>
            <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-1.5 right-2 h-7 text-gray-400 hover:bg-white/10 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyToClipboard}
      >
        {hasCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {hasCopied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}
