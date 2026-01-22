export class CooldownManager {
  private lastUsed = new Map<string, number>();

  private key(commandName: string, userId: string): string {
    return `${commandName}:${userId}`;
  }

  getRemainingMs(commandName: string, userId: string, cooldownSeconds: number): number {
    const key = this.key(commandName, userId);
    const last = this.lastUsed.get(key);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    const cooldownMs = cooldownSeconds * 1000;
    return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
  }

  markUsed(commandName: string, userId: string): void {
    this.lastUsed.set(this.key(commandName, userId), Date.now());
  }
}
