import { cleanup } from './cleanup';
import { expireRooms } from './expire-rooms';
import { createApi } from './app';
import { createSession, type SessionEnv } from './create-session';
import { listThemes } from './themes';
import { listMyRooms } from './my-rooms';
import { listPastCards } from './past-cards';
import { recordEntry } from './entries';
import { getDataSummary } from './data-summary';
import { deleteMyData } from './delete-data';
import { subscribeNotification } from './subscriptions';
import type { NotificationKeys } from './notification-crypto';
import { requireSession } from './session';
import { submitResponse, getMyProfile, getCard, closeRoom } from './responses';
import { createRoom, getRoom, joinRoom, getQuestions } from './rooms';

interface Env extends SessionEnv, NotificationKeys { ORIGIN_PUBLIC: string; ORIGIN_PRIVATE: string; NOTIFICATION_TEMPLATE_SET_CODE?: string }
export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    return createApi([env.ORIGIN_PUBLIC, env.ORIGIN_PRIVATE], [
      {method:'POST', path:'/v1/sessions', handler: req => createSession(req, env)},
      {method:'GET', path:'/v1/themes', middleware: requireSession(env.DB), handler: () => listThemes(env.DB)},
      {method:'POST', path:'/v1/rooms', handler: req => createRoom(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode', handler: req => getRoom(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/participants', handler: req => joinRoom(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode/questions', handler: req => getQuestions(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/responses', handler: req => submitResponse(req, env.DB, undefined, ctx ? {env,waitUntil:promise=>ctx.waitUntil(promise)} : undefined)},
      {method:'GET', path:'/v1/rooms/:roomCode/my-profile', handler: req => getMyProfile(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode/card', handler: req => getCard(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/close', handler: req => closeRoom(req, env.DB)},
      {method:'GET', path:'/v1/me/rooms', middleware:requireSession(env.DB), handler: (_, userId) => listMyRooms(env.DB, userId!)},
      {method:'GET', path:'/v1/me/past-cards', middleware:requireSession(env.DB), handler: (req, userId) => listPastCards(req, env.DB, userId!)},
      {method:'POST', path:'/v1/entries', middleware:requireSession(env.DB), handler: (req, userId) => recordEntry(req, env.DB, userId!)},
      {method:'GET', path:'/v1/me/data-summary', middleware:requireSession(env.DB), handler: (_, userId) => getDataSummary(env.DB, userId!)},
      {method:'DELETE', path:'/v1/me', handler: req => deleteMyData(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/notification-subscription', handler: req => subscribeNotification(req, env)},
    ]).fetch(request);
  },
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const now=Math.floor(controller.scheduledTime / 1000);
    await Promise.all([cleanup(env.DB, now),expireRooms(env.DB, now)]);
  },
} satisfies ExportedHandler<Env>;
