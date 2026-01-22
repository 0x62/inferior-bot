import { desc, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "../db/index.js";
import { commandUsage } from "../db/schema.js";

export type CommandUsageEntry = {
  guildId: string;
  userId: string;
  commandName: string;
  commandType: "slash" | "message";
  parameters: string;
  channelId: string | null;
  messageId: string | null;
};

export class CommandUsageService {
  private readonly db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async recordUsage(entry: CommandUsageEntry): Promise<void> {
    await this.db.insert(commandUsage).values({
      guildId: entry.guildId,
      userId: entry.userId,
      commandName: entry.commandName,
      commandType: entry.commandType,
      parameters: entry.parameters,
      channelId: entry.channelId,
      messageId: entry.messageId,
      createdAt: Date.now()
    });
  }

  async getTopUsers(
    limit: number,
    guildId?: string | null
  ): Promise<{ userId: string; count: number }[]> {
    const base = this.db
      .select({
        userId: commandUsage.userId,
        count: sql<number>`count(*)`
      })
      .from(commandUsage);

    const query = guildId ? base.where(eq(commandUsage.guildId, guildId)) : base;

    return query
      .groupBy(commandUsage.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
  }

  async getTopCommands(
    limit: number,
    guildId?: string | null
  ): Promise<{ commandName: string; count: number }[]> {
    const base = this.db
      .select({
        commandName: commandUsage.commandName,
        count: sql<number>`count(*)`
      })
      .from(commandUsage);

    const query = guildId ? base.where(eq(commandUsage.guildId, guildId)) : base;

    return query
      .groupBy(commandUsage.commandName)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
  }
}
