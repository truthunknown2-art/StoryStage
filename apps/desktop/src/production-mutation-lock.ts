export class StaleProductionError extends Error {
  readonly code = "STALE_PRODUCTION";

  constructor(message: string) {
    super(message);
    this.name = "StaleProductionError";
  }
}

export class ProductionMutationCoordinator {
  private readonly queues = new Map<string, Promise<void>>();

  async run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const prior = this.queues.get(key);
    let result!: T;
    const current = (prior ? prior.catch(() => undefined) : Promise.resolve()).then(async () => {result = await operation();});
    this.queues.set(key, current);
    try {
      await current;
      return result;
    } finally {
      if (this.queues.get(key) === current) this.queues.delete(key);
    }
  }
}
