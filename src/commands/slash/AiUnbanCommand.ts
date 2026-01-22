import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AiUnbanCommand extends SlashCommand {
  private readonly aiBanService: AiBanService;

  constructor(aiBanService: AiBanService, options: CommandOptions = {}) {
    super({
      name: "aiunban",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.aiBanService = aiBanService;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Unblock a user from LLM commands.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to unblock").setRequired(true)
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
    const removed = await this.aiBanService.unbanUser(guildId, user.id);
    if (!removed) {
      await context.respond({
        content: `${user} was not blocked from LLM commands.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await context.respond({
      content: `${user} is no longer blocked from LLM commands.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
