import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, expect, vi } from 'vitest';

const traces = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('../../../../packages/shared/src/index.js', async (importOriginal) => {
  const rules = await importOriginal<typeof import('../../../../packages/shared/src/index.js')>();
  type State = Parameters<typeof rules.projectStateForPlayer>[0];

  function capture(
    operation: string,
    before: State,
    call: () => State,
    input?: unknown,
  ): State {
    const test = expect.getState().currentTestName;
    const entry = {
      test,
      operation,
      input,
      before: snapshot(before),
      after: snapshot(before),
      error: undefined as string | undefined,
    };
    try {
      const result = call();
      entry.after = snapshot(result);
      return result;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      if (test) traces.push(entry);
    }
  }

  function snapshot(state: State) {
    const renderable = {
      ...state,
      refereeAuditLog: state.refereeAuditLog ?? [],
      winnerUserIds: state.winnerUserIds ?? [],
    };
    return state.players.map(player => rules.projectStateForPlayer(renderable, player.userId));
  }

  return {
    ...rules,
    applyGameAction: (...args: Parameters<typeof rules.applyGameAction>) =>
      capture('applyGameAction', args[0], () => rules.applyGameAction(...args), args[1]),
    stepEngine: (...args: Parameters<typeof rules.stepEngine>) =>
      capture('stepEngine', args[0], () => rules.stepEngine(...args)),
  };
});

await import('../../../../packages/shared/tests/unit/heroes.shu.test.js');
await import('../../../../packages/shared/tests/unit/heroes.wei.test.js');
await import('../../../../packages/shared/tests/unit/heroes.wuQun.test.js');
await import('../../../../packages/shared/tests/unit/heroes.interactions.test.js');
await import('../../../../packages/shared/tests/unit/rules.audit.test.js');

afterAll(() => {
  const target = resolve('apps/desktop/release/skill-qa');
  mkdirSync(target, { recursive: true });
  writeFileSync(resolve(target, 'traces.json'), JSON.stringify(traces));
});
