export const ANSWER_KEY_PREFIX = 'answers:';
export function readAnswers<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
export function writeAnswers(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the current screen usable if storage is unavailable. */ }
}
export function removeAnswers(key: string): void {
  try { localStorage.removeItem(key); } catch { /* Submission is already complete. */ }
}
export function clearAllAnswers(): void {
  try { for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (key?.startsWith(ANSWER_KEY_PREFIX)) localStorage.removeItem(key); } } catch { /* Storage may be unavailable. */ }
}
