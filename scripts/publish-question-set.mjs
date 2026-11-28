import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';

const [persist, databaseId] = process.argv.slice(2);
if (!persist || !databaseId) throw new Error('local persistence directory and database ID required');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const library = await readFile(new URL('./publish-question-set-db.mjs', import.meta.url), 'utf8');
const script = `${library}\nexport default {async fetch(req, env) {try {await publish(env.DB, await req.json()); return new Response('Published to local D1');} catch (error) {return new Response(`Publication failed: ${error instanceof Error ? error.message : String(error)}`, {status:500});}}};`;
const mf = new Miniflare({ modules:true, script, d1Databases:{DB:databaseId}, d1Persist:persist, compatibilityDate:'2025-04-01' });
try {
  const response = await mf.dispatchFetch('http://localhost/', {method:'POST',body:input});
  if (!response.ok) { console.error(await response.text()); process.exitCode=1; }
  else console.log(await response.text());
} finally { await mf.dispose(); }
