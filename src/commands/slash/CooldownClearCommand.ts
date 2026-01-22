import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommand } from "../base/SlashCommand.js";
import type { SlashCommandContext } from "../base/SlashCommand.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { GlobalCooldownRegistry } from "../../utils/cooldown.js";
import type { CooldownOverrideService } from "../../services/CooldownOverrideService.js";

export class CooldownClearCommand extends SlashCommand {
  private readonly globalCooldowns: GlobalCooldownRegistry;
  private readonly overrideService: CooldownOverrideService;

  constructor(
    globalCooldowns: GlobalCooldownRegistry,
    overrideService: CooldownOverrideService,
    options: CommandOptions = {}
  ) {
    super({
      name: "cooldownclear",
      allowedRoleIds: options.allowedRoleIds,
      cooldownRegistry: options.cooldownRegistry
    });
    this.globalCooldowns = globalCooldowns;
    this.overrideService = overrideService;
  }

  build() {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Clear a per-user cooldown override.")
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
      );

    return builder;
  }

  async execute(context: SlashCommandContext): Promise<void> {
    const interaction: ChatInputCommandInteraction = context.interaction;
    const guildId = interaction.guildId;
    if (!guildId) {
      await context.respond({
        content: "Guild only command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const registryName = interaction.options.getString("registry", true);
    const user = interaction.options.getUser("user", true);

    const registry = this.globalCooldowns.get(registryName);
    if (!registry) {
      await context.respond({
        content: "Unknown cooldown registry.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    registry.clearUserCooldown(user.id, guildId);
    await this.overrideService.clearOverride(guildId, user.id, registry.name);

    await context.respond({
      content: `Cleared ${registry.name} cooldown override for ${user}.`,
      flags: MessageFlags.Ephemeral
    });
  }
}
