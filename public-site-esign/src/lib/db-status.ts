import { createServerFn } from "@tanstack/react-start";
import { schemaReady, sql } from "~/db";
/**
 * Server-side health check for the public e-sign stack (database reachability).
 *
 * Exposed as a GET server function — the one mechanism that is guaranteed to work
 * in this build. TanStack Start's route-tree generator does NOT run in this
 * project (vite build leaves `src/routeTree.gen.ts` stale; the router-generator
 * plugin's vite hook only calls `generate()` on `configResolved` and the file
 * is never rewritten — verifed empirically 2026-12), so a file-based
 * `/api/db-status` route can never be registered. Server functions instead
 * dispatch independently of the route tree at `/_serverFn/<id>`, so this module
 * is the reliable health endpoint.
 *
 * Verification URL (GET, no payload needed — the dispatch defaults to `{}`):
 *   https://<host>/_serverFn/<id>
 * Deterministic id (sha256 of `<filename>--<fn name>` generated at build by
 * @tanstack/start-plugin-core) — read the actual id from the built esign chunk
 * after publishing. Response is always JSON:
 *   { "configured": true|false, "tables": { "properties": bool, "owners": bool, "engagements": bool } }
 * and never includes the connection string or any data rows.
 */
export interface DbStatusTables {
  properties: boolean;
  owners: boolean;
  engagements: boolean;
}
export interface DbStatusResult {
  configured: boolean;
  tables: DbStatusTables;
}
export const getDbStatus = createServerFn({ method: "GET" })
  .handler(async (): Promise<DbStatusResult> => {
    if (!process.env.DATABASE_URL) {
      return {
        configured: false,
        tables: { properties: false, owners: false, engagements: false },
      };
    }
    try {
      // Bootstrap the e-sign tables first (IF NOT EXISTS — idempotent, once per process
      // then probe existence; the two can never race a cold start).
      await schemaReady();
      const rows = await sql`
        select to_regclass('public.properties')       as "properties",
               to_regclass('public.owners')       as "owners",
               to_regclass('public.engagements') as "engagements"
      `;
      const r = rows[0] ?? {};
      return {
        configured: true,
        tables: {
          properties: r.properties != null,
          owners: r.owners != null,
          engagements: r.engagements != null,
        },
      };
    } catch (err) {
      // Never leak the connection string or any row data — surface only the
      // unreachable state; log the real error server-side.
      console.error("[db-status] query failed:", (err as Error)?.message ?? err);
      return {
        configured: true,
        tables: { properties: false, owners: false, engagements: false },
      };
    }
  });