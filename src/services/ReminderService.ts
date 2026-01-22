import { eq, lte } from "drizzle-orm";
import type { Client } from "discord.js";
import type { Logger } from "winston";
import type { DatabaseClient } from "../db/index.js";
import { reminders } from "../db/schema.js";

export type ReminderInput = {
  guildId: string;
  channelId: string;
  userId: string;
  commandMessageId: string;
  parentMessageId?: string | null;
  remindAt: number;
};

export class ReminderService {
  private readonly db: DatabaseClient;
  private readonly logger: Logger;
  private readonly client: Client;
  private intervalId?: NodeJS.Timeout;

  constructor(db: DatabaseClient, logger: Logger, client: Client) {
    this.db = db;
    this.logger = logger;
    this.client = client;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      void this.processDueReminders();
    }, 15000);
    void this.processDueReminders();
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  async scheduleReminder(input: ReminderInput): Promise<void> {
    await this.db.insert(reminders).values({
      guildId: input.guildId,
      channelId: input.channelId,
      userId: input.userId,
      commandMessageId: input.commandMessageId,
      parentMessageId: input.parentMessageId ?? null,
      remindAt: input.remindAt,
      createdAt: Date.now()
    });
  }

  private async processDueReminders(): Promise<void> {
    const due = await this.db
      .select()
      .from(reminders)
      .where(lte(reminders.remindAt, Date.now()))
      .limit(25);

    for (const reminder of due) {
      try {
        const channel = await this.client.channels.fetch(reminder.channelId);
        if (!channel || !channel.isTextBased()) {
          await this.deleteReminder(reminder.id);
          continue;
        }

        const textChannel = channel;
        const mention = `<@${reminder.userId}>`;

        const primaryId = reminder.parentMessageId ?? reminder.commandMessageId;
        const fallbackId =
          reminder.parentMessageId && reminder.commandMessageId
            ? reminder.commandMessageId
            : null;
        const primary = await textChannel.messages.fetch(primaryId).catch(() => null);
        const target = primary
          ? primary
          : fallbackId
            ? await textChannel.messages.fetch(fallbackId).catch(() => null)
            : null;
        if (target) {
          await target.reply(`${mention} reminder requested.`);
          await this.deleteReminder(reminder.id);
          continue;
        }

        if (!("send" in textChannel)) {
          await this.deleteReminder(reminder.id);
          continue;
        }
        await textChannel.send(`${mention} reminder requested.`);
        await this.deleteReminder(reminder.id);
      } catch (error) {
        this.logger.error("Failed to deliver reminder: %s", String(error));
      }
    }
  }

  private async deleteReminder(id: number): Promise<void> {
    await this.db.delete(reminders).where(eq(reminders.id, id));
  }
}
