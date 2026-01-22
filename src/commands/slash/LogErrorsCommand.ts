import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import { Logger, type LogErrorEntry } from "../../logging/Logger.js";

const formatEntry = (entry: LogErrorEntry): string => {
  const timestamp = entry.timestamp ? new Date(entry.timestamp).toISOString() : "(no time)";
  const message = String(entry.message ?? "(no message)")
    .replace(/\s+/g, " ")
    .slice(0, 200);
  return `• ${timestamp} — ${message}`;
};

export class LogErrorsCommand extends SlashCommand {
  constructor(options: CommandOptions = {}) {
    super({
      name: "log",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
    });
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show recent error logs.")
      .addIntegerOption((option) =>
        option
          .setName("limit")
          .setDescription("How many errors to show")
          .setMinValue(1)
          .setMaxValue(10),
      );
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const limit = interaction.options.getInteger("limit") ?? 5;
    const entries = Logger.getRecentErrors(limit).reverse();

    if (entries.length === 0) {
      await context.respond({
        content: "No recent errors.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Recent Errors")
      .setDescription(entries.map(formatEntry).join("\n"))
      .setColor(0xcc3b3b);

    await context.respond({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
