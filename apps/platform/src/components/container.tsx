export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-12">{children}</div>
  );
}

export function PageHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
      {children}
    </h1>
  );
}
