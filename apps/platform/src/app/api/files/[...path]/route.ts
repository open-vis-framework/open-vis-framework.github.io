import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// Uploaded files live in UPLOADS_DIR, outside public/ deliberately -
// public/ is baked into the image at build time in standalone output
// (not writable at runtime), but uploads are runtime data. See
// src/lib/storage.ts.
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const uploadsDir = process.env.UPLOADS_DIR;
  if (!uploadsDir) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const uploadsRoot = path.resolve(uploadsDir);
  const requested = path.resolve(uploadsRoot, ...segments);

  // Filenames are always server-generated UUIDs (see storage.ts) - any
  // request that resolves outside uploadsRoot is not a legitimate file
  // reference, reject it outright rather than trying to serve it.
  if (!requested.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readFile(requested);
    const ext = path.extname(requested).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
