import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";

export type HelpEntry = {
  name: string;
  description: string;
};

export type HelpSection = {
  title: string;
  entries: HelpEntry[];
};

export class HelpCommand extends SlashCommand {
  private readonly sections: HelpSection[];

  constructor(sections: HelpSection[], options: CommandOptions = {}) {
    super({
      name: "help",
      allowedRoleIds: options.allowedRoleIds,
      cooldownSeconds: options.cooldownSeconds
    });
    this.sections = sections;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show available commands.");
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const embed = new EmbedBuilder().setTitle("Available Commands");

    for (const section of this.sections) {
      if (section.entries.length === 0) continue;
      const value = section.entries
        .map((entry) => `• ${entry.name} — ${entry.description}`)
        .join("\n");
      embed.addFields({ name: section.title, value });
    }

    await context.respond({ embeds: [embed] });
  }
}
