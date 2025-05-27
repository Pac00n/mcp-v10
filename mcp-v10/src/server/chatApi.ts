// src/server/chatApi.ts
import OpenAI from 'openai';
import { getAssistantById } from '../lib/assistants'; // Ajustada la ruta
import { Buffer } from 'buffer';
import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

let openai: OpenAI | null = null; // Mantener una instancia global para reutilizar si ya está inicializada

function getOpenAIClient(): OpenAI | null {
  if (openai) {
    return openai;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("[Chat API Debug] Valor de process.env.OPENAI_API_KEY:", apiKey); // Línea de depuración
  if (apiKey && apiKey.trim() !== "" && apiKey !== "tu_clave_api_de_openai_aqui") {
    try {
      openai = new OpenAI({ apiKey });
      console.log("[Chat API] Cliente OpenAI inicializado exitosamente.");
      return openai;
    } catch (e) {
      console.error("[Chat API] Falló la inicialización del cliente OpenAI:", e);
      openai = null; // Asegurar que no se use una instancia fallida
      return null;
    }
  } else {
    console.warn("[Chat API] OPENAI_API_KEY no está configurada correctamente en .env o es el valor placeholder. Los asistentes de OpenAI no funcionarán.");
    openai = null;
    return null;
  }
}

// Helper para enviar eventos SSE en un entorno Node.js http ServerResponse
function sendSseEvent(res: ServerResponse, event: object) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export async function handleChatRequest(req: IncomingMessage, res: ServerResponse) {
  console.log("[Chat API] Recibida solicitud POST /api/chat (o similar)");

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const currentOpenAIClient = getOpenAIClient();
  if (!currentOpenAIClient) {
    console.error("[Chat API] Cliente OpenAI no disponible (API Key o error de inicialización).");
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Configuración del servidor incompleta para asistentes OpenAI (API Key).' }));
    return;
  }

  try {
    const body = await readRequestBody(req);
    const { assistantId, message, imageBase64, threadId: existingThreadId } = body;

    console.log(`[Chat API] Datos: assistantId=${assistantId}, msg=${message ? message.substring(0,30)+"...": "N/A"}, img=${imageBase64 ? "Sí" : "No"}, thread=${existingThreadId}`);

    // --- Validaciones de entrada ---
    if (typeof assistantId !== 'string' || !assistantId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'assistantId es requerido' }));
      return;
    }
    // Añadir más validaciones si es necesario...

    const assistantConfig = getAssistantById(assistantId);
    if (!assistantConfig || !assistantConfig.assistant_id) {
      const errorMsg = !assistantConfig ? 'Asistente no encontrado' : `Configuración inválida (${assistantId}): falta assistant_id de OpenAI.`;
      console.error(`[Chat API] Configuración de asistente inválida: ${errorMsg}`);
      res.statusCode = !assistantConfig ? 404 : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: errorMsg }));
      return;
    }
    const openaiAssistantId = assistantConfig.assistant_id;

    // Configurar cabeceras para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Necesario para CORS si el frontend está en un puerto diferente durante el desarrollo
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.flushHeaders(); // Enviar cabeceras inmediatamente

    try {
      let currentThreadId = existingThreadId;
      if (!currentThreadId) {
        const thread = await currentOpenAIClient!.beta.threads.create();
        currentThreadId = thread.id;
        console.log('[Chat API] Nuevo thread OpenAI creado:', currentThreadId);
        sendSseEvent(res, { type: 'thread.created', threadId: currentThreadId, assistantId: assistantId });
      } else {
        console.log('[Chat API] Usando thread OpenAI existente:', currentThreadId);
        sendSseEvent(res, { type: 'thread.info', threadId: currentThreadId, assistantId: assistantId });
      }

      let fileId: string | null = null;
      if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:image')) {
          const base64Data = imageBase64.split(';base64,').pop();
          if (!base64Data) throw new Error("Formato base64 inválido para imagen");
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const mimeType = imageBase64.substring("data:".length, imageBase64.indexOf(";base64"));
          const fileName = `image.${mimeType.split('/')[1] || 'bin'}`;
          
          // OpenAI SDK espera un objeto similar a File, podemos simularlo o usar Readable stream
          const imageFile = {
            name: fileName,
            type: mimeType,
            data: imageBuffer // Esto no es directamente un File, OpenAI SDK podría necesitar adaptación
          };
          // Para la v4 del SDK, 'File' es un objeto global en Node.js >= 18
          // o podemos pasar un Readable stream.
          // Por simplicidad, intentaremos con un objeto que se asemeje a lo que espera.
          // La forma correcta con la v4 es:
          // const fileObject = await openai.files.create({
          //   file: new File([imageBuffer], fileName, { type: mimeType }), // Requiere Node 18+ para 'File' global
          //   purpose: 'vision',
          // });
          // Si 'File' no está disponible globalmente, se puede usar un stream:
           const stream = Readable.from(imageBuffer);
           const fileObject = await currentOpenAIClient!.files.create({
             file: stream as any, // 'any' para evitar problemas de tipo con la forma exacta que espera
             purpose: 'vision',
           });
          fileId = fileObject.id;
          console.log(`[Chat API] Imagen subida. File ID: ${fileId}`);
      }

      const messageContent: OpenAI.Beta.Threads.MessageContentPartParam[] = [];
      if (typeof message === 'string' && message.trim()) {
          messageContent.push({ type: 'text', text: message });
      }
      if (fileId) {
          messageContent.push({ type: 'image_file', image_file: { file_id: fileId } });
      }
      if (messageContent.length === 0) {
         messageContent.push({type: 'text', text: '(Intento de enviar mensaje vacío o con imagen fallida)'});
      }
      await currentOpenAIClient!.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: messageContent,
      });
      console.log(`[Chat API] Mensaje añadido al thread ${currentThreadId}.`);

      const runStream = currentOpenAIClient!.beta.threads.runs.stream(currentThreadId, {
        assistant_id: openaiAssistantId,
      });


      for await (const event of runStream) {
        switch (event.event) {
          case 'thread.run.created':
            console.log(`[Chat API] Run ${event.data.id} creado.`);
            sendSseEvent(res, { type: 'thread.run.created', data: event.data, threadId: currentThreadId });
            break;
          // ... (otros casos de eventos como en el original) ...
          case 'thread.message.delta':
            if (event.data.delta.content) {
                sendSseEvent(res, { type: 'thread.message.delta', data: event.data, threadId: currentThreadId });
            }
            break;
          case 'thread.message.completed':
            sendSseEvent(res, { type: 'thread.message.completed', data: event.data, threadId: currentThreadId });
            break;
          case 'thread.run.completed':
            console.log(`[Chat API] Run ${event.data.id} completado.`);
            sendSseEvent(res, { type: 'thread.run.completed', data: event.data, threadId: currentThreadId });
            sendSseEvent(res, { type: 'stream.ended' });
            res.end(); // Cerrar la conexión SSE
            return; 
          case 'thread.run.failed':
          case 'thread.run.cancelled':
          case 'thread.run.expired':
            console.error(`[Chat API] Run ${event.data.id} fallido/cancelado/expirado:`, event.data.last_error || event.data);
            sendSseEvent(res, { type: event.event, data: event.data, threadId: currentThreadId });
            sendSseEvent(res, { type: 'stream.ended', error: event.data.last_error?.message || 'Run failed' });
            res.end();
            return;
          case 'error':
            console.error("[Chat API] Error en el stream de OpenAI:", event.data);
            sendSseEvent(res, { type: 'error', data: { message: 'Error en el stream de OpenAI', details: event.data } });
            sendSseEvent(res, { type: 'stream.ended', error: 'OpenAI stream error' });
            res.end();
            return;
          default: // Incluir eventos no manejados explícitamente para depuración
            sendSseEvent(res, { type: event.event, data: event.data, threadId: currentThreadId });
            break;
        }
      }
      console.warn("[Chat API] El stream de OpenAI finalizó inesperadamente.");
      sendSseEvent(res, { type: 'stream.ended', error: 'Stream ended without completion.'});
      res.end();

    } catch (error: any) {
      console.error("[Chat API] Error dentro del manejo del stream:", error);
      if (!res.writableEnded) {
        try {
          sendSseEvent(res, { type: 'error', data: { message: error.message || 'Error interno del servidor durante el stream' } });
          sendSseEvent(res, { type: 'stream.ended', error: error.message || 'Stream error'});
        } catch(e) { /* ignore */ }
        res.end();
      }
    }

  } catch (error: any) {
    console.error('[Chat API] Error general no manejado:', error);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Error interno del servidor', details: error.message || "Unknown error" }));
    }
  }
}