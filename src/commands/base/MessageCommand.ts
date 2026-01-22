import type { Message } from "discord.js";
import type { BaseCommandOptions } from "./BaseCommand.js";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../registry/types.js";
import type { MessageContext } from "../../utils/messageContext.js";

export type MessageCommandContext = CommandContext & {
  message: Message;
  messageContext: MessageContext;
};

export type MessageCommandOptions = BaseCommandOptions & {
  requiresReply?: boolean;
};

export abstract class MessageCommand extends BaseCommand {
  readonly requiresReply: boolean;

  protected constructor(options: MessageCommandOptions) {
    super(options);
    this.requiresReply = options.requiresReply ?? false;
  }

  abstract matches(message: Message): boolean;
  abstract execute(context: MessageCommandContext): Promise<void>;
}
