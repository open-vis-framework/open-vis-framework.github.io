import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { artifacts } from "@/db/schema";

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
    <main>
      <h1>Browse</h1>
      <p>
        <Link href="/submit">Submit an artifact</Link>
      </p>

      {items.length === 0 && <p>Nothing submitted yet.</p>}

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/artifacts/${item.id}`}>{item.title}</Link>
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
