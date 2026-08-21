import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Globe,
  Mail,
  UserPlus,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "Admissions Portal – Hanoled",
  description:
    "Create a branded online admissions page for your school. Parents apply, you review and approve — all from one dashboard.",
};

const steps = [
  {
    icon: Globe,
    title: "Branded Public Page",
    description:
      "Your school gets its own admissions URL (e.g. hanoled.io/admissions/your-school). Share it on social media, your website, or via WhatsApp.",
  },
  {
    icon: UserPlus,
    title: "Online Applications",
    description:
      "Parents fill in student details, upload passport photos, and select the desired class — all from their phone or computer.",
  },
  {
    icon: ClipboardList,
    title: "Review & Approve",
    description:
      "Applications appear in your dashboard. Review each one, then approve or reject with a single click. Approved students are automatically enrolled.",
  },
  {
    icon: Mail,
    title: "Automated Notifications",
    description:
      "Parents receive SMS or email updates when their application status changes. No more phone calls asking 'has my child been admitted?'",
  },
];

const benefits = [
  "Eliminate paper forms and manual data entry",
  "Reduce admission processing time by up to 80%",
  "Prevent duplicate records with automatic matching",
  "Track admission statistics in real time",
  "Customise form fields per admission cycle",
  "Support multiple admission terms per year",
];

export default function AdmissionsPortalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <UserPlus className="h-4 w-4" /> Admissions Portal
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Online admissions,{" "}
              <span className="text-[#1447E6]">zero paperwork</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Give parents a seamless online application experience while your
              admin team manages everything from a single dashboard.
            </p>
            <div className="mt-8">
              <Link
                href="/#contact-quote"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-lg shadow-[#1447E6]/25 hover:shadow-xl"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              How admissions work
            </h2>
            <p className="mt-3 text-slate-500">
              Four simple steps from application to enrollment.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:border-[#1447E6]/30 transition-all"
                >
                  <span className="absolute right-6 top-6 text-5xl font-black text-[#1447E6]/10">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1447E6]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-slate-50/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Why schools love it
            </h2>
            <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-100"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1447E6]" />
                  <span className="text-sm font-medium text-slate-700">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1220] px-8 py-16 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white">
              Start accepting applications online
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Set up your admissions portal in minutes and let parents apply
              from anywhere.
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
