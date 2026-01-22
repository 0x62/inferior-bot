import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import { Logger } from "../../logging/Logger.js";

export class LogErrorsCommand extends SlashCommand {
  constructor(options: CommandOptions = {}) {
    super({
      name: "log",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show recent error logs.")
      .addIntegerOption((option) =>
        option
          .setName("page")
          .setDescription("Page of errors to show (10 per page)")
          .setMinValue(1)
          .setMaxValue(50),
      );
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const page = interaction.options.getInteger("page") ?? 1;
    const { entries, page: resolvedPage, totalPages, total } = Logger.getErrorPage(
      page,
      10
    );

    if (entries.length === 0) {
      await context.respond({
        content: "No recent errors.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embeds = entries.map((entry) => {
      const title =
        entry.errorName && entry.errorMessage
          ? `${entry.errorName}: ${entry.errorMessage}`
          : entry.message ?? "Error";
      const commandLabel = entry.commandName
        ? `${entry.commandType ?? "command"}:${entry.commandName}`
        : "Unknown";
      const underlying = entry.underlyingErrorName
        ? `${entry.underlyingErrorName}: ${entry.underlyingErrorMessage ?? ""}`.trim()
        : "None";
      const invoker = entry.invokerUsername ?? entry.invokerId ?? "Unknown";
      const link =
        entry.invocationGuildId && entry.invocationChannelId && entry.invocationMessageId
          ? `https://discord.com/channels/${entry.invocationGuildId}/${entry.invocationChannelId}/${entry.invocationMessageId}`
          : null;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0xcc3b3b)
        .addFields(
          { name: "Command", value: commandLabel },
          { name: "Underlying Error", value: underlying },
          { name: "Invoker", value: invoker },
          { name: "Invocation", value: link ? `[Jump](${link})` : "N/A" }
        );

      if (entry.timestamp) {
        embed.setTimestamp(new Date(entry.timestamp));
      }

      embed.setFooter({
        text: `Page ${resolvedPage}/${totalPages} • ${total} total`
      });
      return embed;
    });

    await context.respond({ embeds, flags: MessageFlags.Ephemeral });
  }
}
