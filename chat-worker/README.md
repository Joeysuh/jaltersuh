# Chat backend

A Cloudflare Worker that answers questions about Joey through the Claude API.
The site works without it, using scripted answers, until `CHAT_ENDPOINT` in `site.js` is set.

## Deploy (about 5 minutes)

1. Get an API key at console.anthropic.com, and set a monthly spend limit there.
2. In this folder:

   ```
   npm install -g wrangler
   wrangler login
   wrangler secret put ANTHROPIC_API_KEY
   wrangler deploy
   ```

3. Copy the `https://joey-chat.<you>.workers.dev` URL into `CHAT_ENDPOINT` at the top of `site.js`.

## Guardrails

- Only accepts requests from `https://joeysuh.github.io` (and localhost:8000 for testing).
- 8 questions per minute per IP.
- Questions capped at 400 characters, 8 turns of history.
- The model only knows the facts in `PROFILE` and refuses anything off-topic.
- Replies capped at 220 tokens. Nothing is logged.

To change what it knows, edit `PROFILE` in `worker.js` and run `wrangler deploy`.
