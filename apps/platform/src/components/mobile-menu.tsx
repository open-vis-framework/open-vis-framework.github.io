"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/form";

export function MobileMenu({
  loggedIn,
  onLogout,
}: {
  loggedIn: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[65px] flex flex-col gap-3 border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <Link href="/browse" onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-300">
            Browse
          </Link>
          {loggedIn ? (
            <>
              <Link href="/my-sheets" onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-300">
                My sheets
              </Link>
              <Link href="/submit" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full">Submit</Button>
              </Link>
              <form action={onLogout} onSubmit={() => setOpen(false)}>
                <Button type="submit" variant="secondary" className="w-full">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full">Log in</Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full">Register</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
