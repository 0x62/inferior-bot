import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { GrokClient } from "../../services/GrokClient.js";
import type { AiBanService } from "../../services/AiBanService.js";
import { CommandError } from "../../logging/LogError.js";

export class ContextCommand extends MessageCommand {
  private readonly grok: GrokClient;
  private readonly aiBanService: AiBanService;

  constructor(
    grok: GrokClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    super({
      name: "context",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
      requiresReply: true
    });
    this.grok = grok;
    this.aiBanService = aiBanService;
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase() === "context";
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message, logger } = context;
    if (!message.reference?.messageId) {
      await message.react("❓").catch(() => null);
      return;
    }

    const channel = message.channel;
    if (!channel.isTextBased()) return;

    const target = await channel.messages.fetch(message.reference.messageId).catch(() => null);
    if (!target || !target.content) {
      await message.react("❓").catch(() => null);
      return;
    }

    if (!this.grok.isConfigured()) {
      throw new CommandError("Grok is not configured.");
    }

    if (!message.guildId) {
      await message.react("❓").catch(() => null);
      return;
    }

    const isBanned = await this.aiBanService.isBanned(
      message.guildId,
      message.author.id
    );
    if (isBanned) {
      throw new CommandError("User is blocked from LLM usage.");
    }

    let response = "";
    try {
      response = await this.grok.fetchContext(target.content);
    } catch (error) {
      logger.warn("Failed to fetch Grok context: %s", String(error));
      throw error;
    }

    await target.reply(response);
  }
}
