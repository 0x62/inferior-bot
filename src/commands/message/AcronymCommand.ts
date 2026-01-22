import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AcronymCommand extends MessageCommand {
  private readonly llm: LlmClient;
  private readonly aiBanService: AiBanService;

  constructor(
    llm: LlmClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    super({
      name: "acronym",
      allowedRoleIds: options.allowedRoleIds,
      cooldownSeconds: options.cooldownSeconds,
      requiresReply: true
    });
    this.llm = llm;
    this.aiBanService = aiBanService;
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase() === "acronym";
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message } = context;
    if (!message.reference?.messageId) {
      await message.react("❓").catch(() => null);
      return;
    }

    const channel = message.channel;
    if (!channel.isTextBased()) return;

    const target = await channel.messages
      .fetch(message.reference.messageId)
      .catch(() => null);
    if (!target || !target.content) {
      await message.react("❓").catch(() => null);
      return;
    }

    if (!this.llm.isConfigured()) {
      throw new Error("LLM is not configured.");
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
      throw new Error("User is blocked from LLM usage.");
    }

    await message.react("✅").catch(() => null);

    const systemPrompt =
      "You extract acronyms and return only their fully expanded terms. Respond with only the expanded terms, one per line. Do not include acronyms, punctuation, or any other words.";
    const response = await this.llm.complete({
      system: systemPrompt,
      user: target.content
    });

    const trimmed = response.trim();
    const normalized = trimmed.toLowerCase();
    if (
      !trimmed ||
      normalized === "none" ||
      normalized === "n/a" ||
      normalized === "no acronyms" ||
      normalized === "no acronyms found"
    ) {
      await message.react("❓").catch(() => null);
      return;
    }

    await message.reply(trimmed);
  }
}
