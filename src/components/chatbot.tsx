"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { chat } from "@/ai/flows/chatbot-flow";
import { useAuth } from "@/context/AuthContext";

type Message = {
  text: string;
  sender: "user" | "bot";
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Got any questions? I'm happy to help." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { userData } = useAuth();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
    }
  }, [messages, isOpen]);
  
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
        const result = await chat({ message: input });
        const botMessage: Message = { sender: "bot", text: result.response };
        setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
        console.error("Chatbot error:", error);
        const errorMessage: Message = { sender: "bot", text: "Sorry, I'm having trouble connecting right now." };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Chat Window */}
      <div className={cn(
        "transition-all duration-300 ease-in-out origin-bottom-right",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
      )}>
        <Card className="w-80 h-[28rem] sm:w-96 sm:h-[32rem] flex flex-col shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3 p-4 bg-gradient-to-r from-primary to-blue-500 text-primary-foreground">
             <Avatar>
                <AvatarFallback className="bg-white text-primary font-bold">D</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold text-base">Decodeforce</p>
                <p className="text-xs opacity-80">We'll return tomorrow at 12:30 AM</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-y-auto space-y-4 bg-background">
             {messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-2.5", message.sender === 'user' && 'justify-end')}>
                    {message.sender === 'bot' && (
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground font-bold">D</AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn(
                        "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                        message.sender === 'user' ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                    )}>
                        {message.text}
                    </div>
                     {message.sender === 'user' && userData && (
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={userData.avatarUrl} alt={userData.name} />
                            <AvatarFallback>{getInitials(userData.name)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}
             {isLoading && (
                 <div className="flex items-start gap-2.5">
                    <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold">D</AvatarFallback>
                    </Avatar>
                     <div className="bg-muted rounded-xl px-3 py-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                     </div>
                 </div>
             )}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="p-4 border-t bg-background">
              <div className="relative">
                <Input
                    placeholder="Write a message"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                    disabled={isLoading}
                    className="pr-10 rounded-full"
                />
                <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                >
                    <Send className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>
          </div>
        </Card>
      </div>

       {/* Floating Action Button */}
       <Button 
            size="icon" 
            className="w-16 h-16 rounded-full shadow-lg absolute bottom-0 right-0 bg-primary hover:bg-primary/90"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close chat" : "Open chat"}
        >
            <MessageSquare className={cn("h-8 w-8 transition-all absolute", isOpen && "scale-0 rotate-90")} />
            <X className={cn("h-8 w-8 transition-all absolute", !isOpen && "scale-0 -rotate-90")} />
        </Button>
    </div>
  );
}
