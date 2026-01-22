import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";

export type ModHelpEntry = {
  name: string;
  description: string;
};

export class ModHelpCommand extends SlashCommand {
  private readonly entries: ModHelpEntry[];

  constructor(entries: ModHelpEntry[], options: CommandOptions = {}) {
    super({
      name: "modhelp",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.entries = entries;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show moderator commands.");
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Moderator Commands")
      .setDescription(
        this.entries
          .map((entry) => `• ${entry.name} — ${entry.description}`)
          .join("\n")
      );

    await context.respond({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
