import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/form";
import { MobileMenu } from "@/components/mobile-menu";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function Header() {
  const session = await auth();

  return (
    <header className="relative border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-semibold text-gray-900 dark:text-gray-100"
        >
          Open Vis Framework
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm sm:flex">
          <Link
            href="/browse"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Browse
          </Link>

          {session?.user ? (
            <>
              <Link
                href="/my-sheets"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                My sheets
              </Link>
              <Link href="/submit">
                <Button variant="secondary">Submit</Button>
              </Link>
              <form action={logout}>
                <Button type="submit" variant="secondary">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </nav>

        <MobileMenu loggedIn={!!session?.user} onLogout={logout} />
      </div>
    </header>
  );
}
