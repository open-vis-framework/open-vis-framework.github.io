import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Vis Framework — Platform",
  description: "Submit, browse, and curate information visualization projects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
