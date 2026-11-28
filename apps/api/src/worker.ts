import { cleanup } from './cleanup';
import { createApi } from './app';
import { createSession, type SessionEnv } from './create-session';
import { listThemes } from './themes';

interface Env extends SessionEnv { ORIGIN_PUBLIC: string; ORIGIN_PRIVATE: string }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return createApi([env.ORIGIN_PUBLIC, env.ORIGIN_PRIVATE], [
      {method:'POST', path:'/v1/sessions', handler: req => createSession(req, env)},
      {method:'GET', path:'/v1/themes', handler: req => listThemes(req, env.DB)},
    ]).fetch(request);
  },
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await cleanup(env.DB, Math.floor(controller.scheduledTime / 1000));
  },
} satisfies ExportedHandler<Env>;
