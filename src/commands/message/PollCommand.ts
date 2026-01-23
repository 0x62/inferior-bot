import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";
import { CommandError } from "../../logging/LogError.js";

const renderContext = (messages: Message[], label: string): string => {
  if (messages.length === 0) return `${label}: (none)`;
  const lines = messages.map((msg) => `- ${msg.author.username}: ${msg.content || "(no text)"}`);
  return `${label}:\n${lines.join("\n")}`;
};

type PollPayload = {
  question: string;
  options: string[];
};

const parsePollPayload = (raw: string): PollPayload => {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new CommandError("Poll format was invalid.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  } catch (error) {
    throw new CommandError("Failed to parse poll format.", { cause: error });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new CommandError("Poll format was invalid.");
  }

  const question = String((parsed as PollPayload).question ?? "").trim();
  const options = (parsed as PollPayload).options ?? [];
  const normalized = Array.isArray(options)
    ? options.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const unique = Array.from(new Set(normalized));

  if (!question || unique.length < 2) {
    throw new CommandError("Poll format was invalid.");
  }

  const formattedQuestion = question.endsWith("?") ? question : `${question}?`;
  return {
    question: formattedQuestion,
    options: unique.slice(0, 10)
  };
};

export class PollCommand extends MessageCommand {
  private readonly llm: LlmClient;
  private readonly aiBanService: AiBanService;

  constructor(
    llm: LlmClient,
    aiBanService: AiBanService,
    options: CommandOptions = {}
  ) {
    super({
      name: "poll",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry,
      requiresReply: true
    });
    this.llm = llm;
    this.aiBanService = aiBanService;
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase() === "poll";
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
    if (!target || !target.content) {
      await message.react("❓").catch(() => null);
      return;
    }

    if (!this.llm.isConfigured()) {
      throw new CommandError("LLM is not configured.");
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

    const systemPrompt =
      "You format a poll question and answer options for Discord polls. " +
      "Return only JSON in the format {\"question\":\"...\",\"options\":[\"...\",...]} with 2-10 options. " +
      "If the prompt implies a yes/no poll, use options [\"Yes\",\"No\"]. " +
      "Keep the question short and neutral.";

    const userPrompt = [
      `Message: ${target.content}`,
      renderContext(messageContext.previousMessages, "Recent messages"),
      renderContext(messageContext.replyChain, "Reply chain")
    ].join("\n\n");

    const response = await this.llm.complete({
      system: systemPrompt,
      user: userPrompt
    });

    const poll = parsePollPayload(response);

    await target.reply({
      poll: {
        question: { text: poll.question },
        answers: poll.options.map((text) => ({ text })),
        duration: 24,
        allowMultiselect: false
      }
    });
  }
}
