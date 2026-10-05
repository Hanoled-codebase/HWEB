import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { DrawnCheck, RiseWords } from "@/components/landing/motion";
import { InView } from "@/components/landing/InView";

export const metadata: Metadata = {
  title: "Security – Hanoled",
  description:
    "Learn how Hanoled protects your school's data with encryption, role-based access, automated backups, and compliance best practices.",
};

const pillars = [
  {
    icon: Lock,
    title: "Encryption at Rest & In Transit",
    description:
      "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Passwords are hashed with bcrypt. Your data is unreadable even if storage is compromised.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access Control",
    description:
      "Owners, admins, teachers, and parents each see only the data they need. Fine-grained permissions ensure no unauthorised access to sensitive records.",
  },
  {
    icon: Database,
    title: "Automated Backups",
    description:
      "We run automatic daily backups of all school data. In the event of data loss, we can restore your records to any point in the last 30 days.",
  },
  {
    icon: Server,
    title: "Secure Infrastructure",
    description:
      "Hanoled runs on enterprise-grade cloud infrastructure with 99.9% uptime SLA, DDoS protection, and firewalled private networks.",
  },
  {
    icon: ShieldCheck,
    title: "NDPR Compliance",
    description:
      "We comply with the Nigeria Data Protection Regulation (NDPR). Student and parent data is processed lawfully and stored within compliant infrastructure.",
  },
  {
    icon: RefreshCw,
    title: "Regular Audits",
    description:
      "Our security practices are reviewed regularly. We conduct vulnerability assessments and keep all dependencies up to date to close potential attack vectors.",
  },
];

const practices = [
  "Multi-factor authentication for admin accounts",
  "Session timeout after inactivity",
  "IP-based login alerts",
  "Audit logs for all critical actions",
  "Automatic dependency vulnerability scanning",
  "Data anonymisation in development environments",
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <Shield className="h-4 w-4" /> Security
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              <RiseWords>
                Your school&apos;s data is{" "}
                <span className="text-[#1447E6]">our top priority</span>
              </RiseWords>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Hanoled is built from the ground up with security in mind.
              Encryption, access control, backups, and compliance — we take care
              of it all so you can focus on education.
            </p>
          </div>
        </section>

        {/* Security Pillars */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:border-[#1447E6]/30 transition-all"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1447E6]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Best Practices */}
        <section className="bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Security best practices we follow
            </h2>
            <InView className="mt-10 grid gap-4 text-left sm:grid-cols-2">
              {practices.map((practice, i) => (
                <div
                  key={practice}
                  className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-100"
                >
                  <DrawnCheck index={i} className="mt-0.5 h-5 w-5 shrink-0 text-[#1447E6]" />
                  <span className="text-sm font-medium text-slate-700">
                    {practice}
                  </span>
                </div>
              ))}
            </InView>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1220] px-8 py-16 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white">
              Questions about security?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              We&apos;re happy to walk you through our security practices and
              answer any questions your school may have.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-lg shadow-[#1447E6]/30"
              >
                Contact Us <ArrowRight className="mk-arrow-x h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
