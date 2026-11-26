export interface GameEvent {
  readonly seq: number;
  readonly key: string;
  readonly params: Readonly<Record<string, string | number | boolean | null>>;
  readonly fallbackVi?: string;
}

export function appendGameEvent<
  T extends { readonly events?: readonly GameEvent[] },
>(
  state: T,
  key: string,
  params: Readonly<Record<string, string | number | boolean | null>>,
  fallbackVi?: string,
): T {
  const existing = state.events ?? [];
  const nextSeq = (existing.at(-1)?.seq ?? 0) + 1;
  const event: GameEvent = {
    seq: nextSeq,
    key,
    params,
    ...(fallbackVi !== undefined ? { fallbackVi } : {}),
  };
  return {
    ...state,
    events: [...existing, event],
  };
}
