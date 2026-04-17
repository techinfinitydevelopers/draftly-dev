/**
 * Client-oriented logging: detailed output only in development.
 * Production builds stay quiet so the console does not expose prompts, UIDs,
 * subscription payloads, API responses, or stack traces.
 */
const isDev = process.env.NODE_ENV === 'development';

export function devLog(...args: unknown[]): void {
  if (!isDev) return;
  console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (!isDev) return;
  console.warn(...args);
}

/** Full error details only in development; silent in production. */
export function devError(message: string, err?: unknown): void {
  if (!isDev) return;
  if (err !== undefined) console.error(message, err);
  else console.error(message);
}
