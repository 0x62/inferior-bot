export class CooldownRegistry {
  private readonly cooldownMs: number;
  private readonly lastUsed = new Map<string, number>();

  constructor(cooldownSeconds: number) {
    this.cooldownMs = Math.max(0, cooldownSeconds) * 1000;
  }

  getRemainingMs(userId: string): number {
    const last = this.lastUsed.get(userId);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    return elapsed >= this.cooldownMs ? 0 : this.cooldownMs - elapsed;
  }

  markUsed(userId: string): void {
    this.lastUsed.set(userId, Date.now());
  }
}
