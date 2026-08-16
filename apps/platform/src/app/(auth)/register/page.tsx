import { register } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <h1>Register</h1>

      {error && <p>{error}</p>}

      <form action={register}>
        <input name="email" type="email" placeholder="Email" required />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
        />
        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}
