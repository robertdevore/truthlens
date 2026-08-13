export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class LruCache<K, V> {
  private readonly values = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number
  ) {
    if (capacity < 1 || ttlMs < 1) throw new Error('Cache limits must be positive');
  }

  get(key: K, now = Date.now()): V | undefined {
    const entry = this.values.get(key);
    if (!entry) return undefined;
    this.values.delete(key);
    if (entry.expiresAt <= now) return undefined;
    this.values.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, now = Date.now()): void {
    this.values.delete(key);
    this.values.set(key, { value, expiresAt: now + this.ttlMs });
    const oldest = this.values.keys().next().value;
    if (this.values.size > this.capacity && oldest !== undefined) this.values.delete(oldest);
  }
}
