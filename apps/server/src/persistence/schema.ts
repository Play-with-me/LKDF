import type { Client } from '@libsql/client';

/** Các câu lệnh khởi tạo bảng dữ liệu Cloud 0đ (libSQL / Turso / SQLite) cho LKDF. */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    has_custom_name INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT NOT NULL,
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    music_enabled INTEGER NULL,
    volume REAL NOT NULL DEFAULT 0.8,
    active_room_code TEXT NULL,
    active_session_id TEXT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)`,
  `CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    total_matches INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_losses INTEGER NOT NULL DEFAULT 0,
    by_identity_json TEXT NOT NULL,
    by_hero_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS matches (
    match_id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    winning_faction TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    finished_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_matches_finished_at ON matches(finished_at DESC)`,
  `CREATE TABLE IF NOT EXISTS match_participants (
    match_id TEXT NOT NULL,
    seat_index INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    identity TEXT NOT NULL,
    hero_id TEXT NOT NULL,
    is_winner INTEGER NOT NULL,
    survived INTEGER NOT NULL,
    finished_at TEXT NOT NULL,
    PRIMARY KEY (match_id, seat_index),
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mp_user_id ON match_participants(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mp_identity ON match_participants(identity)`,
  `CREATE INDEX IF NOT EXISTS idx_mp_hero_id ON match_participants(hero_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mp_user_identity_hero ON match_participants(user_id, identity, hero_id)`,
  `CREATE TABLE IF NOT EXISTS room_snapshots (
    room_code TEXT PRIMARY KEY,
    room_state_json TEXT NOT NULL,
    master_game_state_json TEXT NULL,
    undo_history_json TEXT NULL,
    phase_deadline_at TEXT NULL,
    paused_remaining_ms INTEGER NULL,
    updated_at TEXT NOT NULL
  )`,
];

/** Tạo bảng an toàn theo kiểu idempotent khi máy chủ khởi động. */
export async function initializeSchema(client: Client): Promise<void> {
  await client.execute('PRAGMA foreign_keys = ON');
  for (const sql of SCHEMA_STATEMENTS) {
    await client.execute(sql);
  }
  const userCols = await client.execute('PRAGMA table_info(users)');
  if (!userCols.rows.some(row => row['name'] === 'music_enabled')) {
    await client.execute('ALTER TABLE users ADD COLUMN music_enabled INTEGER NULL');
  }
  const hasActiveSessionCol = userCols.rows.some(
    (row) => row['name'] === 'active_session_id',
  );
  if (!hasActiveSessionCol) {
    await client.execute('ALTER TABLE users ADD COLUMN active_session_id TEXT NULL');
  }
  const hasCustomNameCol = userCols.rows.some(
    (row) => row['name'] === 'has_custom_name',
  );
  if (!hasCustomNameCol) {
    await client.execute(
      'ALTER TABLE users ADD COLUMN has_custom_name INTEGER NOT NULL DEFAULT 0',
    );
  }

  await client.execute(`CREATE TABLE IF NOT EXISTS room_undo_states (
    room_code TEXT NOT NULL,
    state_id TEXT NOT NULL,
    state_json TEXT NOT NULL,
    PRIMARY KEY (room_code, state_id)
  )`);
  const roomCols = await client.execute('PRAGMA table_info(room_snapshots)');
  const roomColNames = new Set(roomCols.rows.map((r) => String(r['name'] ?? '')));
  if (!roomColNames.has('undo_state_ids_json')) {
    await client.execute('ALTER TABLE room_snapshots ADD COLUMN undo_state_ids_json TEXT NULL');
  }
  if (!roomColNames.has('undo_history_json')) {
    await client.execute(
      'ALTER TABLE room_snapshots ADD COLUMN undo_history_json TEXT NULL',
    );
  }
  if (!roomColNames.has('phase_deadline_at')) {
    await client.execute(
      'ALTER TABLE room_snapshots ADD COLUMN phase_deadline_at TEXT NULL',
    );
  }
  if (!roomColNames.has('paused_remaining_ms')) {
    await client.execute(
      'ALTER TABLE room_snapshots ADD COLUMN paused_remaining_ms INTEGER NULL',
    );
  }
}
