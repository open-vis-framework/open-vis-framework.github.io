import Link from "next/link";
import { PageContainer, PageHeading } from "@/components/container";
import { Button, FieldError, Input } from "@/components/form";
import { credentialsSignIn, oauthSignIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PageContainer>
      <PageHeading>Log in</PageHeading>

      {error === "invalid" && <FieldError>Invalid email or password.</FieldError>}

      <form action={credentialsSignIn} className="mt-4 flex flex-col gap-3">
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <Button type="submit">Log in</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        or
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="flex flex-col gap-2">
        <form action={oauthSignIn.bind(null, "google")}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with Google
          </Button>
        </form>
        <form action={oauthSignIn.bind(null, "github")}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with GitHub
          </Button>
        </form>
        <form action={oauthSignIn.bind(null, "orcid")}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with ORCID
          </Button>
        </form>
      </div>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        No account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </PageContainer>
  );
}
