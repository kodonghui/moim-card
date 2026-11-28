import { cleanup } from './cleanup';
import { createApi } from './app';
import { createSession, type SessionEnv } from './create-session';
import { listThemes } from './themes';
import { listMyRooms } from './my-rooms';
import { listPastCards } from './past-cards';
import { requireSession } from './session';
import { submitResponse, getMyProfile, getCard, closeRoom } from './responses';
import { createRoom, getRoom, joinRoom, getQuestions } from './rooms';

interface Env extends SessionEnv { ORIGIN_PUBLIC: string; ORIGIN_PRIVATE: string }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return createApi([env.ORIGIN_PUBLIC, env.ORIGIN_PRIVATE], [
      {method:'POST', path:'/v1/sessions', handler: req => createSession(req, env)},
      {method:'GET', path:'/v1/themes', middleware: requireSession(env.DB), handler: () => listThemes(env.DB)},
      {method:'POST', path:'/v1/rooms', handler: req => createRoom(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode', handler: req => getRoom(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/participants', handler: req => joinRoom(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode/questions', handler: req => getQuestions(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/responses', handler: req => submitResponse(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode/my-profile', handler: req => getMyProfile(req, env.DB)},
      {method:'GET', path:'/v1/rooms/:roomCode/card', handler: req => getCard(req, env.DB)},
      {method:'POST', path:'/v1/rooms/:roomCode/close', handler: req => closeRoom(req, env.DB)},
      {method:'GET', path:'/v1/me/rooms', middleware:requireSession(env.DB), handler: (_, userId) => listMyRooms(env.DB, userId!)},
      {method:'GET', path:'/v1/me/past-cards', middleware:requireSession(env.DB), handler: (req, userId) => listPastCards(req, env.DB, userId!)},
    ]).fetch(request);
  },
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    await cleanup(env.DB, Math.floor(controller.scheduledTime / 1000));
  },
} satisfies ExportedHandler<Env>;
