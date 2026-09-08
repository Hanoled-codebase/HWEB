import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Globe,
  Mail,
  UserPlus,
  Rocket
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
      "Your school gets its own admissions URL. Share it on social media, your website, or via WhatsApp.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: UserPlus,
    title: "Online Applications",
    description:
      "Parents fill in student details, upload passport photos, and select the desired class online.",
    color: "bg-[#F5A623]/10 text-[#0B1220]",
  },
  {
    icon: ClipboardList,
    title: "Review & Approve",
    description:
      "Applications appear in your dashboard. Review each one, then approve or reject with a single click.",
    color: "bg-[#1447E6]/10 text-emerald-700",
  },
  {
    icon: Mail,
    title: "Automated Updates",
    description:
      "Parents receive SMS or email updates when their application status changes.",
    color: "bg-[#F04438]/10 text-rose-600",
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
    <div className="min-h-screen bg-[#f8f9fc] font-sans selection:bg-[#1447E6] selection:text-white">
      <MarketingHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[3rem] bg-white px-6 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-12 sm:py-20 lg:px-16 text-center">
          {/* Dot Grid Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />
          
          <div className="pointer-events-none absolute left-10 top-20 text-slate-200">
            <span className="text-3xl">+</span>
          </div>
          
          <div className="absolute top-1/4 right-1/4 h-12 w-12 text-[#1447E6] opacity-30">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 shadow-sm">
              <span className="text-xl">✅</span>
              <span className="text-sm font-bold text-emerald-700">Admissions Portal</span>
            </div>
            
            <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
              Online admissions, <span className="text-[#1447E6]">zero paperwork</span>
            </h1>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              Give parents a seamless online application experience while your
              admin team manages everything from a single dashboard.
            </p>

            <div className="pt-4 flex justify-center">
              <Link
                href="/#contact-quote"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#0B1220] px-8 font-bold text-white transition-all hover:bg-[#1447E6] hover:-translate-y-1 hover:shadow-lg"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1447E6]/10 text-[#1447E6] px-3.5 py-1.5 text-xs font-bold mb-3">
              Application Flow
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              How admissions work
            </h2>
            <p className="mt-3 text-slate-500 font-semibold">
              Four simple steps from application to enrollment.
            </p>
          </div>
          
          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Wavy Connector Line (Hidden on mobile) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-8 -translate-y-1/2 pointer-events-none z-0">
               <svg width="100%" height="100%" viewBox="0 0 1000 40" preserveAspectRatio="none" className="text-slate-200 stroke-current stroke-[3px]" fill="none" strokeDasharray="8 8">
                  <path d="M0 20 Q 125 40, 250 20 T 500 20 T 750 20 T 1000 20" strokeLinecap="round" />
               </svg>
            </div>
            
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md overflow-hidden z-10"
                >
                  <span className="absolute -right-4 -top-4 text-8xl font-black text-slate-100 group-hover:text-slate-200 transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  
                  <div className="relative z-10">
                    <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${step.color}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-16 bg-white rounded-[3rem] p-8 sm:p-12 shadow-sm border border-slate-100">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Why schools love it
            </h2>
            <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-4 rounded-[1.5rem] bg-[#f8f9fc] p-5 border border-slate-100 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#0B1220] px-8 py-16 sm:px-12 sm:py-20 text-center shadow-2xl">
            <div className="absolute top-0 right-0 p-12">
               <div className="h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
            </div>
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl font-extrabold text-white sm:text-5xl leading-tight">
                Start accepting applications online
              </h2>
              <p className="text-lg text-slate-400 font-medium">
                Set up your admissions portal in minutes and let parents apply
                from anywhere.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/#contact-quote"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#1447E6] px-8 font-bold text-white transition-all hover:bg-[#0b33b3] hover:-translate-y-1 hover:shadow-lg shadow-[#1447E6]/30"
                >
                  Book a Demo <ArrowRight className="h-5 w-5" />
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
