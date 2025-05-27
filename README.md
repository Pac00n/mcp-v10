# Proyecto de Chat con Asistentes de IA

Este proyecto implementa una interfaz de chat que se conecta a dos tipos de asistentes:
1.  Un **Asistente de Señalización** potenciado por OpenAI Assistants API.
2.  Un **Asistente con Herramientas MCP** que se conecta a un webhook de N8N.

La aplicación permite seleccionar el asistente deseado desde una página y luego interactuar con él a través de una interfaz de chat unificada.

## Tecnologías Utilizadas

*   Vite
*   React
*   TypeScript
*   Tailwind CSS
*   OpenAI API (para el Asistente de Señalización)
*   Framer Motion (para animaciones)
*   Dotenv (para manejo de variables de entorno en desarrollo)

## Configuración

1.  **Clona el repositorio (si aún no lo has hecho).**
2.  **Crea un archivo `.env`** en la raíz del proyecto copiando el archivo `.env.example`.
    ```bash
    cp .env.example .env
    ```
3.  **Actualiza el archivo `.env`** con tus credenciales:
    *   `OPENAI_API_KEY`: Tu clave API de OpenAI.
    *   `OPENAI_ASSISTANT_ID_SENALIZACION`: El ID de tu Asistente de OpenAI para señalización (por defecto se usa `asst_MXuUc0TcV7aPYkLGbN5glitq`, puedes cambiarlo si tienes uno diferente).

    **Nota sobre el Asistente N8N:** La URL del webhook para el "Asistente con Herramientas MCP" (N8N) está actualmente codificada en `src/components/chat/n8n-chat-container.tsx`. Puedes modificarla allí directamente si es necesario, o considerar moverla a una variable de entorno en `.env` (ver `.env.example`).

4.  **Instala las dependencias:**
    ```bash
    npm install
    ```

## Ejecución Local

Para iniciar el servidor de desarrollo:
```bash
npm run dev
```
Esto iniciará la aplicación, generalmente en `http://localhost:5173`. La aplicación comenzará en la página de selección de asistentes.

## Estructura del Proyecto (resumen)

*   `public/`: Archivos estáticos (como logos).
*   `src/`: Código fuente de la aplicación.
    *   `components/chat/`: Componentes específicos de los chats.
        *   `OpenAiAssistantChat.tsx`: Interfaz y lógica para el chat con OpenAI Assistants.
        *   `n8n-chat-container.tsx`: Interfaz y lógica para el chat con N8N.
    *   `lib/assistants.ts`: Definiciones de los asistentes disponibles.
    *   `pages/`: Componentes que actúan como páginas.
        *   `AssistantsPage.tsx`: Página de selección de asistentes (página de inicio actual).
        *   `HomePage.tsx`: Página de inicio original (actualmente no es la vista por defecto).
    *   `server/chatApi.ts`: Lógica de backend (middleware de Vite) para comunicarse con la API de OpenAI Assistants.
    *   `App.tsx`: Componente principal que maneja el enrutamiento basado en estado y la lógica de la aplicación.
    *   `main.tsx`: Punto de entrada de la aplicación React.
    *   `index.css`: Estilos globales y configuración de Tailwind.
*   `.env`: Variables de entorno (ignoradas por Git).
*   `.env.example`: Ejemplo de variables de entorno.
*   `vite.config.ts`: Configuración de Vite, incluyendo el middleware para la API y la carga de `dotenv`.
*   `README.md`: Este archivo.