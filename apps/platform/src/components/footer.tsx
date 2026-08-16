import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-8 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Open Vis Framework — an open registration platform for documenting and scrutinizing data visualizations.</p>
        <div className="flex gap-4">
          <Link href="/browse" className="hover:text-gray-900 dark:hover:text-gray-100">
            Browse
          </Link>
          <a
            href="https://github.com/open-vis-framework/open-vis-framework.github.io"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
