import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import {
  SchoolAdminIllustration,
  AcademicManagementIllustration,
  FinancialManagementIllustration,
  CommunicationPortalIllustration,
  OperationsWelfareIllustration,
  AdmissionsPortalIllustration,
  ExamEngineIllustration,
  CustomDashboardsIllustration,
  SecurityRolesIllustration,
} from "@/components/landing/ModuleIllustrations";
import { HeroUnderline, RiseWords } from "@/components/landing/motion";

export const metadata: Metadata = {
  title: "Features – Hanoled",
  description:
    "Explore the full feature set of Hanoled: student records, grading, fees, communication, CBT, admissions, and more.",
};

const features = [
  {
    icon: SchoolAdminIllustration,
    title: "School Administration",
    description:
      "Student profiles, staff records with TRCN tracking, class & subject setup, role-based access, and multi-site support for multi-branch schools.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: AcademicManagementIllustration,
    title: "Academic Management",
    description:
      "Digital gradebook with configurable CA/exam weightings, scheme of work, homework assignments, and one-click result publishing to parents.",
    color: "bg-[#F5A623]/10 text-[#0B1220]",
  },
  {
    icon: FinancialManagementIllustration,
    title: "Financial Management",
    description:
      "Fee structures by category, auto-generated invoices, online payment collection (Paystack & Monnify), debt dashboard with top-debtor tracking.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: CommunicationPortalIllustration,
    title: "Communication Portal",
    description:
      "WhatsApp, Email, and SMS messaging with custom templates. Automatic performance drop alerts sent to parents instantly.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: OperationsWelfareIllustration,
    title: "Operations & Welfare",
    description:
      "Daily attendance tracking, timetabling, library loans, hostel allocations, and bus route tracking with GPS stop coordinates.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: AdmissionsPortalIllustration,
    title: "Admissions Portal",
    description:
      "Public application forms with online fee payment, entrance exam scheduling tied to HCBT, and pending-to-enrolled status workflow.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: ExamEngineIllustration,
    title: "CBT & Exam Engine",
    description:
      "Build question banks, create computer-based tests with automatic grading, time limits, and anti-cheat measures. Students take exams from any device.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: CustomDashboardsIllustration,
    title: "Custom Dashboards",
    description:
      "Create a branded public admissions page. Parents apply online, you review, approve or reject — all from your dashboard.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: SecurityRolesIllustration,
    title: "Security & Roles",
    description:
      "Role-based access control ensures teachers see only what they need. Data is encrypted at rest and in transit. Regular automated backups protect your records.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
];

export default function FeaturesPage() {
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
          <div className="pointer-events-none absolute right-20 bottom-10 text-slate-200">
            <span className="text-3xl">+</span>
          </div>
          

          <div className="relative z-10 max-w-3xl mx-auto space-y-8 flex flex-col items-center">
            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
                <RiseWords>
                  Everything your school needs, <br />
                  <span className="text-[#1447E6]">in one platform</span>
                </RiseWords>
              </h1>
              {/* Wavy accent line under title: writes itself once the headline has risen */}
              <HeroUnderline />
            </div>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              Hanoled brings together administration, academics, finance, and
              communication into a single, modern dashboard built specifically
              for West African schools.
            </p>


          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-16 relative">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              Powerful tools, beautifully designed
            </h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] shadow-sm ${feature.color}`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 flex flex-col lg:flex-row items-center justify-between gap-8 rounded-[3rem] bg-white px-8 py-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:px-16 border border-slate-100 text-center lg:text-left">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              Ready to transform your school?
            </h2>
            <p className="mt-3 text-lg text-slate-500 font-medium">
              Join schools already using Hanoled to streamline their operations and delight parents.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
            <Link
              href="/#contact-quote"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#1447E6] px-8 font-bold text-white transition-all hover:bg-[#0b33b3] hover:-translate-y-1 hover:shadow-lg shadow-[#1447E6]/30"
            >
              Book a Custom Demo <ArrowRight className="mk-arrow-x h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-slate-200 px-8 font-bold text-slate-700 transition-all hover:bg-slate-50"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
