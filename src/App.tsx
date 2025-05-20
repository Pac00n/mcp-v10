import "./App.css";
import { ChatContainer } from "./components/chat/chat-container";

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-2">
      <ChatContainer />
    </div>
  );
}

export default App;