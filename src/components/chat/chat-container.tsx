import { useState, useRef, useEffect } from "react";
import { ChatMessage, Message } from "./message";
import { ChatInput } from "./chat-input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>(
    () => localStorage.getItem("previousResponseId") || undefined
  );
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (content: string) => {
    // Add user message to the chat
    const userMessage: Message = {
      id: new Date().toString(),
      role: "user",
      content,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: content,
          previousResponseId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Add MCP Call responses to chat
      const mcpCallMessages: Message[] = data.output
        .filter((entry: {type: string}) => entry.type === "mcp_call")
        .map((entry: {type:string, id:string}) => (
          {
            id: entry.id,
            role: "tool",
            content: JSON.stringify(entry, null, 2)
          }
        ));
      
      // Add AI response to chat
      const assistantMessage: Message = {
        // NOTE: Using the response id here
        id: data.id || String(Date.now()),
        role: "assistant",
        content: data.output_text || "Sorry, I couldn't generate a response.",
      };
      
      setMessages((prev) => [...prev, ...mcpCallMessages, assistantMessage]);
      setPreviousResponseId(data.id || data.response_id);
      localStorage.setItem("previousResponseId", data.id || data.response_id);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: String(Date.now()),
        role: "assistant",
        content: "Sorry, there was an error processing your request.",
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setPreviousResponseId(undefined);
    localStorage.removeItem("previousResponseId");
  };
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Card className="w-full max-w-7xl h-[80vh] flex flex-col shadow-lg border-neutral-200 mx-auto">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-2 px-4 py-2 h-14">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <CardTitle className="text-xl">OpenAI Chat + MCP Tools</CardTitle>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleClear}
          disabled={isLoading || messages.length === 0}
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Chat
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea 
          className="h-[calc(80vh-84px)] px-4 py-3" 
          type="always" 
          ref={scrollAreaRef}
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8 text-muted-foreground">
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4 pt-2">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4 h-[70px]">
        <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
      </CardFooter>
    </Card>
  );
}