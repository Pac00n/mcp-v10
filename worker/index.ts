import { Hono } from 'hono';
import OpenAi from 'openai';

const app = new Hono<{ Bindings: Env }>();

type ChatInterface = {
  userMessage: string;
  previousResponseId?: string;
}

app.post('/api/chat', async(c) => {
  const payload = await c.req.json<ChatInterface>();
    const client = new OpenAi({
      apiKey: c.env.OPENAI_API_KEY
    });
    // Stores by default
    const response = await client.responses.create({
      input: payload.userMessage,
      model: "gpt-4.1",
      previous_response_id: payload.previousResponseId,
    });
    return c.json(response);
});


export default app;