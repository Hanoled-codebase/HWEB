"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { BrandRibbon } from "@/components/landing/BrandRibbon";
import { InView } from "@/components/landing/InView";
import { DrawnCheck, HeroUnderline, RiseWords } from "@/components/landing/motion";
import { ProductScreenFrame } from "@/components/landing/ProductScreenShowcase";
import {
  SchoolAdminIllustration,
  AcademicManagementIllustration,
  FinancialManagementIllustration,
  CommunicationPortalIllustration,
  OperationsWelfareIllustration,
  AdmissionsPortalIllustration,
} from "@/components/landing/ModuleIllustrations";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  Shield,
  Lock,
  Server,
  Database,
  HelpCircle,
  Loader2,
} from "lucide-react";

const platformAreas = [
  {
    id: "admin",
    href: "/features",
    title: "School Administration",
    desc: "Student profiles, staff records, class setup and role-based access in one place.",
    highlighted: false,
    preview: (
      <ProductScreenFrame
        compact
        title="School Administration"
        urlPath="hanoled.com/dashboard/school"
        imageSrc="/marketing/admin-dashboard.webp"
        imageAlt="Hanoled School Administration dashboard showing real student and staff metrics"
      />
    ),
  },
  {
    id: "hcbt",
    href: "/hcbt",
    title: "HCBT Exam Engine",
    desc: "Computer-based testing with instant grading and built-in anti-cheat controls.",
    highlighted: true,
    preview: (
      <ProductScreenFrame
        compact
        title="HCBT Exam Engine"
        urlPath="hcbt.hanoled.com/cbt/student"
        imageSrc="/marketing/hcbt-exam-live.webp"
        imageAlt="Hanoled HCBT Computer-Based Testing candidate exam interface"
      />
    ),
  },
  {
    id: "comm",
    href: "/features",
    title: "Results & Parent Portal",
    desc: "3-level result editions catalog, class overview matrix, and instant parent report cards.",
    highlighted: false,
    preview: (
      <ProductScreenFrame
        compact
        title="Results Overview"
        urlPath="hanoled.com/dashboard/results"
        imageSrc="/marketing/results-overview.webp"
        imageAlt="Hanoled 3-Level General Results Overview table and KPI summary"
      />
    ),
  },
];

