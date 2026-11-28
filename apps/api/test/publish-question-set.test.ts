import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
// @ts-expect-error JavaScript is also used by the local CLI.
import { publish } from '../../../scripts/publish-question-set-db.mjs';

const question = {prompt:'Question?',option_a:'A',option_b:'B',split_suggestion:'Discuss',agreed_text_a:'A agreed',agreed_text_b:'B agreed',axis:'plan_speed',high_choice:'A'};
const phrases = Object.fromEntries(['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced'].map(k => [k,'Text']));
const payload = (version: number) => ({themeName:'Travel',sortOrder:1,digest:'a'.repeat(64),content:{theme:'trip',version,default_next_action:'Discuss',questions:Array.from({length:8},()=>question),profile_phrases:phrases}});

describe('TASK-014 local D1 publication', () => {
  it('adds eight questions and seven phrases and leaves existing rooms on their version', async () => {
    await publish(env.DB,payload(1),100);
    await env.DB.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,created_at,expires_at) SELECT 'ABCDEFGH23','Trip',2,id,100,2592100 FROM question_sets WHERE version=1").run();
    await publish(env.DB,payload(2),200);
    const versions = await env.DB.prepare('SELECT version FROM question_sets ORDER BY version').all();
    expect(versions.results).toEqual([{version:1},{version:2}]);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM questions').first<{n:number}>())?.n).toBe(16);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM profile_phrases').first<{n:number}>())?.n).toBe(14);
    expect((await env.DB.prepare('SELECT q.version FROM rooms r JOIN question_sets q ON q.id=r.question_set_id').first<{version:number}>())?.version).toBe(1);
    await expect(publish(env.DB,payload(1),300)).rejects.toThrow();
  });
  it('rolls back an invalid version without leaving partial rows', async () => {
    const invalid = payload(1); invalid.content.questions[0] = {...question,prompt:''};
    await expect(publish(env.DB,invalid,100)).rejects.toThrow();
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM themes').first<{n:number}>())?.n).toBe(0);
  });
});
