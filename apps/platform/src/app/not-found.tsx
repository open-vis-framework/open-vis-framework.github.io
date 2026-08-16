import Link from "next/link";
import { PageContainer, PageHeading } from "@/components/container";
import { Button } from "@/components/form";

export default function NotFound() {
  return (
    <PageContainer>
      <PageHeading>Page not found</PageHeading>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Nothing lives at this address. It may have been removed, or the link
        might be wrong.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
        <Link href="/browse">
          <Button variant="secondary">Browse sheets</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
