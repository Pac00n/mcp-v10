import { useState, useEffect, useRef, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation"; // Reemplazado
// import Image from "next/image"; // Reemplazado
import { ArrowLeft, Send, Paperclip, Settings2, Loader2, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAssistantById, Assistant as AssistantConfig } from "../../lib/assistants"; // Ruta ajustada

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageBase64?: string | null;
  timestamp: Date;
  isStreaming?: boolean;
};

// Helper function to format assistant messages (quita citaciones como 【1†source】)
const formatAssistantMessage = (content: string): string => {
  const citationRegex = /\【.*?\】/g;
  return content.replace(citationRegex, "").trim();
};

// Props para el componente, incluyendo el assistantId
interface OpenAiAssistantChatProps {
  initialAssistantId: string;
  onGoBack?: () => void; // Añadir prop para navegación "Volver"
}

export default function OpenAiAssistantChat({ initialAssistantId, onGoBack }: OpenAiAssistantChatProps) {
  const assistantId = initialAssistantId; // Usar el ID pasado como prop
  
  // const router = useRouter(); // Eliminado por ahora, se puede añadir si se usa un router en mcp-v10

  const [assistant, setAssistant] = useState<AssistantConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  const showWelcomeMessage = useCallback(() => {
    if (assistant) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `¡Hola! Soy ${assistant.name}. ¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
        isStreaming: false
      }]);
    }
  }, [assistant]);

  useEffect(() => {
    const assistantConfig = getAssistantById(assistantId);
    if (assistantConfig) {
      setAssistant(assistantConfig);
    } else {
      setError(`Asistente con ID "${assistantId}" no encontrado.`);
      console.error(`Asistente con ID "${assistantId}" no encontrado.`);
    }
  }, [assistantId]);

  // Cargar conversación existente
  useEffect(() => {
    if (!assistant) return; // Esperar a que el asistente esté cargado
    try {
      const storedThreadId = localStorage.getItem(`threadId_${assistant.id}`);
      if (storedThreadId) {
        setCurrentThreadId(storedThreadId);
        const storedMessages = localStorage.getItem(`messages_${assistant.id}`);
        if (storedMessages) {
          try {
            const parsedMessages = JSON.parse(storedMessages);
            const messagesWithDates = parsedMessages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              isStreaming: false
            }));
            setMessages(messagesWithDates);
            return; 
          } catch (e) {
            console.error("Error al cargar mensajes:", e);
          }
        }
      }
      showWelcomeMessage();
    } catch (e) {
      console.error("Error al cargar la conversación:", e);
      showWelcomeMessage();
    }
  }, [assistant, showWelcomeMessage]);

  // Guardar mensajes cuando cambian
  useEffect(() => {
    if (assistant && messages.length > 0 && !messages.some(m => m.isStreaming) && messages[0]?.id !== 'welcome') {
      try {
        localStorage.setItem(`messages_${assistant.id}`, JSON.stringify(messages));
      } catch (e) {
        console.error("Error al guardar mensajes:", e);
      }
    }
  }, [messages, assistant]);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = "";
  };

  const clearImage = () => {
    setImageBase64(null);
  };

  const startNewConversation = () => {
    if (!assistant) return;
    if (confirm("¿Estás seguro de que quieres comenzar una nueva conversación? Se perderá el historial actual.")) {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
      try {
        localStorage.removeItem(`threadId_${assistant.id}`);
        localStorage.removeItem(`messages_${assistant.id}`);
        setCurrentThreadId(null);
        setMessages([]); // Limpiar mensajes antes de mostrar el de bienvenida
        showWelcomeMessage(); // Volver a llamar para el mensaje de bienvenida
      } catch (e) {
        console.error("Error al reiniciar la conversación:", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant || (!input.trim() && !imageBase64) || isLoading) return;
    
    setError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      imageBase64,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImageBase64 = imageBase64;
    setInput("");
    setImageBase64(null);
    setIsLoading(true);

    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
    }
    
    streamControllerRef.current = new AbortController();
    const signal = streamControllerRef.current.signal;

    let assistantMessagePlaceholderId: string | null = null;
    let accumulatedContent = "";

    try {
      // const isMcp = assistant.id === 'mcp-v3'; // Lógica MCP eliminada por ahora para simplificar
      // const apiUrl = isMcp ? '/api/chat/mcp' : '/api/chat';
      const apiUrl = '/api/chat'; // Usar siempre /api/chat para asistentes OpenAI
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            assistantId: assistant.id, // Usar el ID del asistente actual
            message: currentInput,
            imageBase64: currentImageBase64,
            threadId: currentThreadId,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No se pudo obtener la respuesta del servidor");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      assistantMessagePlaceholderId = `assistant-stream-${Date.now()}`;
      
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessagePlaceholderId!,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        let eolIndex;
        
        while ((eolIndex = buffer.indexOf('\n\n')) !== -1) {
          const line = buffer.substring(0, eolIndex).trim();
          buffer = buffer.substring(eolIndex + 2);

          if (line.startsWith("data:")) {
            const jsonData = line.substring(5).trim();
            // No procesar [DONE] aquí, se maneja con el fin del stream o evento 'stream.ended'
            
            try {
              const event = JSON.parse(jsonData);
              
              if (event.threadId && event.threadId !== currentThreadId) {
                setCurrentThreadId(event.threadId);
                if (assistant) localStorage.setItem(`threadId_${assistant.id}`, event.threadId);
              }
              
              if (event.type === 'thread.info' && event.threadId && !currentThreadId) {
                setCurrentThreadId(event.threadId);
                if (assistant) localStorage.setItem(`threadId_${assistant.id}`, event.threadId);
              }

              switch (event.type) {
                case 'thread.message.delta':
                  if (event.data.delta.content && event.data.delta.content[0]?.type === 'text') {
                    accumulatedContent += event.data.delta.content[0].text.value;
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessagePlaceholderId 
                        ? { ...msg, content: formatAssistantMessage(accumulatedContent), isStreaming: true } 
                        : msg
                    ));
                  }
                  break;
                case 'thread.message.completed':
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessagePlaceholderId 
                      ? { ...msg, content: formatAssistantMessage(accumulatedContent), isStreaming: false, id: event.data.id } 
                      : msg
                  ));
                  assistantMessagePlaceholderId = null;
                  accumulatedContent = "";
                  break;
                case 'thread.run.completed':
                  setIsLoading(false);
                  setMessages(prev => prev.map(msg =>
                    (msg.role === 'assistant' && msg.isStreaming)
                      ? { ...msg, isStreaming: false }
                      : msg
                  ));
                  break;
                case 'thread.run.failed':
                case 'thread.run.cancelled':
                case 'thread.run.expired':
                  setError(event.data.last_error?.message || `Error: ${event.type}`);
                  setIsLoading(false);
                  if (assistantMessagePlaceholderId) {
                    setMessages(prev => prev.filter(msg => msg.id !== assistantMessagePlaceholderId));
                  }
                  break;
                case 'error': // Error del stream SSE personalizado
                  setError(event.data?.details || event.data?.message || "Error en la conexión");
                  setIsLoading(false);
                  if (assistantMessagePlaceholderId) {
                    setMessages(prev => prev.filter(msg => msg.id !== assistantMessagePlaceholderId));
                  }
                  break;
                case 'stream.ended': // Evento personalizado para indicar fin de stream
                  setIsLoading(false);
                  setMessages(prev => prev.map(msg =>
                    (msg.role === 'assistant' && msg.isStreaming)
                      ? { ...msg, isStreaming: false }
                      : msg
                  ));
                  if (event.error) {
                    setError(prevError => prevError || event.error);
                  }
                  return; // Salir del bucle while
              }
            } catch (e) {
              console.error("Error procesando el stream:", e, jsonData);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || "Error al enviar el mensaje");
        // No revertir el mensaje del usuario para que pueda reintentar o ver el error
        // setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        // setInput(currentInput);
        // setImageBase64(currentImageBase64);
      }
      if (assistantMessagePlaceholderId) {
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessagePlaceholderId));
      }
    } finally {
      // Asegurar que isLoading se ponga a false si no se ha hecho ya
      // y el stream no fue abortado O si fue abortado pero ya no hay mensajes en streaming
      if (!signal.aborted || (signal.aborted && messages.every(msg => !msg.isStreaming))) {
         setIsLoading(false);
      }
      streamControllerRef.current = null;
    }
  };

  const AccentGradient = "bg-gradient-to-r from-orange-500 via-red-500 to-purple-600";
  const SubtleGradient = "bg-gradient-to-r from-orange-400 to-purple-500";

  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = 0;
    const rotationSpeed = 0.1; 
    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      setRotation(prev => (prev + rotationSpeed * (deltaTime / 16)) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (!assistant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
        <p className="text-xl">{error || "Cargando asistente..."}</p>
        {error && <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md">Volver</button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white bg-gray-950 relative overflow-hidden">
      {/* Fondo con gradiente y logo */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-transparent"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/10"></div>
        <div
          className="fixed inset-0 flex justify-center items-center pointer-events-none"
          style={{ filter: 'blur(12px)', opacity: 0.3 }}
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            style={{ rotate: rotation }}
          >
            {/* Reemplazar next/image con img estándar */}
            <img
              src="/LogosNuevos/logo_orbia_sin_texto.png" // Asegúrate que esta ruta sea accesible desde public/
              alt="Orbia Logo Fondo"
              width={700} 
              height={700}
              className="object-contain opacity-90"
            />
          </motion.div>
        </div>
      </div>
      
      <header className="sticky top-0 z-20 flex items-center justify-between px-3 md:px-4 py-2 md:py-3"> {/* Eliminado fondo, borde y backdrop-blur */}
        <motion.button
          onClick={onGoBack} // Usar la prop onGoBack
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <h1 className={`text-lg md:text-xl font-bold tracking-tight bg-clip-text text-transparent ${SubtleGradient}`}>
          {assistant.name}
        </h1>
        <motion.button 
          onClick={startNewConversation}
          whileHover={{ scale: 1.05, rotate: 15 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Nueva conversación"
          disabled={isLoading}
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </header>

      <main className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 scroll-smooth relative z-10">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] md:max-w-[70%] p-0.5 rounded-xl shadow-md transition-all duration-300 ease-out
                ${message.role === "user" 
                  ? "bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-br-md" 
                  : message.role === "assistant" 
                  ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-bl-md"
                  : "bg-gray-700 text-gray-300 rounded-md" }`}
              >
                <div className="px-3 py-2 bg-gray-900/60 rounded-[10px] backdrop-blur-sm">
                  {message.imageBase64 && (
                    <img 
                      src={message.imageBase64} 
                      alt="Imagen adjunta" 
                      className="max-w-xs max-h-64 rounded-md mb-2 border border-white/10" 
                    />
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.role === "assistant" && message.isStreaming && !message.content ? (
                      <div className="flex space-x-1 py-1">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-current rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                      </div>
                    ) : (
                      message.content // Para markdown, se necesitaría <ReactMarkdown>{formatAssistantMessage(message.content)}</ReactMarkdown>
                                      // y añadir react-markdown como dependencia.
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1.5 text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </AnimatePresence>
        {isLoading && !messages.some(m => m.role === 'assistant' && m.isStreaming) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start items-end space-x-2"
          >
            <div className={`h-8 w-8 mr-1 ${assistant?.bgColor || 'bg-purple-600'} text-white flex items-center justify-center rounded-full font-semibold flex-shrink-0 shadow-md`}>{assistant?.name.charAt(0)}</div>
            <div className="rounded-lg p-3 bg-gray-800 border border-gray-700 flex items-center shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm shadow-md"
          >
            <strong>Error:</strong> {error}
          </motion.div>
        )}
      </main>

      <footer className="mt-auto z-20 p-3 md:p-4"> {/* Eliminado fondo, borde y backdrop-blur */}
        <form onSubmit={handleSubmit} className="flex items-end space-x-2 md:space-x-3">
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            aria-label="Adjuntar imagen"
          >
            <Paperclip className="h-5 w-5" />
          </motion.button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          {imageBase64 && (
            <div className="relative group">
              <img src={imageBase64} alt="Preview" className="h-10 w-10 rounded-md object-cover border border-white/20"/>
              <button 
                type="button" 
                onClick={clearImage} 
                className="absolute -top-1.5 -right-1.5 bg-gray-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Quitar imagen"
              >
                <X className="h-3.5 w-3.5 text-gray-300 hover:text-white"/>
              </button>
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Escribe tu mensaje..."
            className="flex-1 p-2.5 md:p-3 bg-gray-800/50 border border-white/10 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all min-h-[48px] max-h-32 text-sm placeholder-gray-500 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            rows={1}
            disabled={isLoading}
          />
          <motion.button 
            type="submit" 
            disabled={isLoading || (!input.trim() && !imageBase64)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2.5 rounded-full transition-colors text-white
              ${(isLoading || (!input.trim() && !imageBase64)) 
                ? "bg-gray-600 cursor-not-allowed" 
                : `${AccentGradient} hover:opacity-90`}`}
            aria-label="Enviar mensaje"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </motion.button>
        </form>
        <p className="text-xs text-gray-500 text-center mt-2">
          {isLoading ? "Asistente está pensando..." : assistant ? `Hablando con ${assistant.name}` : "Conectando..."}
        </p>
      </footer>
    </div>
  );
}