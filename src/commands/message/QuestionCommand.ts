import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";

const LINK = "https://dontasktoask.com";

export class QuestionCommand extends MessageCommand {
  constructor(options: CommandOptions = {}) {
    super({
      name: "question",
      allowedRoleIds: options.allowedRoleIds,
      cooldownSeconds: options.cooldownSeconds
    });
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase() === "question";
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message } = context;
    if (message.reference?.messageId && message.channel.isTextBased()) {
      const parent = await message.channel.messages
        .fetch(message.reference.messageId)
        .catch(() => null);
      if (parent) {
        await parent.reply(LINK);
        return;
      }
    }

    if (!message.channel.isTextBased()) return;
    await message.channel.send(LINK);
  }
}
