/** D1 commits a batch atomically; a failing statement rolls the whole batch back. */
export function transactionBatch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1Result[]> {
  if (statements.length === 0) throw new Error('A transaction batch must contain at least one statement');
  return db.batch(statements);
}
