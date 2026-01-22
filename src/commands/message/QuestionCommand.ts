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
      cooldownRegistry: options.cooldownRegistry
    });
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase() === "question";
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message } = context;
    const channel = message.channel;
    if (message.reference?.messageId && channel.isTextBased()) {
      const parent = await channel.messages
        .fetch(message.reference.messageId)
        .catch(() => null);
      if (parent) {
        await parent.reply(LINK);
        return;
      }
    }

    if (!channel.isTextBased() || !("send" in channel)) return;
    await channel.send(LINK);
  }
}
