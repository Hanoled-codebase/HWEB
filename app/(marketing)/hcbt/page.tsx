import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Monitor,
  ShieldCheck,
  Shuffle,
  Zap,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "HCBT / Exam Engine – Hanoled",
  description:
    "Create computer-based tests with automatic grading, time limits, question banks and anti-cheat measures. Built for Nigerian schools.",
};

const capabilities = [
  {
    icon: FileText,
    title: "Question Bank",
    description:
      "Build a rich question bank organised by subject, topic, and difficulty level. Import questions from spreadsheets or create them directly in the editor.",
  },
  {
    icon: Shuffle,
    title: "Randomised Papers",
    description:
      "Automatically shuffle questions and answer options for every student so no two papers are the same. Minimise cheating effortlessly.",
  },
  {
    icon: Clock,
    title: "Timed Exams",
    description:
      "Set per-exam or per-question time limits. The countdown timer is always visible to students, and the exam auto-submits when time runs out.",
  },
  {
    icon: Zap,
    title: "Instant Grading",
    description:
      "Objective questions are graded the moment a student submits. Results are available to teachers immediately — no manual marking needed.",
  },
  {
    icon: Monitor,
    title: "Any Device",
    description:
      "Students can take exams on phones, tablets, laptops, or desktops. The interface adapts to every screen size for a seamless experience.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Cheat Measures",
    description:
      "Full-screen mode, tab-switch detection, and copy-paste blocking help maintain exam integrity in both supervised and remote settings.",
  },
];

export default function HcbtPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <Monitor className="h-4 w-4" /> Exam Engine
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              HCBT — Computer-Based Testing,{" "}
              <span className="text-[#1447E6]">made simple</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Create, administer, and grade exams digitally. Save hours of
              manual marking, eliminate paper costs, and give students a modern
              exam experience.
            </p>
            <div className="mt-8">
              <Link
                href="/#contact-quote"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-lg shadow-[#1447E6]/25 hover:shadow-xl"
              >
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-500">
              Three steps from question bank to graded results.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create Questions",
                desc: "Add objective, theory, or multi-choice questions to your bank. Organise by subject and topic.",
              },
              {
                step: "02",
                title: "Set Up an Exam",
                desc: "Pick questions, set a time limit, choose randomisation and anti-cheat options, then publish.",
              },
              {
                step: "03",
                title: "Students Take It",
                desc: "Students log in, start the exam on any device, and get instant results when they submit.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden"
              >
                <span className="text-4xl font-black text-[#1447E6]/15">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities Grid */}
        <section className="bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                Key Capabilities
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:border-[#1447E6]/30 transition-all"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1447E6]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {cap.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1220] px-8 py-16 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white">
              Ditch the paper. Go digital.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Start running computer-based exams in your school today with
              Hanoled&apos;s HCBT engine.
            </p>
            <div className="mt-8">
              <Link
                href="/#contact-quote"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-lg shadow-[#1447E6]/30"
              >
                Book a Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
