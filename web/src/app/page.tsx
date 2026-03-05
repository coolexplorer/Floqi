import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Floqi
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI Personal Autopilot — Automate your daily workflow
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          Landing page — full implementation coming in Sprint 5
        </p>
      </div>
    </main>
  );
}
