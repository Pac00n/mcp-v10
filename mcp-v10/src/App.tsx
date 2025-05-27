import "./App.css";
import { useState } from "react";
import { N8nChatContainer } from "./components/chat/n8n-chat-container";
import OpenAiAssistantChat from "./components/chat/OpenAiAssistantChat";
import AssistantsPage from "./pages/AssistantsPage";
import HomePage from "./pages/HomePage"; // Importar la nueva página de inicio

type PageView = "assistants" | "openai-chat" | "n8n-chat"; // "homepage" eliminada temporalmente

function App() {
  const [currentPage, setCurrentPage] = useState<PageView>("assistants"); // Iniciar en "assistants"
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    // if (page === "homepage" || page === "assistants") { // "homepage" ya no está
    if (page === "assistants") {
      setSelectedAssistantId(null);
    }
  };

  const handleSelectAssistant = (assistantActionId: string) => {
    if (assistantActionId === "senalizacion-v3") {
      setSelectedAssistantId(assistantActionId);
      setCurrentPage("openai-chat");
    } else if (assistantActionId === "n8n-chat") {
      setCurrentPage("n8n-chat");
    } else {
      // Futuros asistentes OpenAI
      setSelectedAssistantId(assistantActionId);
      setCurrentPage("openai-chat");
    }
  };

  let content;
  switch (currentPage) {
    // case "homepage": // Eliminado temporalmente
    //   content = <HomePage navigateToAssistants={() => navigateTo("assistants")} />;
    //   break;
    case "assistants":
      content = <AssistantsPage onSelectAssistant={handleSelectAssistant} />;
      break;
    case "openai-chat":
      if (selectedAssistantId) {
        // Pasar la función para volver a la página de asistentes
        content = <OpenAiAssistantChat
                    initialAssistantId={selectedAssistantId}
                    onGoBack={() => navigateTo("assistants")}
                  />;
      } else {
        content = <HomePage navigateToAssistants={() => navigateTo("assistants")} />; // Fallback si no hay ID
      }
      break;
    case "n8n-chat":
      content = (
        <div className="w-full h-full flex-grow"> {/* Contenedor para asegurar que N8nChatContainer pueda expandirse */}
          <N8nChatContainer
            onGoBack={() => navigateTo("assistants")}
            chatTitle="Asistente con Herramientas MCP"
          />
        </div>
      );
      break;
    default:
      content = <AssistantsPage onSelectAssistant={handleSelectAssistant} />; // Fallback a assistants
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      {content}
    </div>
  );
}

export default App;