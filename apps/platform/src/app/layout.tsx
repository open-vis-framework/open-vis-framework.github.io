import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Vis Framework — Platform",
  description: "Submit, browse, and curate information visualization projects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
