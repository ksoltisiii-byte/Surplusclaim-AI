import postgres from "postgres";

/**
 * Server-only handle to the team's database — standard managed PostgreSQL
 * (Tiger Cloud) via `DATABASE_URL`. Uses the `postgres` package (postgres.js),
 * a tagged-template client: `sql\`select ... where x = ${v}\`` binds `v` as a
 * parameter and returns an array of row objects.
 *
 * Resolved lazily (per call, not at module load) so the site still builds and
 * serves before a database is connected — the error only surfaces if a query
 * actually runs without `DATABASE_URL`. The connection is a lazy singleton:
 * the first query opens it, later calls reuse it.
 *
 * Use it only inside a `createServerFn()` handler or an `src/routes/api/*` route
 * (never client code):
 *
 *   const getPosts = createServerFn().handler(async () => {
 *     const rows = await sql()`select id, title, created_at from posts`;
 *     // Coerce non-primitive columns (timestamps arrive as JS Dates; BIGINT and
 *     // NUMERIC arrive as strings for precision) before returning to the client,
 *     // or React may refuse to render them:
 *     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
 *   });
 */
let db: ReturnType<typeof postgres> | null = null;

export const sql = () => {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries.",
    );
  }
  db = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  return db;
};