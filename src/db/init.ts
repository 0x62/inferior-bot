import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ensureDirectory = (databasePath: string): void => {
  try {
    const dir = path.dirname(databasePath);
    if (!dir || dir === ".") return;
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.warn(
      "Failed to create database directory, falling back to :memory:",
      error
    );
    throw error;
  }
};

export const initSqlite = (databasePath: string): Database.Database => {
  let resolvedPath = databasePath;
  try {
    ensureDirectory(databasePath);
  } catch {
    resolvedPath = ":memory:";
  }
  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS slow_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT,
      delay_seconds INTEGER NOT NULL,
      last_message_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      command_message_id TEXT NOT NULL,
      parent_message_id TEXT,
      remind_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cooldown_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      registry_name TEXT NOT NULL,
      cooldown_seconds INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (guild_id, user_id, registry_name)
    );
    CREATE TABLE IF NOT EXISTS command_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      command_type TEXT NOT NULL,
      parameters TEXT NOT NULL,
      channel_id TEXT,
      message_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
};
