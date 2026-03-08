'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { Card } from "@/components/ui/Card";
import { PricingTable } from "@/components/tables/PricingTable";
import type { PricingPlan } from "@/components/tables/PricingTable";
import {
  Sun,
  Mail,
  BookOpen,
  ClipboardList,
  Bookmark,
  Plug,
  LayoutTemplate,
  Bot,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/dashboard");
      }
    };
    checkAuth();
  }, [router]);

  return (
    <>
      <TopNavBar transparent />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section
          data-testid="hero"
          aria-labelledby="hero-headline"
          className="relative overflow-hidden bg-gradient-to-b from-blue-600 to-blue-700 pb-24 pt-16 text-white"
        >
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1
              id="hero-headline"
              className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Automate Your Day with AI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100 sm:text-xl">
              Link Gmail, Calendar, and Notion — and let AI handle your daily tasks
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center rounded-lg bg-white px-8 text-base font-semibold text-blue-700 shadow-md transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
              >
                <span>Get started</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" aria-hidden="true" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" className="absolute h-0 w-0 overflow-hidden" />
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────────────────── */}
        <section
          id="features"
          aria-labelledby="how-it-works-heading"
          className="bg-white py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2
              id="how-it-works-heading"
              className="text-center text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-500">
              Get up and running in minutes — no coding required.
            </p>

            <div className="mt-14 grid gap-8 sm:grid-cols-1 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  data-testid={`step-${index + 1}`}
                  className="step flex flex-col items-center text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                    <step.Icon
                      className="h-7 w-7 text-blue-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-4 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Templates Showcase ──────────────────────────────────────────── */}
        <section
          aria-labelledby="templates-heading"
          className="bg-slate-50 py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2
              id="templates-heading"
              className="text-center text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              Ready-Made Automation Templates
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-500">
              Start automating immediately with battle-tested templates.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl, index) => (
                <div
                  key={tpl.title}
                  data-testid={`template-card-${index}`}
                >
                  <Card variant="elevated" className="flex flex-col gap-4 h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <tpl.Icon
                        className="h-5 w-5 text-blue-600"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {tpl.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {tpl.description}
                      </p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section
          data-testid="pricing-section"
          aria-labelledby="pricing-heading"
          className="bg-white py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2
              id="pricing-heading"
              className="text-center text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-500">
              Start with zero cost, upgrade when you need more.
            </p>

            <div className="mt-12">
              <PricingTable plans={pricingPlans} />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Floqi. All rights reserved.
        </div>
      </footer>
    </>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const steps = [
  {
    Icon: Plug,
    title: "Connect your services",
    description:
      "Link your accounts in a few clicks. Secure OAuth — no passwords stored.",
  },
  {
    Icon: LayoutTemplate,
    title: "Set up your workflow",
    description:
      "Choose from ready-made templates or build custom ones. Customize your schedule and conditions.",
  },
  {
    Icon: Bot,
    title: "Sit back and let AI work",
    description:
      "Your AI agent runs on autopilot — summarizing, triaging, saving, and notifying you automatically.",
  },
];

const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    priceSubtext: '/month',
    ctaLabel: 'Get Started',
    features: [
      { label: '30 executions/month', included: true },
      { label: '5 automations', included: true },
      { label: 'Basic templates', included: true },
      { label: 'Community support', included: true },
      { label: 'Priority support', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    priceSubtext: '/month',
    popular: true,
    ctaLabel: 'Upgrade',
    features: [
      { label: '500 executions/month', included: true },
      { label: 'Unlimited automations', included: true },
      { label: 'All templates', included: true },
      { label: 'Priority support', included: true },
      { label: 'Advanced analytics', included: true },
    ],
  },
  {
    name: 'BYOK',
    price: '-',
    priceSubtext: 'bring your key',
    ctaLabel: 'Get Started',
    features: [
      { label: 'Unlimited executions', included: true },
      { label: 'Unlimited automations', included: true },
      { label: 'Bring your own API key', included: true },
      { label: 'All templates', included: true },
      { label: 'Community support', included: true },
    ],
  },
];

const templates = [
  {
    Icon: Sun,
    title: "Morning Briefing",
    description:
      "Start your day with a daily schedule + email + weather summary delivered to your inbox.",
  },
  {
    Icon: Mail,
    title: "Email Triage",
    description:
      "Auto-categorize emails by priority so you never miss what matters.",
  },
  {
    Icon: BookOpen,
    title: "Reading Digest",
    description:
      "Daily news summaries on topics you care about, saved to your workspace.",
  },
  {
    Icon: ClipboardList,
    title: "Weekly Review",
    description:
      "Automated weekly activity report highlighting your wins and next steps.",
  },
  {
    Icon: Bookmark,
    title: "Smart Save",
    description:
      "Auto-save important emails and articles to your workspace with one rule.",
  },
];
