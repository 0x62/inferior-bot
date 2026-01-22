import type { GuildMember } from "discord.js";
import type { CooldownRegistry } from "../../utils/cooldown.js";

export type BaseCommandOptions = {
  name: string;
  allowedRoleIds?: string[];
  cooldownRegistry?: CooldownRegistry;
};

export type CommandOptions = Omit<BaseCommandOptions, "name">;

type RoleMember = GuildMember | { roles: string[] };

export abstract class BaseCommand {
  readonly name: string;
  readonly allowedRoleIds: string[];
  readonly cooldownRegistry?: CooldownRegistry;

  protected constructor(options: BaseCommandOptions) {
    this.name = options.name;
    this.allowedRoleIds = options.allowedRoleIds ?? [];
    this.cooldownRegistry = options.cooldownRegistry;
  }

  canRun(member: RoleMember | null): boolean {
    if (this.allowedRoleIds.length === 0) return true;
    if (!member) return false;

    if ("roles" in member && Array.isArray(member.roles)) {
      return member.roles.some((roleId) => this.allowedRoleIds.includes(roleId));
    }

    if ("roles" in member && "cache" in member.roles) {
      return member.roles.cache.some((role) => this.allowedRoleIds.includes(role.id));
    }

    return false;
  }
}
