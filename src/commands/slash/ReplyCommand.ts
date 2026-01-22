import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";

export class ReplyCommand extends SlashCommand {
  constructor(options: CommandOptions = {}) {
    super({
      name: "reply",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
  }

  build() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Reply as the bot to a specific message.")
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Message ID to reply to (in this channel)")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Message content to send as the bot")
          .setRequired(true)
          .setMaxLength(2000)
      );
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const messageId = interaction.options.getString("message_id", true).trim();
    const replyContent = interaction.options.getString("message", true);

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await context.respond({
        content: "This command can only be used in text channels.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const target = await channel.messages.fetch(messageId).catch(() => null);
    if (!target) {
      await context.respond({
        content: "Message not found in this channel.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await target.reply(replyContent);
    await context.respond({ content: "Reply sent.", flags: MessageFlags.Ephemeral });
  }
}
