import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    marked: {
      parse: (text: string, options?: any) => string;
    };
  }
}

export type MessageRole = "assistant" | "user";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

interface MessageProps {
  message: Message;
}

export function ChatMessage({ message }: MessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && message.role === "assistant" && window.marked) {
      try {
        const html = window.marked.parse(message.content, {
          breaks: true,
          gfm: true
        });
        contentRef.current.innerHTML = html;
      } catch (error) {
        console.error("Error parsing markdown:", error);
        contentRef.current.textContent = message.content;
      }
    }
  }, [message.content, message.role]);

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 py-2",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-4 py-3 shadow-sm",
          message.role === "user"
            ? "bg-primary text-primary-foreground max-w-[60%]"
            : "bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 max-w-[85%]"
        )}
      >
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div 
            ref={contentRef}
            className="markdown prose dark:prose-invert prose-sm max-w-none prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-800 prose-pre:text-xs text-left"
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}