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
        An open registration platform for documenting, sharing, and
        scrutinizing data visualizations — their data provenance, design
        rationale, known limitations, and the role AI played in making them.
      </p>

      <div className="flex gap-3">
        <Link href="/browse">
          <Button variant="secondary">Browse sheets</Button>
        </Link>
        {session?.user ? (
          <Link href="/submit">
            <Button>Submit a sheet</Button>
          </Link>
        ) : (
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        )}
      </div>
    </PageContainer>
  );
}
