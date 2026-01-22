import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const cooldownOverrides = sqliteTable(
  "cooldown_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    registryName: text("registry_name").notNull(),
    cooldownSeconds: integer("cooldown_seconds").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull()
  },
  (table) => ({
    uniqueOverride: uniqueIndex("cooldown_overrides_unique").on(
      table.guildId,
      table.userId,
      table.registryName
    )
  })
);

export const commandUsage = sqliteTable("command_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  commandName: text("command_name").notNull(),
  commandType: text("command_type").notNull(),
  parameters: text("parameters").notNull(),
  channelId: text("channel_id"),
  messageId: text("message_id"),
  createdAt: integer("created_at").notNull()
});
