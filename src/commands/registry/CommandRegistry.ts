import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions,
  type Message
} from "discord.js";
import { buildMessageContext } from "../../utils/messageContext.js";
import type { CommandContext } from "./types.js";
import type { MessageCommand } from "../base/MessageCommand.js";
import type { SlashCommand } from "../base/SlashCommand.js";

export class CommandRegistry {
  private readonly slashCommands = new Map<string, SlashCommand>();
  private readonly messageCommands: MessageCommand[] = [];

  registerSlash(command: SlashCommand): void {
    this.slashCommands.set(command.name, command);
  }

  registerMessage(command: MessageCommand): void {
    this.messageCommands.push(command);
  }

  listSlashCommands(): SlashCommand[] {
    return Array.from(this.slashCommands.values());
  }

  async handleSlash(
    interaction: ChatInputCommandInteraction,
    context: CommandContext
  ): Promise<void> {
    const command = this.slashCommands.get(interaction.commandName);
    if (!command) return;

    if (!command.canRun(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (command.cooldownRegistry) {
      const remainingMs = command.cooldownRegistry.getRemainingMs(interaction.user.id);
      if (remainingMs > 0) {
        const seconds = Math.ceil(remainingMs / 1000);
        await interaction.reply({
          content: `⏰ You can use this again in ${seconds}s.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      await interaction.reply({
        content: "✅ Processing...",
        flags: MessageFlags.Ephemeral
      });
      command.cooldownRegistry.markUsed(interaction.user.id);
    }

    const respond = async (options: InteractionReplyOptions | string) => {
      const payload = typeof options === "string" ? { content: options } : options;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    };

    await command.execute({ ...context, interaction, respond });
  }

  async handleMessage(message: Message, context: CommandContext): Promise<void> {
    for (const command of this.messageCommands) {
      if (!command.matches(message)) continue;
      if (!command.canRun(message.member)) {
        await message.reply("You do not have permission to use this command.");
        return;
      }

      if (command.requiresReply && !message.reference?.messageId) {
        await message.react("❓").catch(() => null);
        return;
      }

      if (command.cooldownRegistry) {
        const remainingMs = command.cooldownRegistry.getRemainingMs(message.author.id);
        if (remainingMs > 0) {
          await message.react("⏰").catch(() => null);
          return;
        }
        await message.react("✅").catch(() => null);
        command.cooldownRegistry.markUsed(message.author.id);
      }

      try {
        const messageContext = await buildMessageContext(message, {
          historyDepth: 6,
          replyDepth: 6
        });

        await command.execute({ ...context, message, messageContext });
      } catch (error) {
        const errorText =
          error instanceof Error ? error.stack ?? error.message : String(error);
        context.logger.error(
          "Message command failed (%s) for %s: %s",
          command.name,
          message.author.id,
          errorText
        );
        await message.react("⚠️").catch(() => null);
      }
      return;
    }
  }
}
