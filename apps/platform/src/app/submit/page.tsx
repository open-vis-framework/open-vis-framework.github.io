import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageContainer, PageHeading } from "@/components/container";
import { Button, FieldError, Input, Textarea } from "@/components/form";
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
    <PageContainer>
      <PageHeading>Submit an artifact</PageHeading>

      {error && <FieldError>{error}</FieldError>}

      <form
        action={createArtifact}
        encType="multipart/form-data"
        className="mt-4 flex flex-col gap-3"
      >
        <Input name="title" type="text" placeholder="Title" required />
        <Textarea name="description" placeholder="Description" rows={4} />
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          required
          className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 dark:text-gray-400 dark:file:bg-gray-100 dark:file:text-gray-900 dark:hover:file:bg-white"
        />
        <Button type="submit" className="self-start">
          Submit
        </Button>
      </form>
    </PageContainer>
  );
}
