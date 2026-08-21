import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Heart,
  School,
  Shield,
  Users,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "About Us – Hanoled",
  description:
    "Learn about Hanoled's mission to modernise school management across Nigeria with modern, accessible, cloud-native technology.",
};

const values = [
  {
    icon: School,
    title: "School-First Design",
    description:
      "We design every feature around the real operational realities of Nigerian schools — from power cuts to varying internet stability.",
  },
  {
    icon: Shield,
    title: "Uncompromising Integrity",
    description:
      "Student data, financial ledgers, and gradebooks are protected with bank-grade encryption and role-based permissions.",
  },
  {
    icon: Heart,
    title: "Relentless Support",
    description:
      "We don't just sell software; we partner with your school. Our support team is always a call or WhatsApp message away.",
  },
];

const stats = [
  { value: "100+", label: "Schools onboarded" },
  { value: "50,000+", label: "Students managed" },
  { value: "99.9%", label: "Uptime guarantee" },
  { value: "24/7", label: "Customer support" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <School className="h-4 w-4" /> About Hanoled
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Modernising school management{" "}
              <span className="text-[#1447E6]">across Nigeria</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Hanoled was founded with a simple mission: give every Nigerian
              school — from a 50-student primary school in Abeokuta to a
              2,000-student secondary school in Lagos — the same powerful tools
              used by the best institutions in the world.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-slate-100 bg-slate-50/40 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-black text-[#1447E6]">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Story */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900">Our Story</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              For years, Nigerian school administrators spent countless hours
              manually compiling report cards, tracking down tuition debt on
              paper registers, and manually typing out results for broadcast.
            </p>
            <p>
              Hanoled was built to eliminate that burden. We spent months in
              staffrooms, bursar offices, and principal desks listening to the exact
              challenges school teams face every term. The result is an all-in-one
              platform that automates grading, fee collections, attendance, parent
              communications, and computer-based testing.
            </p>
            <p>
              Today, Hanoled powers forward-thinking schools across Nigeria, saving
              hundreds of administrative hours every academic session and providing
              parents with transparent, real-time insights into their children&apos;s
              education.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-slate-900">Our Values</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:border-[#1447E6]/30 transition-all"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1447E6]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {v.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {v.description}
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
              Join the Hanoled community
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Be part of the movement to modernise education management in
              Nigeria. Let&apos;s build the future of schooling together.
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
