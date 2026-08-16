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

// A "Visualization Sheet" - see docs/adr/0004-visualization-sheets.md for
// the taxonomy this implements and why. `ownerId` is who can edit it
// (the submitting platform user); listed `authors` (sheetAuthors table,
// below) are free-text credits, not necessarily platform accounts -
// matches how arXiv/HAL/OSF handle authorship vs. the submitting user.
export const sheets = pgTable("sheets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),

  // --- Core metadata ---
  title: text("title").notNull(),
  summary: text("summary"),
  keywords: text("keywords"), // comma-separated, v1
  license: text("license"), // "CC-BY" | "CC0" | "MIT" | "all-rights-reserved" | "other"
  licenseOther: text("license_other"), // free text when license = "other"
  contactEmail: text("contact_email"),
  paperUrl: text("paper_url"),
  codeUrl: text("code_url"),

  // --- The visualization itself: exactly one of these two is set ---
  vizSourceType: text("viz_source_type").notNull(), // "file" | "url"
  fileType: text("file_type"), // "image" | "pdf" - only when vizSourceType = "file"
  filePath: text("file_path"), // only when vizSourceType = "file"
  vizUrl: text("viz_url"), // only when vizSourceType = "url" (e.g. an Observable notebook, hosted D3 page, Tableau Public embed)

  // --- Data provenance ---
  dataSources: text("data_sources"),
  dataCollectionMethod: text("data_collection_method"),
  dataTemporalCoverage: text("data_temporal_coverage"),
  dataTransformations: text("data_transformations"),
  dataLicense: text("data_license"),
  dataLimitations: text("data_limitations"),

  // --- Visual encoding & design ---
  chartTypes: text("chart_types"),
  toolsUsed: text("tools_used"),
  encodingDescription: text("encoding_description"),
  designRationale: text("design_rationale"),

  // --- AI involvement disclosure ---
  aiInvolvement: text("ai_involvement").notNull().default("none"), // "none" | "data_processing" | "design_assistance" | "code_generation" | "content_generation" | "other"
  aiDescription: text("ai_description"),
  aiHumanReview: text("ai_human_review"),

  // --- Limitations ---
  limitations: text("limitations"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sheetAuthors = pgTable("sheet_authors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sheetId: text("sheet_id")
    .notNull()
    .references(() => sheets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  affiliation: text("affiliation"),
  orcid: text("orcid"),
  email: text("email"),
  position: integer("position").notNull(), // display order
});
