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
      cooldownSeconds: options.cooldownSeconds
    });
    this.startedAt = startedAt;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show bot statistics.");
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const uptime = formatDuration(Date.now() - this.startedAt);
    const [row] = await context.db
      .select({ count: sql<number>`count(*)` })
      .from(reminders);
    const reminderCount = row?.count ?? 0;

    const embed = new EmbedBuilder()
      .setTitle("Bot Stats")
      .addFields(
        { name: "Uptime", value: uptime, inline: true },
        {
          name: "Scheduled Reminders",
          value: String(reminderCount),
          inline: true
        }
      )
      .setColor(0x2f9e44);

    await context.respond({ embeds: [embed] });
  }
}
