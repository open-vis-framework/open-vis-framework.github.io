"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/auth";

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      `/register?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { email, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    redirect("/register?error=" + encodeURIComponent("Email already in use"));
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, passwordHash });

  // Auto-login right after registering rather than bouncing to /login -
  // one less step in the workflow.
  await signIn("credentials", { email, password, redirectTo: "/browse" });
}
