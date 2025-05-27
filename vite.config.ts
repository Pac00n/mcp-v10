import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from 'dotenv';

dotenv.config(); // Cargar variables de .env a process.env
import tailwindcss from "@tailwindcss/vite";
import { handleChatRequest } from "./src/server/chatApi"; // Importar el manejador

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'chat-api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/chat', (req, res, _next) => {
          // Asegurarse de que handleChatRequest es async y se maneja la promesa
          handleChatRequest(req, res).catch(err => {
            console.error("Error en el middleware handleChatRequest:", err);
            if (!res.writableEnded) {
              res.statusCode = 500;
              // Evitar enviar HTML de error de Vite si es una petición de API
              if (req.headers.accept && !req.headers.accept.includes('text/html')) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: "Error interno del servidor en API" }));
              } else {
                res.end("Error interno del servidor");
              }
            }
          });
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
