import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { NewsService, NewsItem } from "../../services/NewsService.js";
import type { AiBanService } from "../../services/AiBanService.js";

const MAX_ITEMS = 8;

const truncate = (text: string, max = 300): string => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

const formatItemTitle = (item: NewsItem): string => {
  if (item.link) {
    return `[${item.title}](${item.link})`;
  }
  return item.title;
};

const formatItemValue = (item: NewsItem): string => {
  const parts: string[] = [];
  if (item.summary) {
    parts.push(truncate(item.summary));
  }
  if (item.image) {
    parts.push(item.image);
  }
  if (parts.length === 0) {
    parts.push("No summary available.");
  }
  return parts.join("\n");
};

export class NewsCommand extends SlashCommand {
  private readonly newsService: NewsService;
  private readonly llmClient: LlmClient;
  private readonly aiBanService: AiBanService;

  constructor(
    newsService: NewsService,
    llmClient: LlmClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    super({
      name: "news",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.newsService = newsService;
    this.llmClient = llmClient;
    this.aiBanService = aiBanService;
  }

  build() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Show current BBC headlines.")
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription("Search query to rank headlines")
          .setRequired(false)
      );
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const query = interaction.options.getString("query")?.trim() ?? "";

    if (query.length > 0) {
      if (!this.llmClient.isConfigured()) {
        await context.respond({
          content: "LLM is not configured. Try /news without a query.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (interaction.guildId) {
        const isBanned = await this.aiBanService.isBanned(
          interaction.guildId,
          interaction.user.id
        );
        if (isBanned) {
          await context.respond({
            content: "You are blocked from LLM commands.",
            flags: MessageFlags.Ephemeral
          });
          return;
        }
      }

      const scored = await this.newsService.search(query, this.llmClient);
      if (scored.length === 0) {
        await context.respond({
          content: "No matching news items found.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const top = scored.slice(0, MAX_ITEMS);
      const embed = new EmbedBuilder()
        .setTitle(`News matches for "${query}"`)
        .setDescription("Top BBC headlines ranked by relevance.")
        .setColor(0x1d7aa2);

      const lead = top.find((item) => item.image);
      if (lead?.image) {
        embed.setThumbnail(lead.image);
      }

      top.forEach((item) => {
        embed.addFields({ name: formatItemTitle(item), value: formatItemValue(item) });
      });

      await context.respond({ embeds: [embed] });
      return;
    }

    const items = await this.newsService.getCategory("US & Canada news");
    if (items.length === 0) {
      await context.respond({
        content: "No US & Canada news found right now.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const top = items.slice(0, MAX_ITEMS);
    const embed = new EmbedBuilder()
      .setTitle("US & Canada News")
      .setDescription("Latest BBC headlines and summaries.")
      .setColor(0x1d7aa2);

    const lead = top.find((item) => item.image);
    if (lead?.image) {
      embed.setThumbnail(lead.image);
    }

    top.forEach((item) => {
      embed.addFields({ name: formatItemTitle(item), value: formatItemValue(item) });
    });

    await context.respond({ embeds: [embed] });
  }
}
