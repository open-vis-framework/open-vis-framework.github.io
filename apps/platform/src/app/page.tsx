import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main>
      <h1>Open Vis Framework — Platform</h1>
      <p>Submit, browse, and curate information visualization projects.</p>

      <nav>
        <Link href="/browse">Browse</Link>
        {" · "}
        {session?.user ? (
          <Link href="/submit">Submit an artifact</Link>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            {" · "}
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </main>
  );
}
