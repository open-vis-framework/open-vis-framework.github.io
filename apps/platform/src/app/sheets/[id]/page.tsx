import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sheets, sheetAuthors } from "@/db/schema";
import { PageContainer, PageHeading } from "@/components/container";

// Already dynamic in practice (no generateStaticParams defined), but
// explicit for the same reason as browse/page.tsx - this always needs a
// live DB read, never a build-time snapshot.
export const dynamic = "force-dynamic";

const AI_LABELS: Record<string, string> = {
  none: "No AI was involved in making this visualization.",
  data_processing: "AI was involved in data processing.",
  design_assistance: "AI was involved in design assistance.",
  code_generation: "AI was involved in code generation.",
  content_generation: "AI was involved in content generation.",
  other: "AI was involved (other).",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 py-6 dark:border-gray-800">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {label}:
      </span>{" "}
      {value}
    </p>
  );
}

// No auth check - public browsing, deliberately.
export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sheet = await db.query.sheets.findFirst({ where: eq(sheets.id, id) });
  if (!sheet) notFound();

  const authors = await db
    .select()
    .from(sheetAuthors)
    .where(eq(sheetAuthors.sheetId, id))
    .orderBy(asc(sheetAuthors.position));

  const hasDataProvenance =
    sheet.dataSources ||
    sheet.dataCollectionMethod ||
    sheet.dataTemporalCoverage ||
    sheet.dataTransformations ||
    sheet.dataLicense ||
    sheet.dataLimitations;

  const hasDesign =
    sheet.chartTypes ||
    sheet.toolsUsed ||
    sheet.encodingDescription ||
    sheet.designRationale;

  return (
    <PageContainer>
      <Link
        href="/browse"
        className="mb-6 inline-block text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back to browse
      </Link>

      <PageHeading>{sheet.title}</PageHeading>

      <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
        {authors.map((a, i) => (
          <span key={a.id}>
            {i > 0 && ", "}
            {a.name}
            {a.affiliation && ` (${a.affiliation})`}
          </span>
        ))}
      </p>

      {sheet.summary && (
        <p className="mt-4 text-gray-700 dark:text-gray-300">{sheet.summary}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {sheet.paperUrl && (
          <a href={sheet.paperUrl} className="text-blue-600 underline dark:text-blue-400">
            Paper
          </a>
        )}
        {sheet.codeUrl && (
          <a href={sheet.codeUrl} className="text-blue-600 underline dark:text-blue-400">
            Code
          </a>
        )}
        {sheet.contactEmail && (
          <a href={`mailto:${sheet.contactEmail}`} className="text-blue-600 underline dark:text-blue-400">
            Contact
          </a>
        )}
      </div>

      <div className="mt-6">
        {sheet.vizSourceType === "file" && sheet.filePath ? (
          sheet.fileType === "image" ? (
            // next/image needs the optimization server, disabled for this
            // MVP (see next.config.ts); plain <img> is fine here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${sheet.filePath}`}
              alt={sheet.title}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
            />
          ) : (
            <a
              href={`/api/files/${sheet.filePath}`}
              className="inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
            >
              View PDF
            </a>
          )
        ) : (
          sheet.vizUrl && (
            <a
              href={sheet.vizUrl}
              className="inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
            >
              View visualization →
            </a>
          )
        )}
      </div>

      {hasDataProvenance && (
        <Section title="Data provenance">
          <Field label="Source(s)" value={sheet.dataSources} />
          <Field label="Collection method" value={sheet.dataCollectionMethod} />
          <Field label="Temporal coverage" value={sheet.dataTemporalCoverage} />
          <Field label="Transformations" value={sheet.dataTransformations} />
          <Field label="Data license" value={sheet.dataLicense} />
          <Field label="Data limitations" value={sheet.dataLimitations} />
        </Section>
      )}

      {hasDesign && (
        <Section title="Visual encoding &amp; design">
          <Field label="Chart type(s)" value={sheet.chartTypes} />
          <Field label="Tools used" value={sheet.toolsUsed} />
          <Field label="Encoding" value={sheet.encodingDescription} />
          <Field label="Design rationale" value={sheet.designRationale} />
        </Section>
      )}

      <Section title="AI involvement">
        <p>{AI_LABELS[sheet.aiInvolvement] ?? sheet.aiInvolvement}</p>
        <Field label="Details" value={sheet.aiDescription} />
        <Field label="Human review" value={sheet.aiHumanReview} />
      </Section>

      {sheet.limitations && (
        <Section title="Limitations">
          <p>{sheet.limitations}</p>
        </Section>
      )}

      <Section title="License &amp; keywords">
        <Field
          label="License"
          value={sheet.license === "other" ? sheet.licenseOther : sheet.license}
        />
        <Field label="Keywords" value={sheet.keywords} />
      </Section>
    </PageContainer>
  );
}
