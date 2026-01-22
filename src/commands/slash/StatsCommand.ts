import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { sql } from "drizzle-orm";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import { reminders } from "../../db/schema.js";

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    `${seconds}s`
  ].filter(Boolean);
  return parts.join(" ");
};

export class StatsCommand extends SlashCommand {
  private readonly startedAt: number;

  constructor(startedAt: number, options: CommandOptions = {}) {
    super({
      name: "stats",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.startedAt = startedAt;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show bot statistics.");
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction = context.interaction;
    const uptime = formatDuration(Date.now() - this.startedAt);
    const [row] = await context.db
      .select({ count: sql<number>`count(*)` })
      .from(reminders);
    const reminderCount = row?.count ?? 0;

    const guildId = interaction.guildId ?? null;
    const topUsers = await context.commandUsage.getTopUsers(5, guildId);
    const topCommands = await context.commandUsage.getTopCommands(5, guildId);

    const resolveUsername = async (userId: string): Promise<string> => {
      const cachedMember = interaction.guild?.members.cache.get(userId);
      if (cachedMember) return cachedMember.user.username;
      const cachedUser = context.client.users.cache.get(userId);
      if (cachedUser) return cachedUser.username;
      try {
        const user = await context.client.users.fetch(userId);
        return user.username;
      } catch {
        return userId;
      }
    };

    const topUserLines = await Promise.all(
      topUsers.map(async (entry) => {
        const name = await resolveUsername(entry.userId);
        return `${name} — ${entry.count}`;
      })
    );

    const topCommandLines = topCommands.map(
      (entry) => `${entry.commandName} — ${entry.count}`
    );

    const embed = new EmbedBuilder()
      .setTitle("Bot Stats")
      .addFields(
        { name: "Uptime", value: uptime, inline: true },
        {
          name: "Scheduled Reminders",
          value: String(reminderCount),
          inline: true
        },
        {
          name: "Top Users",
          value: topUserLines.length > 0 ? topUserLines.join("\n") : "No data",
          inline: false
        },
        {
          name: "Top Commands",
          value: topCommandLines.length > 0 ? topCommandLines.join("\n") : "No data",
          inline: false
        }
      )
      .setColor(0x2f9e44);

    await context.respond({ embeds: [embed] });
  }
}
