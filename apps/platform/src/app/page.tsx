import Link from "next/link";
import { auth } from "@/auth";
import { PageContainer, PageHeading } from "@/components/container";
import { Button } from "@/components/form";

export default async function Home() {
  const session = await auth();

  return (
    <PageContainer>
      <PageHeading>Open Vis Framework</PageHeading>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        Submit, browse, and curate information visualization projects.
      </p>

      <div className="flex gap-3">
        <Link href="/browse">
          <Button variant="secondary">Browse</Button>
        </Link>
        {session?.user ? (
          <Link href="/submit">
            <Button>Submit an artifact</Button>
          </Link>
        ) : (
          <>
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Register</Button>
            </Link>
          </>
        )}
      </div>
    </PageContainer>
  );
}
