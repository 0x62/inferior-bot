import { and, eq } from "drizzle-orm";
import type { DatabaseClient } from "../db/index.js";
import { cooldownOverrides } from "../db/schema.js";

export type CooldownOverrideEntry = {
  guildId: string;
  userId: string;
  registryName: string;
  cooldownSeconds: number;
};

export class CooldownOverrideService {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async listOverridesForRegistry(registryName: string): Promise<CooldownOverrideEntry[]> {
    const rows = await this.db
      .select({
        guildId: cooldownOverrides.guildId,
        userId: cooldownOverrides.userId,
        registryName: cooldownOverrides.registryName,
        cooldownSeconds: cooldownOverrides.cooldownSeconds
      })
      .from(cooldownOverrides)
      .where(eq(cooldownOverrides.registryName, registryName));
    return rows;
  }

  async setOverride(
    guildId: string,
    userId: string,
    registryName: string,
    cooldownSeconds: number
  ): Promise<void> {
    const now = Date.now();
    await this.db
      .insert(cooldownOverrides)
      .values({
        guildId,
        userId,
        registryName,
        cooldownSeconds,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [
          cooldownOverrides.guildId,
          cooldownOverrides.userId,
          cooldownOverrides.registryName
        ],
        set: {
          cooldownSeconds,
          updatedAt: now
        }
      });
  }

  async clearOverride(
    guildId: string,
    userId: string,
    registryName: string
  ): Promise<void> {
    await this.db
      .delete(cooldownOverrides)
      .where(
        and(
          eq(cooldownOverrides.guildId, guildId),
          eq(cooldownOverrides.userId, userId),
          eq(cooldownOverrides.registryName, registryName)
        )
      );
  }
}
