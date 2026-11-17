import { HeroIdSchema, TIMER_PRESETS, TimerPresetSchema } from '@lkdf/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuthService } from '../auth/index.js';
import type { RoomManager } from './index.js';

const CreateRoomBodySchema = z.object({
  timerPreset: TimerPresetSchema.optional(),
});

const JoinRoomBodySchema = z.object({
  roomCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/, 'Mã phòng phải gồm đúng 6 ký tự chữ/số.'),
});

const UpdateTimerBodySchema = z.object({
  timerPreset: TimerPresetSchema,
});

const SelectHeroBodySchema = z.object({
  heroId: HeroIdSchema,
});

const RoomCodeParamSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6}$/);

/** Đăng ký toàn bộ API Quản lý phòng chờ 4–8 người, đồng hồ đếm ngược & bắt đầu ván. */
export function registerRoomRoutes(
  app: FastifyInstance,
  deps: {
    readonly authService: AuthService;
    readonly roomManager: RoomManager;
  },
): void {
  const { authService, roomManager } = deps;

  app.get('/api/rooms/presets', async () => {
    return {
      ok: true,
      presets: [
        { id: 'FAST', nameVi: 'Nhanh', ...TIMER_PRESETS.FAST },
        { id: 'STANDARD', nameVi: 'Chuẩn', ...TIMER_PRESETS.STANDARD },
        { id: 'RELAXED', nameVi: 'Thong thả', ...TIMER_PRESETS.RELAXED },
      ],
    };
  });

  app.get('/api/rooms/mine', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const activeRoomCode =
      roomManager.getActiveRoomCodeForUser(auth.profile.userId) ??
      auth.profile.activeRoomCode;
    if (!activeRoomCode) {
      return { ok: true, room: null };
    }

    const viewResult = roomManager.getRoomViewForUser(
      auth.profile.userId,
      activeRoomCode,
    );
    if (!viewResult.ok) {
      return { ok: true, room: null };
    }

    return { ok: true, room: viewResult.data };
  });

  app.post('/api/rooms', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const parsed = CreateRoomBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_TIMER_PRESET',
        messageVi: 'Mức đồng hồ đếm ngược không hợp lệ (chỉ nhận FAST, STANDARD hoặc RELAXED).',
      });
    }

    const created = await roomManager.createRoom(
      auth.profile,
      parsed.data.timerPreset ?? 'STANDARD',
    );
    if (!created.ok) {
      return reply.status(created.statusCode).send(created);
    }

    return reply.status(201).send({
      ok: true,
      ...created.data,
    });
  });

  app.post('/api/rooms/join', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const parsed = JoinRoomBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự chữ và số.',
      });
    }

    const joined = await roomManager.joinRoom(
      auth.profile,
      parsed.data.roomCode,
    );
    if (!joined.ok) {
      return reply.status(joined.statusCode).send(joined);
    }

    return {
      ok: true,
      ...joined.data,
    };
  });

  app.get('/api/rooms/:roomCode', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const params = request.params as { roomCode?: string };
    const codeParsed = RoomCodeParamSchema.safeParse(params.roomCode ?? '');
    if (!codeParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự.',
      });
    }

    const view = roomManager.getRoomViewForUser(
      auth.profile.userId,
      codeParsed.data,
    );
    if (!view.ok) {
      return reply.status(view.statusCode).send(view);
    }

    return {
      ok: true,
      ...view.data,
    };
  });

  app.patch('/api/rooms/:roomCode/timer', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const params = request.params as { roomCode?: string };
    const codeParsed = RoomCodeParamSchema.safeParse(params.roomCode ?? '');
    if (!codeParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự.',
      });
    }

    const bodyParsed = UpdateTimerBodySchema.safeParse(request.body ?? {});
    if (!bodyParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_TIMER_PRESET',
        messageVi: 'Mức đồng hồ chỉ hỗ trợ FAST, STANDARD hoặc RELAXED.',
      });
    }

    const updated = await roomManager.updateTimerPreset(
      auth.profile.userId,
      codeParsed.data,
      bodyParsed.data.timerPreset,
    );
    if (!updated.ok) {
      return reply.status(updated.statusCode).send(updated);
    }

    return {
      ok: true,
      ...updated.data,
    };
  });

  app.post('/api/rooms/:roomCode/leave', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const params = request.params as { roomCode?: string };
    const codeParsed = RoomCodeParamSchema.safeParse(params.roomCode ?? '');
    if (!codeParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự.',
      });
    }

    const left = await roomManager.leaveRoom(
      auth.profile.userId,
      codeParsed.data,
    );
    if (!left.ok) {
      return reply.status(left.statusCode).send(left);
    }

    return {
      ok: true,
      ...left.data,
    };
  });

  app.post('/api/rooms/:roomCode/start', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const params = request.params as { roomCode?: string };
    const codeParsed = RoomCodeParamSchema.safeParse(params.roomCode ?? '');
    if (!codeParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự.',
      });
    }

    const started = await roomManager.startMatch(
      auth.profile.userId,
      codeParsed.data,
    );
    if (!started.ok) {
      return reply.status(started.statusCode).send(started);
    }

    return {
      ok: true,
      ...started.data,
    };
  });

  app.post('/api/rooms/:roomCode/select-hero', async (request, reply) => {
    const auth = await authService.verifyAuthorizationHeader(
      request.headers.authorization,
    );
    if (!auth.ok) {
      return reply.status(auth.statusCode).send(auth);
    }

    const params = request.params as { roomCode?: string };
    const codeParsed = RoomCodeParamSchema.safeParse(params.roomCode ?? '');
    if (!codeParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_ROOM_CODE',
        messageVi: 'Mã phòng phải gồm đúng 6 ký tự.',
      });
    }

    const bodyParsed = SelectHeroBodySchema.safeParse(request.body ?? {});
    if (!bodyParsed.success) {
      return reply.status(400).send({
        ok: false,
        code: 'INVALID_HERO_ID',
        messageVi: 'Mã tướng không hợp lệ.',
      });
    }

    const selected = await roomManager.selectHero(
      auth.profile.userId,
      codeParsed.data,
      bodyParsed.data.heroId,
    );
    if (!selected.ok) {
      return reply.status(selected.statusCode).send(selected);
    }

    return {
      ok: true,
      ...selected.data,
    };
  });
}
