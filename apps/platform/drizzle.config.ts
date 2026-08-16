import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  // NOT "./out" — root .gitignore already ignores out/ for apps/web's
  // static export; migrations must be tracked in git.
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
