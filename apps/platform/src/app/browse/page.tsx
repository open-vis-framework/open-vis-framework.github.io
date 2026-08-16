import Link from "next/link";
import { desc, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { PageContainer, PageHeading } from "@/components/container";
import { Input, Button } from "@/components/form";

// Without this, Next statically prerenders this page at build time (no
// cookies/headers/dynamic params in use) - meaning it'd freeze to
// whatever existed in the DB when it was BUILT and never show new
// submissions without a full rebuild+redeploy. Also matters for the
// deploy server specifically: a static DB read at build time would fail
// there if Postgres isn't reachable during the build step.
export const dynamic = "force-dynamic";

const AI_LABELS: Record<string, string> = {
  none: "No AI",
  data_processing: "AI: data processing",
  design_assistance: "AI: design assistance",
  code_generation: "AI: code generation",
  content_generation: "AI: content generation",
  other: "AI: other",
};

// No auth check - public browsing, deliberately.
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const items = await db
    .select()
    .from(sheets)
    .where(
      query
        ? or(
            ilike(sheets.title, `%${query}%`),
            ilike(sheets.summary, `%${query}%`),
            ilike(sheets.keywords, `%${query}%`),
          )
        : undefined,
    )
    .orderBy(desc(sheets.createdAt));

  return (
    <PageContainer>
      <PageHeading>Browse</PageHeading>

      <form method="GET" className="mb-6 flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by title, summary, or keywords"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {items.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          {query ? `No sheets match "${query}".` : "Nothing submitted yet."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/sheets/${item.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
            >
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </h2>
              {item.summary && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.summary}
                </p>
              )}
              <div className="mt-2 flex gap-2 text-xs text-gray-400 dark:text-gray-500">
                {item.license && <span>{item.license}</span>}
                <span>{AI_LABELS[item.aiInvolvement] ?? item.aiInvolvement}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
