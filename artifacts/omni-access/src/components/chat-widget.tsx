import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, User, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi, I'm Aria, OmniAccess's Lead Accessibility Consultant. Are you working on a web app, mobile native app, or looking at physical product compliance? That'll help me point you in the right direction."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) throw new Error("Failed to send message");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim().startsWith("data: "));
        
        for (const line of lines) {
          const dataStr = line.replace(/^data: /, "").trim();
          if (!dataStr) continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              console.error("Chat error:", data.error);
              continue;
            }
            if (data.done) {
              continue;
            }
            if (data.content) {
              assistantContent += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantContent;
                return newMessages;
              });
            }
          } catch (e) {
            console.error("Error parsing SSE data", e, dataStr);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later or reach out via our contact form." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            onClick={() => setIsOpen(true)}
            data-testid="btn-open-chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[350px] shadow-2xl flex flex-col h-[500px] border-primary/20">
          <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-serif">Aria</CardTitle>
                <p className="text-xs opacity-80">Lead Accessibility Consultant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => setIsOpen(false)} data-testid="btn-close-chat">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/30">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="flex flex-col gap-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </div>
                    <div className={`p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none shadow-sm"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 max-w-[85%] self-start">
                    <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="p-3 rounded-lg bg-card border border-border rounded-tl-none flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 bg-card border-t">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aria about compliance..."
                className="flex-1"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} data-testid="btn-send-chat">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
