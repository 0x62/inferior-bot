import { EmbedBuilder } from "discord.js";
import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { WikipediaService } from "../../services/WikipediaService.js";

export class WikiCommand extends MessageCommand {
  private readonly wikipedia: WikipediaService;

  constructor(
    wikipedia: WikipediaService,
    options: CommandOptions = {}
  ) {
    super({
      name: "wiki",
      allowedRoleIds: options.allowedRoleIds,
      cooldownSeconds: options.cooldownSeconds
    });
    this.wikipedia = wikipedia;
  }

  matches(message: Message): boolean {
    const content = message.content.trim().toLowerCase();
    return content === "wiki" || content.startsWith("wiki ");
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message } = context;
    const query = message.content.trim().slice(5).trim();
    if (!query) {
      await message.react("❓").catch(() => null);
      return;
    }

    const result = await this.wikipedia.searchTopResult(query);
    if (!result) {
      await message.reply("No results found.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(result.title)
      .setURL(result.url)
      .setDescription(result.summary ?? "No summary available.");

    if (result.thumbnailUrl) {
      embed.setThumbnail(result.thumbnailUrl);
    }

    await message.reply({ embeds: [embed] });
  }
}
