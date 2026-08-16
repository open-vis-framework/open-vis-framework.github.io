import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { artifacts } from "@/db/schema";
import { PageContainer, PageHeading } from "@/components/container";
import { Button } from "@/components/form";

// Without this, Next statically prerenders this page at build time (no
// cookies/headers/dynamic params in use) - meaning it'd freeze to
// whatever existed in the DB when it was BUILT and never show new
// submissions without a full rebuild+redeploy. Also matters for the
// deploy server specifically: a static DB read at build time would fail
// there if Postgres isn't reachable during the build step.
export const dynamic = "force-dynamic";

// No auth check - public browsing, deliberately.
export default async function BrowsePage() {
  const items = await db
    .select()
    .from(artifacts)
    .orderBy(desc(artifacts.createdAt));

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageHeading>Browse</PageHeading>
        <Link href="/submit">
          <Button variant="secondary">Submit an artifact</Button>
        </Link>
      </div>

      {items.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Nothing submitted yet.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/artifacts/${item.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
            >
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </h2>
              {item.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
