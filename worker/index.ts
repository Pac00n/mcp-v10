import { Hono } from 'hono';
import OpenAi from 'openai';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/chat', async(c) => {
  const payload = await c.req.json();
    const client = new OpenAi({
      apiKey: c.env.OPENAI_API_KEY
    });
    const response = await client.responses.create({
      input: [{role: "user", content: payload.userMessage as string}],
      model: "gpt-4.1",
      previous_response_id: payload.previousResponseId ?? undefined
    });
    return c.json(response);
});

export default app;