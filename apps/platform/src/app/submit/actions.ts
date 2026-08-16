"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { artifacts } from "@/db/schema";
import {
  storage,
  classifyFile,
  UnsupportedFileTypeError,
  FileTooLargeError,
} from "@/lib/storage";

const metadataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export async function createArtifact(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = metadataSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    redirect(`/submit?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/submit?error=${encodeURIComponent("A file is required")}`);
  }

  let fileType: "image" | "pdf";
  try {
    fileType = classifyFile(file);
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError || error instanceof FileTooLargeError) {
      redirect(`/submit?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  const artifactId = crypto.randomUUID();
  const { path: filePath } = await storage.save(file, artifactId);

  await db.insert(artifacts).values({
    id: artifactId,
    ownerId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    fileType,
    filePath,
  });

  redirect("/browse");
}
