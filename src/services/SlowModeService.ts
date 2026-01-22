import { and, eq, isNull } from "drizzle-orm";
import type { Logger } from "winston";
import type { DatabaseClient } from "../db/index.js";
import { slowUsers } from "../db/schema.js";
import type { Message } from "discord.js";

export type SlowUserConfig = {
  guildId: string;
  userId: string;
  channelId?: string | null;
  delaySeconds: number;
};

export class SlowModeService {
  private readonly db: DatabaseClient;
  private readonly logger: Logger;
  private readonly noticeTracker = new Map<string, number>();

  constructor(db: DatabaseClient, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async setSlowUser(config: SlowUserConfig): Promise<void> {
    const existing = await this.findSlowUser(config.guildId, config.userId, config.channelId ?? null);
    const payload = {
      guildId: config.guildId,
      userId: config.userId,
      channelId: config.channelId ?? null,
      delaySeconds: config.delaySeconds,
      lastMessageAt: null,
      createdAt: Date.now()
    };

    if (existing) {
      await this.db
        .update(slowUsers)
        .set({
          delaySeconds: config.delaySeconds,
          lastMessageAt: null
        })
        .where(eq(slowUsers.id, existing.id));
      return;
    }

    await this.db.insert(slowUsers).values(payload);
  }

  async removeSlowUser(guildId: string, userId: string, channelId?: string | null): Promise<boolean> {
    if (channelId === null) {
      const deleted = await this.db
        .delete(slowUsers)
        .where(
          and(
            eq(slowUsers.guildId, guildId),
            eq(slowUsers.userId, userId),
            isNull(slowUsers.channelId)
          )
        );
      return deleted.changes > 0;
    }

    const deleted = await this.db
      .delete(slowUsers)
      .where(
        and(
          eq(slowUsers.guildId, guildId),
          eq(slowUsers.userId, userId),
          eq(slowUsers.channelId, channelId ?? "")
        )
      );
    return deleted.changes > 0;
  }

  async handleMessage(message: Message): Promise<boolean> {
    if (!message.guildId) return false;
    if (!message.member) return false;

    const channelSpecific = await this.findSlowUser(
      message.guildId,
      message.author.id,
      message.channel.id
    );
    const globalSlow = await this.findSlowUser(message.guildId, message.author.id, null);

    const record = channelSpecific ?? globalSlow;
    if (!record) return false;

    const now = Date.now();
    const lastMessageAt = record.lastMessageAt ?? 0;
    const cooldownMs = record.delaySeconds * 1000;

    if (now - lastMessageAt < cooldownMs) {
      try {
        await message.delete();
      } catch (error) {
        this.logger.warn("Failed to delete message for slow mode: %s", String(error));
      }
      await this.maybeNotifySlowMode(message, record.delaySeconds);
      return true;
    }

    try {
      await this.db
        .update(slowUsers)
        .set({ lastMessageAt: now })
        .where(eq(slowUsers.id, record.id));
    } catch (error) {
      this.logger.error("Failed to update slow mode timestamp: %s", String(error));
    }
    return false;
  }

  private async maybeNotifySlowMode(message: Message, delaySeconds: number): Promise<void> {
    const key = `${message.guildId}:${message.author.id}`;
    const now = Date.now();
    const lastNotice = this.noticeTracker.get(key) ?? 0;
    if (now - lastNotice < 60 * 60 * 1000) return;
    this.noticeTracker.set(key, now);

    if (!message.channel.isTextBased()) return;
    await message.channel
      .send(
        `<@${message.author.id}> you're on slow mode cooldown (${delaySeconds}s between messages).`
      )
      .catch((error) => {
        this.logger.warn("Failed to send slow mode notice: %s", String(error));
      });
  }

  private async findSlowUser(
    guildId: string,
    userId: string,
    channelId: string | null
  ): Promise<{ id: number; lastMessageAt: number | null; delaySeconds: number } | null> {
    if (channelId === null) {
      const rows = await this.db
        .select({
          id: slowUsers.id,
          lastMessageAt: slowUsers.lastMessageAt,
          delaySeconds: slowUsers.delaySeconds
        })
        .from(slowUsers)
        .where(and(eq(slowUsers.guildId, guildId), eq(slowUsers.userId, userId), isNull(slowUsers.channelId)))
        .limit(1);
      return rows[0] ?? null;
    }

    const rows = await this.db
      .select({
        id: slowUsers.id,
        lastMessageAt: slowUsers.lastMessageAt,
        delaySeconds: slowUsers.delaySeconds
      })
      .from(slowUsers)
      .where(
        and(
          eq(slowUsers.guildId, guildId),
          eq(slowUsers.userId, userId),
          eq(slowUsers.channelId, channelId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
