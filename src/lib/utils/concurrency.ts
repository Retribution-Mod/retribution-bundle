/**
 * Run an async function over a list of items with a maximum concurrency.
 * Resolves when every item has been processed.
 */
export async function asyncPool<T>(
    items: T[],
    fn: (item: T) => Promise<unknown>,
    concurrency = 4
): Promise<void> {
    const queue = [...items];
    const workers = Array.from({ length: concurrency }).map(async () => {
        while (queue.length) {
            const item = queue.shift()!;
            try {
                await fn(item);
            } catch { }
        }
    });
    await Promise.all(workers);
}
