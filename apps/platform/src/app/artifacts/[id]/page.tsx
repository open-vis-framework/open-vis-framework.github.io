import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artifacts } from "@/db/schema";
import { PageContainer, PageHeading } from "@/components/container";

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
    <PageContainer>
      <Link
        href="/browse"
        className="mb-6 inline-block text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back to browse
      </Link>

      <PageHeading>{artifact.title}</PageHeading>
      {artifact.description && (
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {artifact.description}
        </p>
      )}

      {artifact.fileType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/image
        // needs the optimization server, disabled for this MVP (see
        // next.config.ts); plain <img> is fine here.
        <img
          src={fileUrl}
          alt={artifact.title}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
        />
      ) : (
        <a
          href={fileUrl}
          className="inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
        >
          View PDF
        </a>
      )}
    </PageContainer>
  );
}
