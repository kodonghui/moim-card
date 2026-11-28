declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    MIGRATION_DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}
