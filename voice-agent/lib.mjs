// Shared bits: env loading and a tiny ElevenLabs client. No dependencies.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const HERE = path.dirname(fileURLToPath(import.meta.url));

try { process.loadEnvFile(path.join(HERE, '.env')); } catch { /* env vars may come from the shell */ }

const BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';

export function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Put it in voice-agent/.env (see .env.example).`);
    process.exit(1);
  }
  return v;
}

export async function api(method, route, body, { raw = false } = {}) {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      'xi-api-key': need('ELEVENLABS_API_KEY'),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${method} ${route} -> ${res.status}\n${text}`);
    err.status = res.status;
    throw err;
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}
