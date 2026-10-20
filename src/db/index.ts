import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver, on the pooled `DATABASE_URL`.
 *
 * One HTTP request per query fits short-lived serverless functions. Several
 * writes that must succeed together go through `db.batch([...])`, which runs
 * them in one transaction.
 */
export const db = drizzle({ client: neon(env.DATABASE_URL), schema });

export * from "./schema";
