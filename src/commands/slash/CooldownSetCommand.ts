import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { GlobalCooldownRegistry } from "../../utils/cooldown.js";

export class CooldownSetCommand extends SlashCommand {
  private readonly globalCooldowns: GlobalCooldownRegistry;

  constructor(globalCooldowns: GlobalCooldownRegistry, options: CommandOptions = {}) {
    super({
      name: "cooldownset",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.globalCooldowns = globalCooldowns;
  }

  build() {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Set a per-user cooldown override for a registry.")
      .addStringOption((option) => {
        option
          .setName("registry")
          .setDescription("Cooldown registry name")
          .setRequired(true);
        for (const name of this.globalCooldowns.listNames()) {
          option.addChoices({ name, value: name });
        }
        return option;
      })
      .addUserOption((option) =>
        option.setName("user").setDescription("User to update").setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("seconds")
          .setDescription("Cooldown in seconds (0 disables)")
          .setRequired(true)
          .setMinValue(0)
      );

    return builder;
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const registryName = interaction.options.getString("registry", true);
    const user = interaction.options.getUser("user", true);
    const seconds = interaction.options.getInteger("seconds", true);

    const registry = this.globalCooldowns.get(registryName);
    if (!registry) {
      await context.respond({
        content: "Unknown cooldown registry.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    registry.setUserCooldown(user.id, seconds);

    await context.respond({
      content: `Set ${registry.name} cooldown for ${user} to ${seconds}s.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
