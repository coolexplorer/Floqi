import type { Metadata } from "next";
import { Agentation } from "agentation";
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
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[300] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
