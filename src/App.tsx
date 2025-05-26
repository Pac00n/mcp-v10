import "./App.css";
import { N8nChatContainer } from "./components/chat/n8n-chat-container";

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chat con N8N</h1>
          <p className="text-gray-600">Envía mensajes que se procesarán a través de n8n</p>
        </header>
        <N8nChatContainer />
      </div>
    </div>
  );
}

export default App;