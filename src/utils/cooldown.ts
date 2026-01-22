export class CooldownRegistry {
  readonly name: string;
  private readonly defaultCooldownMs: number;
  private readonly lastUsed = new Map<string, number>();
  private readonly overrides = new Map<string, number>();

  constructor(name: string, cooldownSeconds: number) {
    this.name = name.trim().toLowerCase();
    this.defaultCooldownMs = Math.max(0, cooldownSeconds) * 1000;
  }

  private makeKey(userId: string, guildId?: string | null): string {
    return `${guildId ?? "global"}:${userId}`;
  }

  getRemainingMs(userId: string, guildId?: string | null): number {
    const key = this.makeKey(userId, guildId);
    const last = this.lastUsed.get(key);
    if (!last) return 0;
    const cooldownMs = this.overrides.get(key) ?? this.defaultCooldownMs;
    if (cooldownMs === 0) return 0;
    const elapsed = Date.now() - last;
    return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
  }

  markUsed(userId: string, guildId?: string | null): void {
    const key = this.makeKey(userId, guildId);
    this.lastUsed.set(key, Date.now());
  }

  setUserCooldown(userId: string, cooldownSeconds: number, guildId?: string | null): void {
    const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
    const key = this.makeKey(userId, guildId);
    this.overrides.set(key, cooldownMs);
  }

  clearUserCooldown(userId: string, guildId?: string | null): void {
    const key = this.makeKey(userId, guildId);
    this.overrides.delete(key);
  }

  hydrateOverrides(
    entries: { guildId: string; userId: string; cooldownSeconds: number }[]
  ): void {
    for (const entry of entries) {
      const key = this.makeKey(entry.userId, entry.guildId);
      const cooldownMs = Math.max(0, entry.cooldownSeconds) * 1000;
      this.overrides.set(key, cooldownMs);
    }
  }
}

export class GlobalCooldownRegistry {
  private readonly registries = new Map<string, CooldownRegistry>();

  register(registry: CooldownRegistry): void {
    if (!registry.name) return;
    this.registries.set(registry.name, registry);
  }

  get(name: string): CooldownRegistry | undefined {
    const key = name.trim().toLowerCase();
    return this.registries.get(key);
  }

  list(): CooldownRegistry[] {
    return Array.from(this.registries.values());
  }

  listNames(): string[] {
    return Array.from(this.registries.keys());
  }
}
