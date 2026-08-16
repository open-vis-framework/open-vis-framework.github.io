import { credentialsSignIn, oauthSignIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>Log in</h1>

      {error === "invalid" && <p>Invalid email or password.</p>}

      <form action={credentialsSignIn}>
        <input name="email" type="email" placeholder="Email" required />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <button type="submit">Log in</button>
      </form>

      <form action={oauthSignIn.bind(null, "google")}>
        <button type="submit">Continue with Google</button>
      </form>
      <form action={oauthSignIn.bind(null, "github")}>
        <button type="submit">Continue with GitHub</button>
      </form>
      <form action={oauthSignIn.bind(null, "orcid")}>
        <button type="submit">Continue with ORCID</button>
      </form>

      <p>
        No account? <a href="/register">Register</a>
      </p>
    </main>
  );
}
