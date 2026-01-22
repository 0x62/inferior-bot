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

export class SlowUserCommand extends SlashCommand {
  private readonly slowModeService: SlowModeService;

  constructor(
    slowModeService: SlowModeService,
    options: CommandOptions = {}
  ) {
    super({
      name: "slowuser",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.slowModeService = slowModeService;
  }

  build(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Apply per-user slow mode restrictions.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to slow").setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("delay")
          .setDescription("Seconds between messages")
          .setRequired(true)
          .setMinValue(1)
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel to apply slow mode in (default current)")
          .addChannelTypes(ChannelType.GuildText)
      )
      .addBooleanOption((option) =>
        option
          .setName("all_channels")
          .setDescription("Apply slow mode across all channels")
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
    const delaySeconds = interaction.options.getInteger("delay", true);
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

    await this.slowModeService.setSlowUser({
      guildId,
      userId: user.id,
      channelId,
      delaySeconds
    });

    const scope = channelId ? `<#${channelId}>` : "all channels";
    await context.respond({
      content: `Slow mode enabled for ${user} in ${scope} (${delaySeconds}s).`,
      flags: MessageFlags.Ephemeral
    });
  }
}
