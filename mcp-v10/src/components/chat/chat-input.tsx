import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, SendIcon } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <div className="flex-1 relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
          disabled={isLoading}
          className="min-h-[40px] max-h-[100px] py-2 pr-12 resize-none"
        />
        {isLoading && (
          <div className="absolute right-3 top-3 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !input.trim()} 
        className="h-[40px] px-4"
        size="icon"
      >
        {isLoading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <SendIcon className="h-5 w-5" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}