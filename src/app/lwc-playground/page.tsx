
'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import MonacoEditor from '@monaco-editor/react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deployLwcComponent } from '@/app/salesforce/actions';

const defaultHtml = `<template>
    <lightning-card title="Codbbit LWC Preview" icon-name="custom:custom14">
        <div class="slds-m-around_medium">
            <p>Hello, {greeting}!</p>
            <lightning-input label="Name" value={greeting} onchange={handleGreetingChange}></lightning-input>
        </div>
    </lightning-card>
</template>`;

const defaultJs = `import { LightningElement, track } from 'lwc';

export default class CodbbitPreview extends LightningElement {
    @track greeting = 'World';

    handleGreetingChange(event) {
        this.greeting = event.target.value;
    }
}`;

const defaultCss = `:host {
    display: block;
}`;


export default function LwcPlaygroundPage() {
    const { resolvedTheme } = useTheme();
    const [htmlCode, setHtmlCode] = useState(defaultHtml);
    const [jsCode, setJsCode] = useState(defaultJs);
    const [cssCode, setCssCode] = useState(defaultCss);
    
    const [isDeploying, setIsDeploying] = useState(false);
    const [results, setResults] = useState("Click 'Deploy' to send the component to your Salesforce org.");
    
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const handleDeploy = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to deploy a component.' });
            return;
        }
        if (!userData?.sfdcAuth?.connected) {
            toast({
                variant: 'destructive',
                title: 'Salesforce Not Connected',
                description: 'Please connect your Salesforce account in settings.',
            });
            router.push('/settings');
            return;
        }

        setIsDeploying(true);
        setResults('Starting deployment...');

        const response = await deployLwcComponent(user.uid, {
            html: htmlCode,
            js: jsCode,
            css: cssCode,
        });

        setResults(response.details || response.message);

        if (response.success) {
            toast({ title: 'Deployment Successful!', description: "The component 'codbbitPreview' is now in your org." });
        } else {
            toast({ variant: 'destructive', title: 'Deployment Failed', description: response.message, duration: 9000 });
        }
        
        setIsDeploying(false);
    };

    return (
        <main className="flex-1 overflow-hidden pt-16 md:pt-0">
            <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex flex-col h-full">
                        <Tabs defaultValue="html" className="flex-1 flex flex-col">
                            <TabsList className="shrink-0 rounded-none border-b bg-transparent justify-start px-2">
                                <TabsTrigger value="html" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-sm">HTML</TabsTrigger>
                                <TabsTrigger value="js" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-sm">JavaScript</TabsTrigger>
                                <TabsTrigger value="css" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none text-sm">CSS</TabsTrigger>
                            </TabsList>
                            <TabsContent value="html" className="flex-1 overflow-auto">
                                <MonacoEditor
                                    height="100%"
                                    language="html"
                                    value={htmlCode}
                                    onChange={(v) => setHtmlCode(v || '')}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize: 14, minimap: { enabled: false } }}
                                />
                            </TabsContent>
                            <TabsContent value="js" className="flex-1 overflow-auto">
                                <MonacoEditor
                                    height="100%"
                                    language="javascript"
                                    value={jsCode}
                                    onChange={(v) => setJsCode(v || '')}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize: 14, minimap: { enabled: false } }}
                                />
                            </TabsContent>
                            <TabsContent value="css" className="flex-1 overflow-auto">
                                 <MonacoEditor
                                    height="100%"
                                    language="css"
                                    value={cssCode}
                                    onChange={(v) => setCssCode(v || '')}
                                    theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                    options={{ fontSize: 14, minimap: { enabled: false } }}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex flex-col h-full">
                         <div className="p-2 border-b flex items-center justify-between">
                            <h3 className="font-semibold">Deployment Log</h3>
                            <Button size="sm" onClick={handleDeploy} disabled={isDeploying}>
                                {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                Deploy
                            </Button>
                         </div>
                        <div className="flex-1 p-4 overflow-auto bg-muted/30">
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{results}</pre>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </main>
    );
}
