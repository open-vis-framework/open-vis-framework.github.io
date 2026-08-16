import Link from "next/link";
import { PageContainer, PageHeading } from "@/components/container";
import { Button, FieldError, Input } from "@/components/form";
import { register } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PageContainer>
      <PageHeading>Register</PageHeading>

      {error && <FieldError>{error}</FieldError>}

      <form action={register} className="mt-4 flex flex-col gap-3">
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
        />
        <Button type="submit">Register</Button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </PageContainer>
  );
}
