import "./App.css";
import { ChatContainer } from "./components/chat/chat-container";
import { N8nChatContainer } from "./components/chat/n8n-chat-container";

function App() {
  return (
    <div className="flex flex-col items-center min-h-svh p-2 gap-4"> {/* Añadido gap-4 para espaciado */}
      {/* Chat original (puedes descomentar el título si quieres) */}
      {/* <h2 className="text-xl font-semibold mt-4">Chat Original</h2> */}
      <ChatContainer />

      {/* Nuevo chat para N8N (puedes descomentar el título si quieres) */}
      {/* <h2 className="text-xl font-semibold mt-4">Chat con N8N</h2> */}
      <N8nChatContainer />
    </div>
  );
}

export default App;