# MCP via the OpenAI Responses API

OpenAI added the ability to connect to MCP servers using the Responses API. You provide a type of tool MCP, pass along the correct headers, and connects to your remote MCP server and does all the handling.

This example uses the [Cloudflare Vite Plugin + React](https://developers.cloudflare.com/workers/frameworks/framework-guides/react/) + TailwindCSS + ShadCN.

It connects to a [Remote MCP server](TODO:GHREPO) that tracks whoas, which you can host.


## Build

- Copy [.dev.vars.example](./.dev.vars.example) to `.dev.vars`
- Add your OpenAI API key
- Modify [wrangler.jsonc](./wrangler.jsonc) `vars` section to your own `REMOTE_WHOA_SERVER_URL` and `LOGGED_IN_USER`.

```bash
npm run dev
```

## Deploy

Set your secrets on the server

```bash
npx wrangler secret bulk .dev.vars
```

```bash
npm run deploy
```