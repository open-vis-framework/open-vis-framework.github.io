import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageContainer, PageHeading } from "@/components/container";
import { Button, FieldError, Input, Textarea } from "@/components/form";
import { AuthorsField } from "./authors-field";
import { VizSourceField } from "./viz-source-field";
import { createSheet } from "./actions";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
      <legend className="-mt-9 bg-white pr-2 text-sm font-medium text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { error } = await searchParams;

  return (
    <PageContainer>
      <PageHeading>Submit a visualization sheet</PageHeading>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Document the provenance, design decisions, and context behind your
        visualization. Only Title and Authors are required — fill in as much
        of the rest as you can.
      </p>

      {error && <FieldError>{error}</FieldError>}

      <form
        action={createSheet}
        encType="multipart/form-data"
        className="flex flex-col gap-6"
      >
        <Section title="Core metadata">
          <Input name="title" placeholder="Title" required />
          <Textarea name="summary" placeholder="Summary / abstract" rows={3} />
          <Input name="keywords" placeholder="Keywords (comma-separated)" />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="license"
              defaultValue="CC-BY"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="CC-BY">CC-BY</option>
              <option value="CC0">CC0</option>
              <option value="MIT">MIT</option>
              <option value="all-rights-reserved">All rights reserved</option>
              <option value="other">Other</option>
            </select>
            <Input name="licenseOther" placeholder="Other license (if selected)" />
          </div>
          <Input name="contactEmail" type="email" placeholder="Contact email (optional)" />
          <div className="grid grid-cols-2 gap-2">
            <Input name="paperUrl" type="url" placeholder="Related paper URL (optional)" />
            <Input name="codeUrl" type="url" placeholder="Code repository URL (optional)" />
          </div>
        </Section>

        <Section title="Authors">
          <AuthorsField />
        </Section>

        <Section title="The visualization">
          <VizSourceField />
        </Section>

        <Section title="Data provenance">
          <Textarea name="dataSources" placeholder="Data source(s) and citation/URL" rows={2} />
          <Input name="dataCollectionMethod" placeholder="Collection method" />
          <Input name="dataTemporalCoverage" placeholder="Temporal coverage (e.g. 2015–2023)" />
          <Textarea name="dataTransformations" placeholder="Transformations / cleaning applied" rows={2} />
          <Input name="dataLicense" placeholder="Data license" />
          <Textarea name="dataLimitations" placeholder="Known data limitations / uncertainty" rows={2} />
        </Section>

        <Section title="Visual encoding &amp; design">
          <Input name="chartTypes" placeholder="Chart type(s) / technique(s)" />
          <Input name="toolsUsed" placeholder="Tools / libraries used" />
          <Textarea name="encodingDescription" placeholder="Encoding description (what maps to what)" rows={2} />
          <Textarea name="designRationale" placeholder="Design rationale (why these choices, alternatives considered, intended audience)" rows={3} />
        </Section>

        <Section title="AI involvement">
          <select
            name="aiInvolvement"
            defaultValue="none"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="none">No AI involvement</option>
            <option value="data_processing">Data processing</option>
            <option value="design_assistance">Design assistance</option>
            <option value="code_generation">Code generation</option>
            <option value="content_generation">Content generation</option>
            <option value="other">Other</option>
          </select>
          <Textarea name="aiDescription" placeholder="How was AI involved? (required if any of the above selected)" rows={2} />
          <Textarea name="aiHumanReview" placeholder="Human review / oversight process" rows={2} />
        </Section>

        <Section title="Limitations">
          <Textarea name="limitations" placeholder="Known limitations of the visualization itself; what not to conclude from it" rows={3} />
        </Section>

        <Button type="submit" className="self-start">
          Submit sheet
        </Button>
      </form>
    </PageContainer>
  );
}
