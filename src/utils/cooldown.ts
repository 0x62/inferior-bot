export class CooldownRegistry {
  readonly name: string;
  private readonly defaultCooldownMs: number;
  private readonly lastUsed = new Map<string, number>();
  private readonly overrides = new Map<string, number>();

  constructor(name: string, cooldownSeconds: number) {
    this.name = name.trim().toLowerCase();
    this.defaultCooldownMs = Math.max(0, cooldownSeconds) * 1000;
  }

  getRemainingMs(userId: string): number {
    const last = this.lastUsed.get(userId);
    if (!last) return 0;
    const cooldownMs = this.overrides.get(userId) ?? this.defaultCooldownMs;
    if (cooldownMs === 0) return 0;
    const elapsed = Date.now() - last;
    return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
  }

  markUsed(userId: string): void {
    this.lastUsed.set(userId, Date.now());
  }

  setUserCooldown(userId: string, cooldownSeconds: number): void {
    const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
    this.overrides.set(userId, cooldownMs);
  }

  clearUserCooldown(userId: string): void {
    this.overrides.delete(userId);
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
