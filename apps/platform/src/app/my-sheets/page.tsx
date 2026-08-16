import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { PageContainer, PageHeading } from "@/components/container";
import { Button } from "@/components/form";

// Authorization, not just authentication: only ever queries sheets
// owned by the logged-in user (session.user.id) - never trusts a
// client-supplied id for "whose sheets to show".
export const dynamic = "force-dynamic";

export default async function MySheetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await db
    .select()
    .from(sheets)
    .where(eq(sheets.ownerId, session.user.id))
    .orderBy(desc(sheets.createdAt));

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageHeading>My sheets</PageHeading>
        <Link href="/submit">
          <Button variant="secondary">Submit a sheet</Button>
        </Link>
      </div>

      {items.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          You haven&apos;t submitted anything yet.
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
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
