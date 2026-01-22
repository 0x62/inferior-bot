import type { GuildMember } from "discord.js";

export type BaseCommandOptions = {
  name: string;
  allowedRoleIds?: string[];
  cooldownSeconds?: number;
};

export type CommandOptions = Omit<BaseCommandOptions, "name">;

type RoleMember = GuildMember | { roles: string[] };

export abstract class BaseCommand {
  readonly name: string;
  readonly allowedRoleIds: string[];
  readonly cooldownSeconds?: number;

  protected constructor(options: BaseCommandOptions) {
    this.name = options.name;
    this.allowedRoleIds = options.allowedRoleIds ?? [];
    this.cooldownSeconds = options.cooldownSeconds;
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
