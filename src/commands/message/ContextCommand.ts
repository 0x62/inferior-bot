import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";
import type { NewsService, ScoredNewsItem } from "../../services/NewsService.js";

const buildNewsContext = (items: ScoredNewsItem[]): string => {
  if (items.length === 0) {
    return "No recent news items were available.";
  }
  return items
    .map((item, index) => {
      const summary = item.summary ? ` — ${item.summary}` : "";
      return `${index + 1}. ${item.title}${summary}`;
    })
    .join("\n");
};

export class ContextCommand extends MessageCommand {
  private readonly llm: LlmClient;
  private readonly aiBanService: AiBanService;
  private readonly newsService: NewsService;

  constructor(
    newsService: NewsService,
    llm: LlmClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    super({
      name: "context",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
      requiresReply: true
    });
    this.llm = llm;
    this.aiBanService = aiBanService;
    this.newsService = newsService;
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

    let newsContext = "No recent news items were available.";
    try {
      const scored = await this.newsService.search(target.content, this.llm);
      newsContext = buildNewsContext(scored.slice(0, 5));
    } catch (error) {
      logger.warn("Failed to load news context: %s", String(error));
    }

    const systemPrompt =
      "Provide concise background context using recent news when available. " +
      "If no news items are provided, use general knowledge to add helpful context. " +
      "Respond directly and confidently without referencing the message or the user.";

    const userPrompt = [
      `Message: ${target.content}`,
      "Top news items:",
      newsContext
    ].join("\n\n");

    const response = await this.llm.complete({
      system: systemPrompt,
      user: userPrompt
    });

    await target.reply(response);
  }
}
