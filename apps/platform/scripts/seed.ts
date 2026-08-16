// Dev convenience: seeds one simple, fixed-credential test account so you
// don't have to click through /register every time you reset the local
// DB. Idempotent - safe to run repeatedly. NOT wired into any deploy
// path; local-dev-only tooling, invoked via `pnpm --filter platform
// db:seed`.
//
// Run directly with `node --experimental-strip-types` (see package.json)
// rather than through Next's bundler, so relative imports here need
// explicit .ts extensions - unlike app code, which never runs this way.
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { users } from "../src/db/schema.ts";
import { hashPassword } from "../src/lib/password.ts";

const TEST_EMAIL = "admin@example.com";
const TEST_PASSWORD = "admin";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { users } });

const existing = await db.query.users.findFirst({
  where: eq(users.email, TEST_EMAIL),
});

if (existing) {
  console.log(`Test account already exists: ${TEST_EMAIL}`);
} else {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  await db.insert(users).values({ email: TEST_EMAIL, passwordHash });
  console.log(`Seeded test account: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
}

await client.end();
