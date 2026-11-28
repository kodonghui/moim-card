import { cleanup } from './cleanup';

interface Env { DB: D1Database }
export default {
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await cleanup(env.DB, Math.floor(controller.scheduledTime / 1000));
  },
} satisfies ExportedHandler<Env>;
