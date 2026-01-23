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
import { LoggableError, MessageError, CommandError } from "../../logging/LogError.js";

type NormalizedError = {
  name: string;
  message: string;
  cause?: unknown;
};

const normalizeError = (error: unknown, fallbackMessage: string): NormalizedError => {
  if (error instanceof LoggableError) {
    return { name: error.name, message: error.message, cause: error.cause };
  }
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || fallbackMessage,
      cause: (error as { cause?: unknown }).cause
    };
  }
  return { name: "Error", message: fallbackMessage, cause: error };
};

const normalizeUnderlying = (error: unknown): NormalizedError | null => {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      cause: (error as { cause?: unknown }).cause
    };
  }
  return { name: "Error", message: String(error) };
};

const serializeInteractionOptions = (interaction: ChatInputCommandInteraction): string => {
  type SimpleOption = {
    name: string;
    type: number;
    value?: unknown;
    options?: readonly SimpleOption[];
    user?: { id?: string };
    channel?: { id?: string };
    role?: { id?: string };
    attachment?: { id?: string };
  };

  const simplify = (option: {
    name: string;
    type: number;
    value?: unknown;
    options?: readonly unknown[];
    user?: { id?: string };
    channel?: { id?: string } | null;
    role?: { id?: string } | null;
    attachment?: { id?: string } | null;
  }): SimpleOption => {
    const nested = option.options?.map((child) => simplify(child as typeof option));
    const value =
      option.value ??
      option.user?.id ??
      option.channel?.id ??
      option.role?.id ??
      option.attachment?.id ??
      null;
    return {
      name: option.name,
      type: option.type,
      value,
      options: nested && nested.length > 0 ? nested : undefined
    };
  };
  const options = interaction.options.data.map((option) => simplify(option));
  return JSON.stringify({ options });
};

const serializeMessageParams = (message: Message): string =>
  JSON.stringify({
    content: message.content,
    referenceMessageId: message.reference?.messageId ?? null
  });

export class CommandRegistry {
  private readonly slashCommands = new Map<string, SlashCommand>();
  private readonly messageCommands: MessageCommand[] = [];
  private readonly cooldownBypass = new Map<
    string,
    { command: MessageCommand; createdAt: number }
  >();

  private readonly cooldownBypassTtlMs = 60 * 60 * 1000;

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
      const remainingMs = command.cooldownRegistry.getRemainingMs(
        interaction.user.id,
        interaction.guildId
      );
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
      command.cooldownRegistry.markUsed(interaction.user.id, interaction.guildId);
    }

    await context.commandUsage
      .recordUsage({
        guildId: interaction.guildId ?? "dm",
        userId: interaction.user.id,
        commandName: command.name,
        commandType: "slash",
        parameters: serializeInteractionOptions(interaction),
        channelId: interaction.channelId ?? null,
        messageId: null
      })
      .catch((error) => {
        context.logger.warn("Failed to record command usage: %s", String(error));
      });

    const respond = async (options: InteractionReplyOptions | string) => {
      const payload = typeof options === "string" ? { content: options } : options;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    };

    try {
      await command.execute({ ...context, interaction, respond });
    } catch (error) {
      const wrapped =
        error instanceof LoggableError
          ? error
          : new CommandError("Slash command failed.", { cause: error });
      const normalized = normalizeError(wrapped, "Slash command failed.");
      const underlying = normalizeUnderlying(normalized.cause);
      context.logger.error(`${normalized.name}: ${normalized.message}`, {
        errorName: normalized.name,
        errorMessage: normalized.message,
        underlyingErrorName: underlying?.name,
        underlyingErrorMessage: underlying?.message,
        commandName: command.name,
        commandType: "slash",
        invokerId: interaction.user.id,
        invokerUsername: interaction.user.tag ?? interaction.user.username,
        invocationGuildId: interaction.guildId ?? undefined,
        invocationChannelId: interaction.channelId ?? undefined
      });

      const replyPayload: InteractionReplyOptions = {
        content: "⚠️ Something went wrong while running that command.",
        flags: MessageFlags.Ephemeral
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(replyPayload).catch(() => null);
      } else {
        await interaction.reply(replyPayload).catch(() => null);
      }
    }
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
        const remainingMs = command.cooldownRegistry.getRemainingMs(
          message.author.id,
          message.guildId
        );
        if (remainingMs > 0) {
          await message.react("⏰").catch(() => null);
          this.trackCooldownBypass(message.id, command);
          return;
        }
        await message.react("✅").catch(() => null);
        command.cooldownRegistry.markUsed(message.author.id, message.guildId);
      }

      await this.runMessageCommand(command, message, context);
      return;
    }
  }

  async handleCooldownBypass(message: Message, context: CommandContext): Promise<boolean> {
    const entry = this.cooldownBypass.get(message.id);
    if (!entry) return false;

    if (Date.now() - entry.createdAt > this.cooldownBypassTtlMs) {
      this.cooldownBypass.delete(message.id);
      return false;
    }

    this.cooldownBypass.delete(message.id);
    const command = entry.command;

    if (command.cooldownRegistry) {
      command.cooldownRegistry.markUsed(message.author.id, message.guildId);
      await message.react("✅").catch(() => null);
    }

    await this.runMessageCommand(command, message, context);
    return true;
  }

  private trackCooldownBypass(messageId: string, command: MessageCommand): void {
    const entry = { command, createdAt: Date.now() };
    this.cooldownBypass.set(messageId, entry);
    setTimeout(() => {
      const current = this.cooldownBypass.get(messageId);
      if (current?.createdAt === entry.createdAt) {
        this.cooldownBypass.delete(messageId);
      }
    }, this.cooldownBypassTtlMs);
  }

  private async runMessageCommand(
    command: MessageCommand,
    message: Message,
    context: CommandContext
  ): Promise<void> {
    await context.commandUsage
      .recordUsage({
        guildId: message.guildId ?? "dm",
        userId: message.author.id,
        commandName: command.name,
        commandType: "message",
        parameters: serializeMessageParams(message),
        channelId: message.channelId ?? null,
        messageId: message.id
      })
      .catch((error) => {
        context.logger.warn("Failed to record command usage: %s", String(error));
      });

    try {
      const messageContext = await buildMessageContext(message, {
        historyDepth: 6,
        replyDepth: 6
      });

      await command.execute({ ...context, message, messageContext });
    } catch (error) {
      const wrapped =
        error instanceof LoggableError
          ? error
          : new MessageError("Message command failed.", { cause: error });
      const normalized = normalizeError(wrapped, "Message command failed.");
      const underlying = normalizeUnderlying(normalized.cause);
      context.logger.error(`${normalized.name}: ${normalized.message}`, {
        errorName: normalized.name,
        errorMessage: normalized.message,
        underlyingErrorName: underlying?.name,
        underlyingErrorMessage: underlying?.message,
        commandName: command.name,
        commandType: "message",
        invokerId: message.author.id,
        invokerUsername: message.author.tag ?? message.author.username,
        invocationGuildId: message.guildId ?? undefined,
        invocationChannelId: message.channelId ?? undefined,
        invocationMessageId: message.id,
        invocationContent: message.content
      });
      await message.react("⚠️").catch(() => null);

      const checkReaction = message.reactions.cache.find(
        (reaction) => reaction.emoji.name === "✅"
      );
      const botId = context.client.user?.id;
      if (checkReaction && botId) {
        await checkReaction.users.remove(botId).catch(() => null);
      }
    }
  }
}