export default function LandingPage() {
  // Accordion state for the services list ("01 School Administration" open by default, like the reference layout)
  const [activeModule, setActiveModule] = useState<string | null>("admin");

  // Accordion State for FAQs
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Quote Request Form State
  const [formData, setFormData] = useState({
    schoolName: "",
    studentCount: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.email || !formData.phone) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const modules = [
    {
      id: "admin",
      icon: SchoolAdminIllustration,
      title: "School Administration",
      headline: "Every record, one place",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Student profiles, staff records with TRCN tracking, class & subject setup, role-based access, multi-site support for schools with more than one branch.",
      screenSrc: "/marketing/admin-dashboard.webp",
      screenAlt: "Real Hanoled School Administration dashboard",
      screenUrl: "hanoled.com/dashboard/school",
    },
    {
      id: "academics",
      icon: AcademicManagementIllustration,
      title: "Academic Management",
      headline: "Grading that computes itself",
      color: "bg-[#F5A623]/10 text-[#0B1220]",
      desc: "Digital gradebook with configurable CA/exam weightings, scheme of work & lesson notes, homework assignment and digital submission, one-click result publishing to parents.",
      screenSrc: "/marketing/teacher-score-entry-poster.webp",
      videoSrc: "/marketing/teacher-score-entry.mp4",
      screenAlt: "Real Hanoled Teacher Score-Entry and Relational Gradebook recording",
      screenUrl: "hanoled.com/dashboard/spreadsheets",
    },
    {
      id: "finance",
      icon: FinancialManagementIllustration,
      title: "Financial Management",
      headline: "Fees, invoicing & collections in one flow",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Configurable fee structures by category, auto-generated invoicing, Paystack/Monnify online payment collection, a live debt dashboard with top-debtor tracking, and scratch-card result checking (arriving post-launch).",
      screenSrc: "/marketing/finance-bursary.webp",
      screenAlt: "Real Hanoled Financial Management and Bursary screen",
      screenUrl: "hanoled.com/dashboard/bursary",
    },
    {
      id: "comm",
      icon: CommunicationPortalIllustration,
      title: "Communication & Parent Results Portal",
      headline: "Parents never find out late",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Dedicated parent result editions catalog showing available Mid-Term and End-of-Term reports, branded report card slips, and automatic low-score alerts the moment a student scores below 60%.",
      screenSrc: "/marketing/parent-portal-results.webp",
      screenAlt: "Real Hanoled Parent Available Results Catalog",
      screenUrl: "hanoled.com/dashboard/results",
    },
    {
      id: "welfare",
      icon: OperationsWelfareIllustration,
      title: "Student Welfare & Results Overview",
      headline: "Full class visibility at a glance",
      color: "bg-[#0B1220]/5 text-[#0B1220]",
      desc: "3-level progressive results overview with class KPIs, subject completion bars, subject performance matrix, daily attendance tracking, timetabling, library loans, and hostel room allocation.",
      screenSrc: "/marketing/results-overview.webp",
      screenAlt: "Real Hanoled General Results Overview with All Students table and KPIs",
      screenUrl: "hanoled.com/dashboard/results",
    },
    {
      id: "admissions",
      icon: AdmissionsPortalIllustration,
      title: "Official Branded Report Cards & Admissions",
      headline: "From application to official report sheet",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Print-ready WAEC-grade official report sheets branded with your school crest and colors, plus public application forms with online fee payment and entrance exam scheduling tied directly into HCBT.",
      screenSrc: "/marketing/report-card-preview.webp",
      screenAlt: "Real Hanoled Official Report Sheet Preview modal",
      screenUrl: "hanoled.com/dashboard/results/report-card",
    },
  ];

  const faqs = [
    {
      question: "What happens to our existing student and staff records when we switch?",
      answer: "We handle the entire migration process for you. You provide your current records (in Excel, PDF, or papers) and our team uploads them into Hanoled, formatting everything correctly with zero downtime."
    },
    {
      question: "Can Hanoled run alongside our current system during a transition period?",
      answer: "Yes. Many schools run Hanoled in parallel for the first 2-4 weeks to allow teachers and staff to get hands-on experience before fully deprecating their legacy systems."
    },
    {
      question: "Does this work if our school has more than one campus or arm?",
      answer: "Absolutely. Hanoled supports multi-site configurations, allowing administrators to toggle between different branches while keeping financial ledger sheets, directories, and school results centralized."
    },
    {
      question: "Is there a contract lock-in, or can we leave after a term?",
      answer: "There is no contract lock-in. Hanoled works on a term-by-term billing cycle. You can opt out at the end of any term, and we will export all your historical data for you."
    },
    {
      question: "Do parents need to install anything, or does it work in a browser?",
      answer: "Parents do not need to install any app. Hanoled is a web-first application optimized to run on all mobile browsers. Parents receive result notifications and invoices via email or SMS with one-click portal links."
    }
  ];

  const onboardingSteps = [
    { step: "01", title: "Discovery & Customization", desc: "Understanding your grading system, report card layouts, and sub-domains." },
    { step: "02", title: "Data Migration", desc: "Seamless import of existing student, parent, and staff records. No data loss." },
    { step: "03", title: "Staff Training", desc: "Interactive training sessions for teachers and administrators to get comfortable." },
    { step: "04", title: "Go-Live", desc: "Onboarding parents, activating payment gateways, and starting live operations." }
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-sans selection:bg-[#1447E6] selection:text-white">
      {/* Top Navbar */}
      <MarketingHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <section id="platform" className="relative overflow-hidden rounded-[3rem] bg-white px-6 py-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-12 sm:py-16 lg:px-16">
          {/* Dot Grid Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />

          <div className="pointer-events-none absolute left-10 top-20 text-slate-200">
            <span className="text-2xl">+</span>
          </div>
          <div className="pointer-events-none absolute bottom-20 left-1/3 text-slate-200">
            <span className="text-2xl">+</span>
          </div>

          {/* From 1024px the headline gets the wider column so it holds three lines, not five. */}
          <div className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center">
            {/* Left Box (Text) */}
            <div className="space-y-8 lg:pr-2">
              <div className="space-y-6">
                <h1 className="text-[1.75rem] font-bold leading-[1.15] text-slate-900 sm:text-4xl md:text-5xl lg:text-[2.5rem] xl:text-[3.25rem]">
                  <RiseWords>
                    <span className="inline-flex items-center gap-3">
                      <span className="text-[#1447E6]">Hanoled</span>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-[#0B1220] sm:h-10 sm:w-10 lg:h-12 lg:w-12">
                        <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                      </span>
                    </span>
                    <br />
                    The ultimate school management system!
                  </RiseWords>
                </h1>

                {/* Wavy accent line under title: writes itself once the headline has risen */}
                <HeroUnderline className="" />

                <p className="mk-follow text-lg leading-relaxed text-slate-500" style={{ ["--d" as string]: "460ms" }}>
                  A modern platform built specifically for West African schools that brings administrators, teachers, and parents together. Empower parents to monitor their wards&rsquo; academic performance and fee statuses in real-time.
                </p>
              </div>

              <Button
                asChild
                className="mk-follow h-14 rounded-full bg-[#1447E6] px-8 text-base font-bold text-white transition-all hover:bg-[#0b33b3] hover:shadow-lg hover:-translate-y-1"
                style={{ ["--d" as string]: "560ms" }}
              >
                <Link href="#contact-quote">
                  Book a Custom Demo
                  <ArrowUpRight className="mk-arrow ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Right Box (African Student Hero Portrait) */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -right-4 top-10 h-10 w-10 text-[#1447E6]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>

              {/* Main Image Container */}
              <div className="relative h-[350px] sm:h-[450px] lg:h-[480px] xl:h-[550px] w-full max-w-[450px]">
                <div className="absolute inset-x-8 bottom-0 h-20 rounded-[50%] bg-[#1447E6]/20 blur-2xl" />
                <Image
                  src="/landing-student-hero.png"
                  alt="Hanoled Student"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
                  className="mk-unveil object-cover rounded-[3rem] shadow-2xl z-10"
                  style={{ objectPosition: "center top" }}
                />

                {/* Top-right Chip on mobile, bottom-right on larger screens */}
                <div className="mk-follow absolute -top-3 right-3 sm:-bottom-4 sm:right-6 sm:top-auto z-20 flex items-center gap-2 rounded-full bg-[#1447E6] pl-2.5 pr-3.5 py-1.5 sm:pl-3 sm:pr-4 sm:py-2 text-white shadow-xl shadow-[#1447E6]/30" style={{ ["--d" as string]: "1050ms" }}>
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">Unified Platform</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OUR PLATFORM (3-card showcase) */}
        <section className="mt-16 rounded-[3rem] bg-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl md:text-4xl leading-tight text-slate-900">
              See <span className="text-[#1447E6]">Hanoled</span> in action
            </h2>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xs sm:text-right">
              Three areas your staff, students, and parents live in every day.
            </p>
          </div>

          <div className="relative z-10 grid gap-6 sm:grid-cols-3">
            {platformAreas.map((area) => (
              <Link
                href={area.href}
                key={area.id}
                className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 transition-transform hover:-translate-y-1 ${
                  area.highlighted
                    ? "bg-[#1447E6] shadow-xl shadow-[#1447E6]/30"
                    : "bg-[#f8f9fc] border border-slate-100"
                }`}
              >
                <div>
                  <h3 className={`text-lg font-bold ${area.highlighted ? "text-white" : "text-slate-900"}`}>{area.title}</h3>
                  <p className={`mt-2 text-xs font-medium leading-relaxed ${area.highlighted ? "text-white/80" : "text-slate-500"}`}>
                    {area.desc}
                  </p>
                </div>

                <div className={`my-4 overflow-hidden rounded-2xl ${area.highlighted ? "bg-black/15 p-1.5" : "bg-white border border-slate-100 p-1.5"}`}>
                  {area.preview}
                </div>

                <div
                  className={`flex h-10 w-10 items-center justify-center self-end rounded-full transition-colors ${
                    area.highlighted
                      ? "bg-[#F5A623] text-[#0B1220]"
                      : "bg-[#1447E6]/10 text-[#1447E6] group-hover:bg-[#1447E6] group-hover:text-white"
                  }`}
                >
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </Link>
            ))}
          </div>

          {/* Real Live Screen Recording & 3-Level Results Overview Spotlight */}
          <div className="relative z-10 mt-10 grid gap-6 lg:grid-cols-2">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1447E6]">
                  Live Workflow Recording · Teacher Score Entry
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Real Product Video
                </span>
              </div>
              <ProductScreenFrame
                title="Teacher Score Entry"
                urlPath="hanoled.com/dashboard/school/spreadsheets"
                badge="Live Recording"
                imageSrc="/marketing/teacher-score-entry-poster.webp"
                videoSrc="/marketing/teacher-score-entry.mp4"
                imageAlt="Live screen recording of a teacher entering and saving CA and Examination scores in Hanoled"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1447E6]">
                  3-Level Results Overview · All Students &amp; Matrix
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Real Product Screen
                </span>
              </div>
              <ProductScreenFrame
                title="General Results Overview"
                urlPath="hanoled.com/dashboard/school/results"
                badge="Results Overview"
                imageSrc="/marketing/results-overview.webp"
                imageAlt="Real Hanoled Results Overview showing KPI metrics, All Students table, subject completion bars, and class ranks"
              />
            </div>
          </div>
        </section>

        {/* HCBT ENGINE DEEP DIVE */}
        <section className="mt-16 rounded-[3rem] bg-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Description */}
            <div className="space-y-6">
              <h2 className="text-3xl font-extrabold sm:text-4xl md:text-5xl leading-tight text-slate-900">
                <span className="text-[#1447E6]">HCBT</span> — exams that run themselves.
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Empower your teachers to deploy digital testing effortlessly. Hanoled computer-based testing comes equipped with standard past questions, anti-cheating rules, and instant grading tools.
              </p>

              <InView as="ul" className="space-y-4">
                {[
                  "Timed exams (1–360 mins) with practice modules pulled from WAEC, NECO, and JAMB banks across 13+ subjects.",
                  "Bulk question upload from PDF, DOCX, or TXT documents with smart question/answer extraction.",
                  "LaTeX & KaTeX compatibility for neat rendering of mathematical equations and chemical formulas.",
                  "Built-in proctoring checks including tab-switch locks with a 3-strike policy and auto-submit behavior."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <DrawnCheck index={idx} className="h-6 w-6 text-[#F5A623] shrink-0 mt-0.5" />
                    <span className="text-slate-600 text-sm sm:text-base font-semibold">{item}</span>
                  </li>
                ))}
              </InView>
            </div>

            {/* Real HCBT Computer-Based Exam Screen */}
            <InView className="w-full mx-auto">
              <ProductScreenFrame
                title="HCBT Exam Runner"
                urlPath="hcbt.hanoled.com/cbt/student"
                badge="HCBT Live Portal"
                imageSrc="/marketing/hcbt-exam-live.webp"
                imageAlt="Real Hanoled HCBT Computer-Based Testing student portal and exam interface"
              />
            </InView>
          </div>
        </section>

        {/* ABOUT US */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
            Built by people who understand West African schools
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-slate-500 font-medium leading-relaxed">
            Hanoled was founded with a simple mission: give every school the same powerful tools used by the best institutions in the world.{" "}
            <Link href="/about" className="text-[#1447E6] font-bold hover:underline whitespace-nowrap">
              Read More
            </Link>
          </p>
        </section>

        {/* OUR SERVICES (numbered accordion) */}
        <section id="about" className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
                What can Hanoled do?
              </h2>
            </div>
            <p className="text-slate-500 text-sm sm:text-base font-semibold max-w-sm sm:text-right">
              Explore the complete set of co-developed modules packed into Hanoled. Every school gets full access with no artificial limits.
            </p>
          </div>

          <div className="space-y-3 max-w-5xl mx-auto">
            {modules.map((m, idx) => {
              const isOpen = activeModule === m.id;
              const Illustration = m.icon;
              return (
                <div
                  key={m.id}
                  className={`rounded-[1.75rem] border transition-colors ${
                    isOpen ? "border-[#1447E6]/20 bg-[#1447E6]/5" : "border-slate-100 bg-white"
                  }`}
                >
                  <button
                    onClick={() => setActiveModule(isOpen ? null : m.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 p-5 sm:p-6 text-left"
                  >
                    <span className="w-7 shrink-0 text-sm font-black tabular-nums text-slate-300">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-base sm:text-lg font-bold text-slate-900">{m.title}</span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform ${
                        isOpen ? "bg-[#1447E6] text-white rotate-180" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  <div className="m-collapsible" data-open={isOpen} aria-hidden={!isOpen}>
                    <div>
                      <div className="grid gap-6 px-5 pb-6 sm:px-6 sm:pl-[3.75rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${m.color}`}>
                            <Illustration className="h-9 w-9" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-800">{m.headline}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{m.desc}</p>
                          </div>
                        </div>
                        <ProductScreenFrame
                          compact
                          title={m.title}
                          urlPath={m.screenUrl}
                          imageSrc={m.screenSrc}
                          videoSrc={m.videoSrc}
                          imageAlt={m.screenAlt}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECURITY & PAYMENT INTEGRATION LOGOS BAR */}
        <section className="mt-16 rounded-[3rem] border border-slate-100 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Security */}
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Uncompromising security for school records.
              </h2>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-semibold">
                Proprietors trust us to safeguard administrative details, student scores, and financial data. Hanoled employs bank-grade encryption frameworks to ensure data integrity and accessibility.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Lock, title: "JWT Auth & Hashing", desc: "Granular access limits with bcrypt hashing." },
                  { icon: Database, title: "Encrypted PostgreSQL", desc: "Data is encrypted in transit and at rest." },
                  { icon: Server, title: "Automated Backups", desc: "Nightly ledger snapshots to avoid data loss." },
                  { icon: Shield, title: "Granular Roles", desc: "Admins, teachers, and parents see only relevant tabs." }
                ].map((sec, idx) => (
                  <div key={idx} className="flex gap-3">
                    <sec.icon className="h-5 w-5 text-[#1447E6] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{sec.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{sec.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Trust Bar + Graphic */}
            <div className="bg-[#FFFFFF] rounded-[2.5rem] border border-slate-200/60 p-8 flex flex-col justify-center items-center gap-6 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure Payment Integrations</div>
              <p className="text-sm font-semibold text-slate-500 ">
                Direct fee collections and termly billings run through secure partners, giving parents confidence.
              </p>

              <div className="flex flex-wrap justify-center items-center gap-8 w-full max-w-md pt-4 border-t border-slate-200">
                {/* Paystack simulation text logo */}
                <div className="flex items-center gap-2 font-extrabold text-[#3bb75e] tracking-tight text-xl">
                  <span className="h-3 w-3 bg-[#3bb75e] rounded-full" />
                  paystack
                </div>
                {/* Monnify simulation text logo */}
                <div className="flex items-center gap-1.5 font-bold text-[#003399] tracking-tighter text-2xl italic">
                  monnify
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ONBOARDING STEPS */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Switching is simple. Here is how we do it:
            </h2>
          </div>

          <InView className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto" style={{ ["--mk-rest" as string]: "rgb(20 71 230 / 0.2)" }}>
            {onboardingSteps.map((step, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="mk-wave text-3xl font-black text-[#1447E6]/20 absolute top-4 right-4" style={{ ["--i" as string]: idx }}>{step.step}</div>
                <div className="space-y-3 mt-6">
                  <h3 className="text-base font-bold text-slate-800 leading-snug">{step.title}</h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </InView>
        </section>

        {/* FAQ SECTION */}
        <section className="mt-16 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Got questions? We have answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="flex justify-between items-center w-full p-5 text-left text-sm sm:text-base font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <span className="pr-4">{faq.question}</span>
                    <HelpCircle className={`h-5 w-5 shrink-0 transition-transform duration-300 ease-[var(--ease-out-smooth)] ${isOpen ? "text-[#1447E6] rotate-180" : "text-slate-400"}`} />
                  </button>
                  <div className="m-collapsible" data-open={isOpen} aria-hidden={!isOpen}>
                    <div>
                      <div className="p-5 pt-0 border-t border-slate-50 text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOOK A DEMO / CUSTOM QUOTE FORM */}
        <section id="contact-quote" className="mt-16 max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-[3rem] bg-white p-8 sm:p-12 border border-slate-100 shadow-xl">
            <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-[#1447E6]/5 blur-2xl" />

            <div className="relative z-10 text-center mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Get a custom quote for your school
              </h2>
              <p className="mt-2 text-slate-500 text-xs sm:text-sm font-semibold  mx-auto">
                No standardized checklists. Let us co-develop a customized Hanoled implementation blueprint matching your school term structures.
              </p>
            </div>

            {isSubmitted ? (
              <div data-motion="in" className="m-pop flex flex-col items-center text-center p-8 bg-[#12B76A]/10 border border-[#12B76A]/20 rounded-2xl relative z-10 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#12B76A] text-white shadow-md">
                  <DrawnCheck className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Request Received!</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                    Thank you! We&rsquo;ve received your request and our team will reach out to you within 24 hours to schedule a custom demo.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4 relative z-10">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">School Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Hanoled College"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#FFFFFF] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Estimated Student Count</label>
                    <input
                      type="number"
                      placeholder="e.g. 350"
                      value={formData.studentCount}
                      onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#FFFFFF] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Contact Email</label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. admin@school.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#FFFFFF] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Phone Number</label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. +234 803 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#FFFFFF] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-[#1447E6] text-white hover:bg-[#0b33b3] font-bold text-sm shadow-md"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Quote Request"
                  )}
                </Button>
              </form>
            )}
          </div>
        </section>

        {/* FINAL CTA */}
        <section id="contact" className="mt-16 flex flex-col lg:flex-row items-center justify-between gap-8 rounded-[3rem] bg-white px-8 py-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:px-16 border border-slate-100 text-center lg:text-left">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl max-w-xl leading-tight">
            Let&rsquo;s bring your school&rsquo;s operations to life.
          </h2>
          <Button
            asChild
            className="h-14 shrink-0 rounded-full bg-[#1447E6] px-8 text-base font-bold text-white shadow-lg shadow-[#1447E6]/25 transition-all hover:bg-[#0b33b3] hover:-translate-y-1"
          >
            <Link href="/contact">
              Get Started
              <ArrowUpRight className="mk-arrow ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>
      </main>

      <BrandRibbon />

      <MarketingFooter />
    </div>
  );
}
