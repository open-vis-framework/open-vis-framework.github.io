"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sheets, sheetAuthors } from "@/db/schema";
import {
  storage,
  classifyFile,
  UnsupportedFileTypeError,
  FileTooLargeError,
} from "@/lib/storage";

const AI_OPTIONS = [
  "none",
  "data_processing",
  "design_assistance",
  "code_generation",
  "content_generation",
  "other",
] as const;

const LICENSE_OPTIONS = ["CC-BY", "CC0", "MIT", "all-rights-reserved", "other"] as const;

const metadataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().optional(),
  keywords: z.string().optional(),
  license: z.enum(LICENSE_OPTIONS).optional(),
  licenseOther: z.string().optional(),
  contactEmail: z.string().optional(),
  paperUrl: z.string().optional(),
  codeUrl: z.string().optional(),
  vizSourceType: z.enum(["file", "url"]),
  vizUrl: z.string().optional(),
  dataSources: z.string().optional(),
  dataCollectionMethod: z.string().optional(),
  dataTemporalCoverage: z.string().optional(),
  dataTransformations: z.string().optional(),
  dataLicense: z.string().optional(),
  dataLimitations: z.string().optional(),
  chartTypes: z.string().optional(),
  toolsUsed: z.string().optional(),
  encodingDescription: z.string().optional(),
  designRationale: z.string().optional(),
  aiInvolvement: z.enum(AI_OPTIONS).default("none"),
  aiDescription: z.string().optional(),
  aiHumanReview: z.string().optional(),
  limitations: z.string().optional(),
});

// Empty strings from optional text inputs should read as "not provided",
// not as an empty-but-present value cluttering the DB/UI later.
function orNull(value: string | undefined): string | null {
  const s = value?.trim();
  return s ? s : null;
}

function field(formData: FormData, name: string): string | undefined {
  return formData.get(name)?.toString() || undefined;
}

export async function createSheet(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = metadataSchema.safeParse({
    title: field(formData, "title"),
    summary: field(formData, "summary"),
    keywords: field(formData, "keywords"),
    license: field(formData, "license"),
    licenseOther: field(formData, "licenseOther"),
    contactEmail: field(formData, "contactEmail"),
    paperUrl: field(formData, "paperUrl"),
    codeUrl: field(formData, "codeUrl"),
    vizSourceType: field(formData, "vizSourceType"),
    vizUrl: field(formData, "vizUrl"),
    dataSources: field(formData, "dataSources"),
    dataCollectionMethod: field(formData, "dataCollectionMethod"),
    dataTemporalCoverage: field(formData, "dataTemporalCoverage"),
    dataTransformations: field(formData, "dataTransformations"),
    dataLicense: field(formData, "dataLicense"),
    dataLimitations: field(formData, "dataLimitations"),
    chartTypes: field(formData, "chartTypes"),
    toolsUsed: field(formData, "toolsUsed"),
    encodingDescription: field(formData, "encodingDescription"),
    designRationale: field(formData, "designRationale"),
    aiInvolvement: field(formData, "aiInvolvement"),
    aiDescription: field(formData, "aiDescription"),
    aiHumanReview: field(formData, "aiHumanReview"),
    limitations: field(formData, "limitations"),
  });

  if (!parsed.success) {
    redirect(`/submit?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const data = parsed.data;

  // Authors: repeated fields, zipped back together by index (see
  // authors-field.tsx). Only rows with a non-empty name count.
  const names = formData.getAll("authorName").map((v) => v.toString());
  const affiliations = formData.getAll("authorAffiliation").map((v) => v.toString());
  const orcids = formData.getAll("authorOrcid").map((v) => v.toString());
  const emails = formData.getAll("authorEmail").map((v) => v.toString());
  const authors = names
    .map((name, i) => ({
      name: name.trim(),
      affiliation: affiliations[i]?.trim() || null,
      orcid: orcids[i]?.trim() || null,
      email: emails[i]?.trim() || null,
    }))
    .filter((a) => a.name.length > 0);

  if (authors.length === 0) {
    redirect(`/submit?error=${encodeURIComponent("At least one author is required")}`);
  }

  // The visualization itself: exactly one of file / URL.
  let fileType: "image" | "pdf" | null = null;
  let filePath: string | null = null;
  let vizUrl: string | null = null;
  const sheetId = crypto.randomUUID();

  if (data.vizSourceType === "file") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect(`/submit?error=${encodeURIComponent("A file is required")}`);
    }
    try {
      fileType = classifyFile(file);
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError || error instanceof FileTooLargeError) {
        redirect(`/submit?error=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
    filePath = (await storage.save(file, sheetId)).path;
  } else {
    vizUrl = orNull(data.vizUrl);
    if (!vizUrl) {
      redirect(`/submit?error=${encodeURIComponent("A URL is required")}`);
    }
  }

  await db.insert(sheets).values({
    id: sheetId,
    ownerId: session.user.id,
    title: data.title,
    summary: orNull(data.summary),
    keywords: orNull(data.keywords),
    license: data.license ?? null,
    licenseOther: orNull(data.licenseOther),
    contactEmail: orNull(data.contactEmail),
    paperUrl: orNull(data.paperUrl),
    codeUrl: orNull(data.codeUrl),
    vizSourceType: data.vizSourceType,
    fileType,
    filePath,
    vizUrl,
    dataSources: orNull(data.dataSources),
    dataCollectionMethod: orNull(data.dataCollectionMethod),
    dataTemporalCoverage: orNull(data.dataTemporalCoverage),
    dataTransformations: orNull(data.dataTransformations),
    dataLicense: orNull(data.dataLicense),
    dataLimitations: orNull(data.dataLimitations),
    chartTypes: orNull(data.chartTypes),
    toolsUsed: orNull(data.toolsUsed),
    encodingDescription: orNull(data.encodingDescription),
    designRationale: orNull(data.designRationale),
    aiInvolvement: data.aiInvolvement,
    aiDescription: orNull(data.aiDescription),
    aiHumanReview: orNull(data.aiHumanReview),
    limitations: orNull(data.limitations),
  });

  await db.insert(sheetAuthors).values(
    authors.map((a, i) => ({ ...a, sheetId, position: i })),
  );

  redirect(`/sheets/${sheetId}`);
}
