"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function credentialsSignIn(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/browse",
    });
  } catch (error) {
    // signIn() itself throws a NEXT_REDIRECT internally on success, via
    // next/navigation's redirect() - only AuthError means an actual
    // failed login; anything else must be re-thrown so that internal
    // redirect can proceed normally.
    if (error instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw error;
  }
}

export async function oauthSignIn(provider: "google" | "github" | "orcid") {
  await signIn(provider, { redirectTo: "/browse" });
}
