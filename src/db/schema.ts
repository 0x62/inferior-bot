import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const slowUsers = sqliteTable("slow_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  channelId: text("channel_id"),
  delaySeconds: integer("delay_seconds").notNull(),
  lastMessageAt: integer("last_message_at"),
  createdAt: integer("created_at").notNull()
});

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  commandMessageId: text("command_message_id").notNull(),
  parentMessageId: text("parent_message_id"),
  remindAt: integer("remind_at").notNull(),
  createdAt: integer("created_at").notNull()
});

export const aiBans = sqliteTable("ai_bans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull()
});
