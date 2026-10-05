import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import {
  QuestionBankIllustration,
  RandomisedPapersIllustration,
  TimedExamsIllustration,
  InstantGradingIllustration,
  AnyDeviceIllustration,
  AntiCheatIllustration,
} from "@/components/landing/ModuleIllustrations";
import { HeroUnderline, RiseWords } from "@/components/landing/motion";
import { InView } from "@/components/landing/InView";

export const metadata: Metadata = {
  title: "HCBT / Exam Engine – Hanoled",
  description:
    "Create computer-based tests with automatic grading, time limits, question banks and anti-cheat measures. Built for Nigerian schools.",
};

const capabilities = [
  {
    icon: QuestionBankIllustration,
    title: "Question Bank",
    description:
      "Build a rich question bank organised by subject, topic, and difficulty level. Import questions from spreadsheets or create them directly.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: RandomisedPapersIllustration,
    title: "Randomised Papers",
    description:
      "Automatically shuffle questions and answer options for every student so no two papers are the same. Minimise cheating effortlessly.",
    color: "bg-[#F5A623]/10 text-[#0B1220]",
  },
  {
    icon: TimedExamsIllustration,
    title: "Timed Exams",
    description:
      "Set per-exam or per-question time limits. The countdown timer is always visible to students, and the exam auto-submits when time runs out.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: InstantGradingIllustration,
    title: "Instant Grading",
    description:
      "Objective questions are graded the moment a student submits. Results are available to teachers immediately — no manual marking needed.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: AnyDeviceIllustration,
    title: "Any Device",
    description:
      "Students can take exams on phones, tablets, laptops, or desktops. The interface adapts to every screen size for a seamless experience.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: AntiCheatIllustration,
    title: "Anti-Cheat Measures",
    description:
      "Full-screen mode, tab-switch detection, and copy-paste blocking help maintain exam integrity in both supervised and remote settings.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
];

export default function HcbtPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans selection:bg-[#1447E6] selection:text-white">
      <MarketingHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[3rem] bg-white px-6 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-12 sm:py-20 lg:px-16 text-center border border-slate-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-8 flex flex-col items-center">
            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
                <RiseWords>
                  <span className="text-[#1447E6]">HCBT</span> — Computer-Based Testing, <br />
                  made simple
                </RiseWords>
              </h1>
              {/* Wavy accent line under title: writes itself once the headline has risen */}
              <HeroUnderline />
            </div>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              Create, administer, and grade exams digitally. Save hours of
              manual marking, eliminate paper costs, and give students a modern
              exam experience.
            </p>

            <div className="pt-4 flex justify-center">
              <Link
                href="/#contact-quote"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#1447E6] px-8 font-bold text-white transition-all hover:bg-[#0b33b3] hover:-translate-y-1 hover:shadow-lg shadow-[#1447E6]/30"
              >
                Request a Demo <ArrowRight className="mk-arrow-x h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-slate-500 font-semibold">
              Three simple steps from question bank to graded results.
            </p>
          </div>
          
          <InView className="grid gap-6 md:grid-cols-3" style={{ ["--mk-rest" as string]: "rgb(20 71 230 / 0.05)", ["--mk-wave" as string]: "rgb(20 71 230 / 0.3)" }}>
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
            ].map((item, i) => (
              <div
                key={item.step}
                className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md overflow-hidden"
              >
                <span className="mk-wave absolute -right-4 -top-4 text-8xl font-black text-[#1447E6]/5 group-hover:text-[#1447E6]/10 transition-colors" style={{ ["--i" as string]: i }}>
                  {item.step}
                </span>
                <div className="relative z-10">
                  <span className="text-3xl font-black text-[#1447E6] mb-4 block">
                    {item.step}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-4">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </InView>
        </section>

        {/* Capabilities Grid */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              Key Capabilities
            </h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${cap.color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {cap.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#1447E6] px-8 py-16 sm:px-12 sm:py-20 text-center shadow-2xl">
            <svg className="absolute top-0 right-0 w-full h-full text-white/5 opacity-50" viewBox="0 0 400 400" fill="none">
               <circle cx="350" cy="50" r="150" stroke="currentColor" strokeWidth="40" />
               <circle cx="350" cy="50" r="250" stroke="currentColor" strokeWidth="20" strokeDasharray="20 20" />
            </svg>
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl font-extrabold text-white sm:text-5xl leading-tight">
                Ditch the paper. Go digital.
              </h2>
              <p className="text-lg text-white/80 font-medium">
                Start running computer-based exams in your school today with
                Hanoled&apos;s HCBT engine.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/#contact-quote"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 font-bold text-[#1447E6] transition-all hover:bg-slate-100 hover:-translate-y-1 hover:shadow-lg"
                >
                  Book a Demo <ArrowRight className="mk-arrow-x h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
