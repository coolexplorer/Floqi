import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Floqi — AI Personal Autopilot",
  description: "Automate your daily workflow with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
