import { and, eq } from "drizzle-orm";
import type { DatabaseClient } from "../db/index.js";
import { aiBans } from "../db/schema.js";

export class AiBanService {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async isBanned(guildId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: aiBans.id })
      .from(aiBans)
      .where(and(eq(aiBans.guildId, guildId), eq(aiBans.userId, userId)))
      .limit(1);
    return Boolean(rows[0]);
  }

  async banUser(guildId: string, userId: string): Promise<boolean> {
    const existing = await this.isBanned(guildId, userId);
    if (existing) return false;
    await this.db.insert(aiBans).values({
      guildId,
      userId,
      createdAt: Date.now()
    });
    return true;
  }

  async unbanUser(guildId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(aiBans)
      .where(and(eq(aiBans.guildId, guildId), eq(aiBans.userId, userId)));
    return result.changes > 0;
  }
}
