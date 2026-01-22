import { drizzle } from "drizzle-orm/better-sqlite3";
import { initSqlite } from "./init.js";

export const createDb = (databasePath: string) => {
  const sqlite = initSqlite(databasePath);
  return drizzle(sqlite);
};

export type DatabaseClient = ReturnType<typeof createDb>;
