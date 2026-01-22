import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AiBanCommand extends SlashCommand {
  private readonly aiBanService: AiBanService;

  constructor(aiBanService: AiBanService, options: CommandOptions = {}) {
    super({
      name: "aiban",
      allowedRoleIds: options.allowedRoleIds,
      cooldownSeconds: options.cooldownSeconds
    });
    this.aiBanService = aiBanService;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Block a user from LLM commands.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to block").setRequired(true)
      );
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const guildId = interaction.guildId;
    if (!guildId) {
      await context.respond({
        content: "Guild only command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const added = await this.aiBanService.banUser(guildId, user.id);
    if (!added) {
      await context.respond({
        content: `${user} is already blocked from LLM commands.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await context.respond({
      content: `${user} is now blocked from LLM commands.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
