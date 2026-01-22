import type {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder
} from "discord.js";
import type { BaseCommandOptions } from "./BaseCommand.js";
import { BaseCommand } from "./BaseCommand.js";
import type { CommandContext } from "../registry/types.js";

export type SlashCommandContext = CommandContext & {
  interaction: ChatInputCommandInteraction;
  respond: (options: InteractionReplyOptions | string) => Promise<void>;
};

export abstract class SlashCommand extends BaseCommand {
  protected constructor(options: BaseCommandOptions) {
    super(options);
  }

  abstract build(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  abstract execute(context: SlashCommandContext): Promise<void>;
}
