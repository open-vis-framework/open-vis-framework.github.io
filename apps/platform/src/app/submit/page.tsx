import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createArtifact } from "./actions";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { error } = await searchParams;

  return (
    <main>
      <h1>Submit an artifact</h1>

      {error && <p>{error}</p>}

      <form action={createArtifact} encType="multipart/form-data">
        <input name="title" type="text" placeholder="Title" required />
        <textarea name="description" placeholder="Description" />
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          required
        />
        <button type="submit">Submit</button>
      </form>
    </main>
  );
}
