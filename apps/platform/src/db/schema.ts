// Drizzle schema. The users/accounts/sessions/verificationTokens shape
// follows Auth.js's DrizzleAdapter conventions exactly (see
// https://authjs.dev/getting-started/adapters/drizzle) — don't rename
// columns here without also checking the adapter config in src/auth.ts.
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  // Nullable: OAuth providers (ORCID in particular) don't always expose
  // an email address.
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Null for OAuth-only users (no credentials login set up).
  passwordHash: text("password_hash"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// Our own domain table. Status/moderation is deliberately not modeled
// yet (not requested this round — see docs/ROADMAP.md); adding a
// nullable `status` column later is a non-breaking migration regardless,
// so there's nothing to design in ahead of time.
export const artifacts = pgTable("artifacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileType: text("file_type").notNull(), // "image" | "pdf"
  filePath: text("file_path").notNull(), // storage-relative path (see src/lib/storage.ts)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
