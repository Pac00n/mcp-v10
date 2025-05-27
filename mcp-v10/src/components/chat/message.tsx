import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";

declare global {
  interface Window {
    marked: {
      parse: (text: string, options?: any) => string;
    };
  }
}

export type MessageRole = "assistant" | "user" | "tool";

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
  const [isCollapsed, setIsCollapsed] = useState(message.role === "tool");

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

  if (message.role === "tool") {
    return (
      <div className="flex w-full items-start gap-2 py-2 justify-start">
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 max-w-[85%] rounded-lg px-4 py-3 shadow-sm">
          <button 
            onClick={() => setIsCollapsed(prev => !prev)}
            className="flex items-center gap-2 w-full text-left text-amber-800 dark:text-amber-300 font-medium"
          >
            <Wrench className="h-4 w-4" />
            <span className="text-left">🛠️ Tool Message</span>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronUp className="h-4 w-4 ml-auto" />
            )}
          </button>
          
          {!isCollapsed && (
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <pre className="whitespace-pre-wrap break-words text-xs overflow-auto max-h-[300px] text-left">
                {message.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            ? "bg-primary text-primary-foreground max-w-[60%] text-right"
            : "bg-blue-50 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 max-w-[85%]"
        )}
      >
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap break-words text-right">{message.content}</p>
        ) : (
          <div 
            ref={contentRef}
            className="text-justify w-full"
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}