import { useState, useEffect, useRef, useCallback } from "react";
import { WritingPanel } from "../ui/WritingPanel"; // Importar el nuevo panel
import { ArrowLeft, Send, Loader2, RefreshCw, Paperclip, X, Hammer, FileText } from "lucide-react"; // Añadido FileText
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button"; // Importar Button
import { useMcpToolsCount } from "../../hooks/useMcpToolsCount"; // Importar hook

// Tipo Message unificado (similar a OpenAiAssistantChat)
type Message = {
  id: string;
  role: "user" | "assistant" | "system"; // system para mensajes de error o informativos
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // Para simular efecto si se desea
  // imageBase64?: string | null; // Omitido por ahora para MCP, se puede añadir si es necesario
};

interface McpChatContainerProps {
  onGoBack?: () => void;
  chatTitle?: string;
}

export function McpChatContainer({ onGoBack, chatTitle = "Asistente MCP" }: McpChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toolsCount = useMcpToolsCount(); // Usar el hook

  // Estados para el panel de redacción
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null); // Omitido por ahora

  const showWelcomeMessage = useCallback(() => {
    setMessages([{
      id: "welcome-mcp",
      role: "assistant",
      content: `¡Hola! Soy ${chatTitle}. ¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
      isStreaming: false
    }]);
  }, [chatTitle]);

  useEffect(() => {
    showWelcomeMessage();
  }, [showWelcomeMessage]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClear = () => {
    if (confirm("¿Estás seguro de que quieres comenzar una nueva conversación?")) {
        setMessages([]);
        setError(null);
        showWelcomeMessage();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    setError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    // Placeholder para el mensaje del asistente mientras carga
    const assistantMessagePlaceholderId = `assistant-mcp-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: assistantMessagePlaceholderId,
        role: "assistant",
        content: "", // Vacío mientras carga
        timestamp: new Date(),
        isStreaming: true, // Simular streaming
      },
    ]);

    try {
      const response = await fetch("http://localhost:7000/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatInput: currentInput }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error en la respuesta del servidor" }));
        throw new Error(errorData.message || "Fallo al enviar el mensaje a MCP");
      }

      const data = await response.json();
      let responseText = "Lo siento, no pude obtener una respuesta válida.";

      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].output === 'string') {
        responseText = data[0].output;
      } else if (data && typeof data === 'object') {
        if (typeof data.reply === 'string') responseText = data.reply;
        else if (typeof data.text === 'string') responseText = data.text;
        else if (typeof data.output === 'string') responseText = data.output;
        else responseText = JSON.stringify(data, null, 2);
      } else if (typeof data === 'string') {
        responseText = data;
      }

      // Lógica para el panel de redacción
      console.log("[MCP Editor Debug MCP] Raw response text from MCP:", responseText);
      
      // Limpiar el responseText si está envuelto en ```json ... ```
      let cleanedResponseText = responseText.trim();
      if (cleanedResponseText.startsWith("```json")) {
        cleanedResponseText = cleanedResponseText.substring(7); // Quita ```json\n
      }
      if (cleanedResponseText.endsWith("```")) {
        cleanedResponseText = cleanedResponseText.substring(0, cleanedResponseText.length - 3);
      }
      cleanedResponseText = cleanedResponseText.trim(); // Quitar espacios extra
      console.log("[MCP Editor Debug MCP] Cleaned response text for JSON parsing:", cleanedResponseText);

      try {
        const parsedContent = JSON.parse(cleanedResponseText);
        console.log("[MCP Editor Debug MCP] Parsed content:", parsedContent);
        if (parsedContent.action === "open_editor") {
          console.log("[MCP Editor Debug MCP] Action 'open_editor' detected. Opening panel.");
          setEditorContent(parsedContent.content || '');
          setEditorOpen(true);
          // Eliminar el mensaje placeholder ya que el panel se abre
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessagePlaceholderId));
        } else {
          console.log("[MCP Editor Debug MCP] Action not 'open_editor'. Treating as normal message. Action was:", parsedContent.action);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessagePlaceholderId
              ? { ...msg, content: responseText, isStreaming: false, id: `assistant-mcp-resp-${Date.now()}` }
              : msg
          ));
        }
      } catch (parseError) {
        console.log("[MCP Editor Debug MCP] Not a JSON action or parse error. Treating as normal message. Parse error:", parseError);
        // No es JSON o no es la acción esperada, tratar como mensaje normal
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessagePlaceholderId
            ? { ...msg, content: responseText, isStreaming: false, id: `assistant-mcp-resp-${Date.now()}` }
            : msg
        ));
      }

    } catch (err: any) {
      console.error("Error enviando mensaje a MCP:", err);
      setError(err.message || "Error al procesar tu solicitud con MCP.");
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessagePlaceholderId
          ? { ...msg, content: "Error al obtener respuesta.", isStreaming: false, role: "system" }
          : msg
      ));
    } finally {
      setIsLoading(false);
      // Asegurar que cualquier mensaje en streaming se marque como no-streaming
      setMessages(prev => prev.map(msg => msg.isStreaming ? { ...msg, isStreaming: false } : msg));
    }
  };
  
  const AccentGradient = "bg-gradient-to-r from-blue-500 via-teal-500 to-green-600"; // Paleta diferente para MCP
  const SubtleGradient = "bg-gradient-to-r from-blue-400 to-green-500";

  return (
    <div className="h-screen flex text-white bg-gray-950 overflow-hidden"> {/* Cambiado min-h-screen a h-screen */}
      {/* Contenedor del Chat Principal */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ease-in-out ${
          editorOpen ? 'w-1/2' : 'flex-1 w-full'
        }`}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between px-3 md:px-4 py-2 md:py-3"> {/* Eliminado fondo, borde y backdrop-blur */}
          <motion.button
          onClick={onGoBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Volver"
          disabled={!onGoBack} // Deshabilitar si no se proporciona onGoBack
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <h1 className={`text-lg md:text-xl font-bold tracking-tight bg-clip-text text-transparent ${SubtleGradient}`}>
          {chatTitle}
        </h1>
        <div className="flex items-center space-x-1"> {/* Contenedor para los botones de la derecha */}
          {/* Botón para alternar el panel de redacción */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditorOpen(prev => !prev)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Abrir/Cerrar panel de redacción"
          >
            <FileText className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Nueva conversación"
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-white/10 transition-colors" // Clases de motion.button aplicadas aquí
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Botón de herramientas MCP */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { console.log("Abrir modal de herramientas MCP"); /* Lógica para abrir modal aquí */ }}
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors" // Clases similares
            aria-label="Ver herramientas disponibles"
          >
            <Hammer className="h-5 w-5" />
            {toolsCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {toolsCount}
              </span>
            )}
          </Button>
        </div>
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
                  ? "bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-br-md" // Mantenemos estilo de usuario
                  : message.role === "assistant"
                  ? "bg-gradient-to-br from-blue-600 to-teal-700 text-white rounded-bl-md" // Estilo de asistente MCP
                  : "bg-gray-700 text-gray-300 rounded-md" }`}
              >
                <div className="px-3 py-2 bg-gray-900/60 rounded-[10px] backdrop-blur-sm">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.role === "assistant" && message.isStreaming && !message.content ? (
                      <div className="flex space-x-1 py-1">
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-current rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                      </div>
                    ) : (
                      message.content
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
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end space-x-2">
             <div className={`h-8 w-8 mr-1 bg-blue-600 text-white flex items-center justify-center rounded-full font-semibold flex-shrink-0 shadow-md`}>N</div>
             <div className="rounded-lg p-3 bg-gray-800 border border-gray-700 flex items-center shadow-md">
               <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
             </div>
           </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm shadow-md">
            <strong>Error:</strong> {error}
          </motion.div>
        )}
      </main>

      <footer className="mt-auto z-20 p-3 md:p-4"> {/* Eliminado fondo, borde y backdrop-blur */}
        <form onSubmit={handleSubmit} className="flex items-end space-x-2 md:space-x-3">
          {/* Funcionalidad de adjuntar imagen omitida para MCP por simplicidad, se puede añadir si es necesario */}
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
            className="flex-1 p-2.5 md:p-3 bg-gray-800/50 border border-white/10 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[48px] max-h-32 text-sm placeholder-gray-500 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            rows={1}
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2.5 rounded-full transition-colors text-white
              ${(isLoading || !input.trim())
                ? "bg-gray-600 cursor-not-allowed"
                : `${AccentGradient} hover:opacity-90`}`}
            aria-label="Enviar mensaje"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </motion.button>
        </form>
        <p className="text-xs text-gray-500 text-center mt-2">
          {isLoading ? "Asistente MCP está procesando..." : `Hablando con ${chatTitle}`}
        </p>
      </footer>
    </div>

    {/* Panel de Redacción como columna Flex, renderizado condicionalmente */}
    {editorOpen && (
      <WritingPanel
        open={editorOpen} // La prop 'open' sigue siendo útil para la lógica interna del panel si la tuviera
        onClose={() => setEditorOpen(false)}
        content={editorContent}
      />
    )}
  </div>
  );
}
