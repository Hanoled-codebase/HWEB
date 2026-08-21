import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquare,
  School,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "Features – Hanoled",
  description:
    "Explore the full feature set of Hanoled: student records, grading, fees, communication, CBT, admissions, and more.",
};

const features = [
  {
    icon: School,
    title: "School Administration",
    description:
      "Student profiles, staff records with TRCN tracking, class & subject setup, role-based access, and multi-site support for multi-branch schools.",
    color: "bg-blue-50 text-[#1447E6]",
  },
  {
    icon: BookOpen,
    title: "Academic Management",
    description:
      "Digital gradebook with configurable CA/exam weightings, scheme of work, homework assignments, and one-click result publishing to parents.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Wallet,
    title: "Financial Management",
    description:
      "Fee structures by category, auto-generated invoices, online payment collection (Paystack & Monnify), debt dashboard with top-debtor tracking.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: MessageSquare,
    title: "Communication Portal",
    description:
      "WhatsApp, Email, and SMS messaging with custom templates. Automatic performance drop alerts sent to parents instantly.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Users,
    title: "Operations & Welfare",
    description:
      "Daily attendance tracking, timetabling, library loans, hostel allocations, and bus route tracking with GPS stop coordinates.",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: Calendar,
    title: "Admissions Portal",
    description:
      "Public application forms with online fee payment, entrance exam scheduling tied to HCBT, and pending-to-enrolled status workflow.",
    color: "bg-blue-50 text-[#1447E6]",
  },
  {
    icon: FileSpreadsheet,
    title: "CBT & Exam Engine",
    description:
      "Build question banks, create computer-based tests with automatic grading, time limits, and anti-cheat measures. Students take exams from any device.",
    color: "bg-blue-50 text-[#1447E6]",
  },
  {
    icon: LayoutDashboard,
    title: "Admissions Portal",
    description:
      "Create a branded public admissions page. Parents apply online, you review, approve or reject — all from your dashboard.",
    color: "bg-blue-50 text-[#1447E6]",
  },
  {
    icon: Shield,
    title: "Security & Roles",
    description:
      "Role-based access control ensures teachers see only what they need. Data is encrypted at rest and in transit. Regular automated backups protect your records.",
    color: "bg-slate-100 text-slate-700",
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <LayoutDashboard className="h-4 w-4" /> Platform Features
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everything your school needs,{" "}
              <span className="text-[#1447E6]">in one platform</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Hanoled brings together administration, academics, finance, and
              communication into a single, modern dashboard built specifically
              for Nigerian schools.
            </p>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-[#1447E6]/30 hover:shadow-md"
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1220] px-8 py-16 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white">
              Ready to transform your school?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join hundreds of Nigerian schools already using Hanoled to
              streamline their operations.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/#contact-quote"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-lg shadow-[#1447E6]/30"
              >
                Book a Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-8 py-3 font-semibold text-slate-300 transition-colors hover:border-white hover:text-white"
              >
                Contact Us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
