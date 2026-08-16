import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface Storage {
  save(file: File, artifactId: string): Promise<{ path: string }>;
}

const ALLOWED_MIME_TYPES: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}

/** Validates a file's MIME type/size and classifies it. Throws on either
 * failure - callers decide how to surface that (see submit/actions.ts). */
export function classifyFile(file: File): "image" | "pdf" {
  const kind = ALLOWED_MIME_TYPES[file.type];
  if (!kind) {
    throw new UnsupportedFileTypeError(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTooLargeError(
      `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 10MB)`,
    );
  }
  return kind;
}

// Disk-backed for now, behind this interface so swapping to S3/MinIO
// later (see docs/ROADMAP.md) doesn't touch calling code.
class DiskStorage implements Storage {
  async save(file: File, artifactId: string): Promise<{ path: string }> {
    // Server-generated name, never the user-supplied filename - avoids
    // path traversal and accidental overwrites entirely.
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    const relPath = `${artifactId}.${ext}`;

    const dir = process.env.UPLOADS_DIR;
    if (!dir) throw new Error("UPLOADS_DIR is not set");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, relPath), Buffer.from(await file.arrayBuffer()));

    return { path: relPath };
  }
}

export const storage: Storage = new DiskStorage();
