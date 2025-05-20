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
      model: "gpt-4o",
      previous_response_id: payload.previousResponseId,
      tools: [
        {
          "type": "mcp",
          "server_label": "whoa",
          "server_url": c.env.REMOTE_WHOA_SERVER_URL,
          "headers": {
            "X-Whoa-Username": c.env.LOGGED_IN_USER
          },
          "require_approval": "never"
        }
      ],
    });
    console.log(JSON.stringify(response, null, 2));
    return c.json(response);
});


export default app;