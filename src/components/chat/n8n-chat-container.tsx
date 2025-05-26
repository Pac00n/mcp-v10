import { useState, useRef, useEffect } from "react";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Bot, User } from "lucide-react";

export function N8nChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
      const response = await fetch("https://primary-production-f283.up.railway.app/webhook/6677dc0f-3f6c-43c8-ae40-c94ae1f0fbed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatInput: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      let responseText = "Sorry, I couldn't retrieve a valid response."; // Mensaje de error por defecto

      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].output === 'string') {
        responseText = data[0].output;
      } else if (data && typeof data === 'object') { // Fallback si no es la estructura esperada array
        if (typeof data.reply === 'string') {
          responseText = data.reply;
        } else if (typeof data.text === 'string') {
          responseText = data.text;
        } else if (typeof data.output === 'string') { // Fallback por si 'output' está en el objeto raíz
          responseText = data.output;
        } else {
          // Si es un objeto pero no tiene campos conocidos, stringify para depuración
          responseText = JSON.stringify(data, null, 2);
        }
      } else if (typeof data === 'string') { // Si la respuesta es directamente un string
        responseText = data;
      }
      // Si 'data' no es ninguna de estas, responseText mantiene el mensaje de error.
      
      // Add AI response to chat
      const assistantMessage: Message = {
        id: (data && data.id) ? String(data.id) : String(Date.now()),
        role: "assistant",
        content: responseText,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
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
    <Card className="w-full h-[80vh] flex flex-col shadow-lg border border-gray-200 rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Asistente N8N</CardTitle>
            <p className="text-sm text-blue-100">Conectado</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleClear}
          disabled={isLoading || messages.length === 0}
          className="text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Limpiar chat
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 bg-gray-50">
        <ScrollArea 
          className="h-[calc(80vh-136px)] w-full" 
          type="always"
          ref={scrollAreaRef}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">¿En qué puedo ayudarte hoy?</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Escribe un mensaje para comenzar la conversación. Estoy aquí para ayudarte con lo que necesites.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-4 ${
                    message.role === 'user' 
                      ? 'bg-white border-b border-gray-100' 
                      : 'bg-gray-50 border-b border-gray-100'
                  }`}
                >
                  <div className="max-w-3xl mx-auto flex gap-3">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-blue-500 text-white'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {message.role === 'user' ? 'Tú' : 'Asistente'}
                      </div>
                      <div className="text-gray-800 whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t bg-white p-4">
        <div className="w-full max-w-3xl mx-auto">
          <ChatInput 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
            placeholder="Escribe un mensaje..."
          />
        </div>
      </CardFooter>
    </Card>
  );
}
