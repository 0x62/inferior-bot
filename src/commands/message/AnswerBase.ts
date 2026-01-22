import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";

const renderContext = (messages: Message[], label: string): string => {
  if (messages.length === 0) return `${label}: (none)`;
  const lines = messages.map((msg) => `- ${msg.author.username}: ${msg.content || "(no text)"}`);
  return `${label}:\n${lines.join("\n")}`;
};

const toCommandName = (className: string): string => {
  const base = className.replace(/Command$/, "");
  return base.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
};

export abstract class AnswerBase extends MessageCommand {
  protected abstract systemPrompt: string;
  protected readonly llm: LlmClient;
  protected readonly aiBanService: AiBanService;

  protected constructor(
    llm: LlmClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    const derivedName = new.target?.name ?? "AnswerCommand";
    super({
      name: toCommandName(derivedName),
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
      requiresReply: true
    });
    this.llm = llm;
    this.aiBanService = aiBanService;
  }

  matches(message: Message): boolean {
    const content = message.content.trim().toLowerCase();
    const alias = this.name.replace(/_/g, " ");
    return content === this.name || content === alias;
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message, messageContext } = context;
    if (!message.reference?.messageId) {
      await message.react("❓").catch(() => null);
      return;
    }

    const channel = message.channel;
    if (!channel.isTextBased()) return;

    const target = await channel.messages.fetch(message.reference.messageId).catch(() => null);
    if (!target) {
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

    const userPrompt = [
      `Question: ${target.content || "(no text)"}`,
      renderContext(messageContext.previousMessages, "Recent messages"),
      renderContext(messageContext.replyChain, "Reply chain")
    ].join("\n\n");

    const response = await this.llm.complete({
      system: this.systemPrompt,
      user: userPrompt
    });
    await target.reply(response);
  }
}
