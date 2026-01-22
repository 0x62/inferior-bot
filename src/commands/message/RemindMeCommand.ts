import { parseDate } from "chrono-node";
import type { Message } from "discord.js";
import { MessageCommand } from "../base/MessageCommand.js";
import type { MessageCommandContext } from "../base/MessageCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { ReminderService } from "../../services/ReminderService.js";

export class RemindMeCommand extends MessageCommand {
  private readonly reminderService: ReminderService;

  constructor(
    reminderService: ReminderService,
    options: CommandOptions = {}
  ) {
    super({
      name: "remind_me",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.reminderService = reminderService;
  }

  matches(message: Message): boolean {
    return message.content.trim().toLowerCase().startsWith("remind me");
  }

  async execute(context: MessageCommandContext): Promise<void> {
    const { message } = context;
    const input = message.content.trim().slice("remind me".length).trim();
    if (!input) {
      await message.react("❓").catch(() => null);
      return;
    }

    const parsedDate = parseDate(input, new Date(), {
      forwardDate: true
    });

    if (!parsedDate) {
      await message.react("❓").catch(() => null);
      return;
    }

    if (!message.guildId) {
      await message.react("❓").catch(() => null);
      return;
    }

    await this.reminderService.scheduleReminder({
      guildId: message.guildId,
      channelId: message.channel.id,
      userId: message.author.id,
      commandMessageId: message.id,
      parentMessageId: message.reference?.messageId ?? null,
      remindAt: parsedDate.getTime()
    });

    await message.react("✅").catch(() => null);
  }
}
