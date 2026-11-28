import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { transactionBatch } from '../src/batch';

const user = (id: string, hash: string) => env.DB.prepare('INSERT INTO users (id, key_hash, created_at) VALUES (?, ?, 0)').bind(id.repeat(26), hash.repeat(64));

describe('TASK-003 local D1', () => {
  it('applies all 15 application tables to an empty database', async () => {
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations'").all();
    expect(tables.results).toHaveLength(15);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>())?.n).toBe(0);
    await user('a', 'a').run();
  });
  it('starts each test with an empty migrated database', async () => {
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>())?.n).toBe(0);
  });
  it('rolls back all statements if a batch statement fails', async () => {
    await expect(transactionBatch(env.DB, [user('a', 'a'), user('b', 'a')])).rejects.toThrow();
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>())?.n).toBe(0);
  });
  it('allows only the first conditional update to commit', async () => {
    await env.DB.prepare("INSERT INTO themes (id, name, sort_order) VALUES ('trip', 'Trip', 1)").run();
    const update = (name: string) => env.DB.prepare("UPDATE themes SET name = ? WHERE id = 'trip' AND name = 'Trip'").bind(name);
    const [first, second] = await Promise.all([transactionBatch(env.DB, [update('First')]), transactionBatch(env.DB, [update('Second')])]);
    expect([first[0].meta.changes, second[0].meta.changes].sort()).toEqual([0, 1]);
    const winner = first[0].meta.changes === 1 ? 'First' : 'Second';
    expect((await env.DB.prepare("SELECT name FROM themes WHERE id = 'trip'").first<{name: string}>())?.name).toBe(winner);
  });
});
