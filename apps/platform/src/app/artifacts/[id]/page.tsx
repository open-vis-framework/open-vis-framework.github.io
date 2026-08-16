import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artifacts } from "@/db/schema";

// Already dynamic in practice (no generateStaticParams defined), but
// explicit for the same reason as browse/page.tsx - this always needs a
// live DB read, never a build-time snapshot.
export const dynamic = "force-dynamic";

// No auth check - public browsing, deliberately.
export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artifact = await db.query.artifacts.findFirst({
    where: eq(artifacts.id, id),
  });
  if (!artifact) notFound();

  const fileUrl = `/api/files/${artifact.filePath}`;

  return (
    <main>
      <h1>{artifact.title}</h1>
      {artifact.description && <p>{artifact.description}</p>}

      {artifact.fileType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/image
        // needs the optimization server, disabled for this MVP (see
        // next.config.ts); plain <img> is fine here.
        <img src={fileUrl} alt={artifact.title} />
      ) : (
        <a href={fileUrl}>View PDF</a>
      )}
    </main>
  );
}
