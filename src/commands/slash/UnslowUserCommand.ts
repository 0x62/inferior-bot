import {
  ChannelType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { SlowModeService } from "../../services/SlowModeService.js";

export class UnslowUserCommand extends SlashCommand {
  private readonly slowModeService: SlowModeService;

  constructor(
    slowModeService: SlowModeService,
    options: CommandOptions = {}
  ) {
    super({
      name: "unslowuser",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.slowModeService = slowModeService;
  }

  build() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Remove per-user slow mode restrictions.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to unslow").setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel to remove slow mode from (default current)")
          .addChannelTypes(ChannelType.GuildText)
      )
      .addBooleanOption((option) =>
        option
          .setName("all_channels")
          .setDescription("Remove slow mode across all channels")
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
    const allChannels = interaction.options.getBoolean("all_channels") ?? false;
    const channel = interaction.options.getChannel("channel") ?? interaction.channel;
    const channelId = allChannels ? null : channel?.id ?? null;

    if (!allChannels && !channelId) {
      await context.respond({
        content: "Unable to resolve the target channel.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const removed = await this.slowModeService.removeSlowUser(
      guildId,
      user.id,
      channelId
    );

    const scope = channelId ? `<#${channelId}>` : "all channels";
    if (!removed) {
      await context.respond({
        content: `No slow mode found for ${user} in ${scope}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await context.respond({
      content: `Slow mode removed for ${user} in ${scope}.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
