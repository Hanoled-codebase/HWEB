"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
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
  Award,
  Building2,
  ChevronDown,
  CheckCircle2,
  Shield,
  Lock,
  Server,
  Database,
  HelpCircle,
  Loader2,
} from "lucide-react";

function BrandRibbon() {
  return (
    <div className="w-full overflow-hidden bg-[#1447E6] py-3 shadow-md">
      <div className="flex min-w-max items-center gap-6 text-sm font-bold text-white/90">
        {Array.from({ length: 15 }).map((_, index) => (
          <span key={index} className="whitespace-nowrap flex items-center gap-6">
            Hanoled.io
            <span className="h-1 w-1 rounded-full bg-white/50" />
            Hanoled
            <span className="h-1 w-1 rounded-full bg-white/50" />
          </span>
        ))}
      </div>
    </div>
  );
}

const platformAreas = [
  {
    id: "admin",
    href: "/features",
    title: "School Administration",
    desc: "Student profiles, staff records, class setup and role-based access in one place.",
    highlighted: false,
    preview: (
      <div className="w-full space-y-2">
        <div className="h-2.5 w-full rounded-full bg-[#1447E6]/15" />
        <div className="h-2.5 w-3/4 rounded-full bg-[#1447E6]/15" />
        <div className="h-2.5 w-1/2 rounded-full bg-[#1447E6]/15" />
      </div>
    ),
  },
  {
    id: "hcbt",
    href: "/hcbt",
    title: "HCBT Exam Engine",
    desc: "Computer-based testing with instant grading and built-in anti-cheat controls.",
    highlighted: true,
    preview: (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white">Q14</span>
          <span className="rounded-full bg-[#F5A623] px-2.5 py-1 text-[10px] font-bold text-[#0B1220]">42:15</span>
        </div>
        <div className="flex gap-1.5">
          {["A", "B", "C", "D"].map((k) => (
            <span key={k} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${k === "B" ? "bg-white text-[#1447E6]" : "bg-white/20 text-white"}`}>{k}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "comm",
    href: "/features",
    title: "Communication Portal",
    desc: "WhatsApp, email and SMS alerts the moment a result needs a parent's attention.",
    highlighted: false,
    preview: (
      <div className="w-full space-y-2">
        <div className="ml-auto h-6 w-2/3 rounded-2xl rounded-tr-sm bg-[#1447E6]/15" />
        <div className="h-6 w-1/2 rounded-2xl rounded-tl-sm bg-[#1447E6]/10" />
      </div>
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
    },
    {
      id: "academics",
      icon: AcademicManagementIllustration,
      title: "Academic Management",
      headline: "Grading that computes itself",
      color: "bg-[#F5A623]/10 text-[#0B1220]",
      desc: "Digital gradebook with configurable CA/exam weightings, scheme of work & lesson notes, homework assignment and digital submission, one-click result publishing to parents.",
    },
    {
      id: "finance",
      icon: FinancialManagementIllustration,
      title: "Financial Management",
      headline: "Fees, invoicing & collections in one flow",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Configurable fee structures by category, auto-generated invoicing, Paystack/Monnify online payment collection, a live debt dashboard with top-debtor tracking, scratch-card result checking.",
    },
    {
      id: "comm",
      icon: CommunicationPortalIllustration,
      title: "Communication Portal",
      headline: "Parents never find out late",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "WhatsApp, Email, and SMS messaging with templates; automatic alerts the moment a student scores below 60% on any assessment.",
    },
    {
      id: "welfare",
      icon: OperationsWelfareIllustration,
      title: "Student Welfare & Operations",
      headline: "Beyond academics",
      color: "bg-[#0B1220]/5 text-[#0B1220]",
      desc: "Daily attendance tracking, timetabling, library loan management, hostel room allocation, and school bus route tracking with GPS stop coordinates.",
    },
    {
      id: "admissions",
      icon: AdmissionsPortalIllustration,
      title: "Admissions Portal",
      headline: "From application to enrollment",
      color: "bg-[#1447E6]/10 text-[#1447E6]",
      desc: "Public application forms with online fee payment, entrance exam scheduling tied directly into HCBT, and a full pending to enrolled status workflow with automatic admission numbers.",
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

          <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Box (Text) */}
            <div className="space-y-8 lg:pr-10">
              <div className="space-y-6">
                <h1 className="text-[1.75rem] font-bold leading-[1.15] text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                  <span className="inline-flex items-center gap-3">
                    <span className="text-[#1447E6]">Hanoled</span>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-[#0B1220] sm:h-10 sm:w-10 lg:h-12 lg:w-12">
                      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                    </span>
                  </span>
                  <br />
                  The ultimate school management system!
                </h1>

                {/* Wavy accent line under title */}
                <svg width="120" height="20" viewBox="0 0 120 20" className="text-[#F5A623] fill-none stroke-current stroke-[4px]">
                  <path d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" strokeLinecap="round" />
                </svg>

                <p className="text-lg leading-relaxed text-slate-500">
                  A modern platform built specifically for West African schools that brings administrators, teachers, and parents together. Empower parents to monitor their wards&rsquo; academic performance and fee statuses in real-time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <Button
                  asChild
                  className="h-14 rounded-full bg-[#1447E6] px-8 text-base font-bold text-white transition-all hover:bg-[#0b33b3] hover:shadow-lg hover:-translate-y-1"
                >
                  <Link href="#contact-quote">
                    Book a Custom Demo
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[
                      { bg: "bg-[#1447E6]", initials: "TC" },
                      { bg: "bg-[#F5A623]", initials: "PA" },
                      { bg: "bg-[#5B7FEF]", initials: "AD" },
                      { bg: "bg-[#0B2E99]", initials: "ST" },
                    ].map((user, i) => (
                      <div
                        key={i}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm ${user.bg}`}
                      >
                        {user.initials}
                      </div>
                    ))}
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#0B1220] text-[10px] font-bold text-white shadow-sm">
                      +1200
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Users</span>
                </div>
              </div>
            </div>

            {/* Right Box (African Student Hero Portrait) */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -right-4 top-10 h-10 w-10 text-[#1447E6]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>

              {/* Main Image Container */}
              <div className="relative h-[350px] sm:h-[450px] lg:h-[550px] w-full max-w-[450px]">
                <div className="absolute inset-x-8 bottom-0 h-20 rounded-[50%] bg-[#1447E6]/20 blur-2xl" />
                <Image
                  src="/landing-student-hero.png"
                  alt="Hanoled Student"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
                  className="object-cover rounded-[3rem] shadow-2xl z-10"
                  style={{ objectPosition: "center top" }}
                />

                {/* Bottom-left Stat Card */}
                <div className="absolute bottom-3 left-3 sm:-bottom-6 sm:-left-6 z-20 flex items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-[1.5rem] bg-white px-3.5 py-2.5 sm:px-5 sm:py-4 shadow-xl shadow-slate-900/10 border border-slate-100">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A623]/15 text-[#0B1220]">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">100+ Schools</p>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5 whitespace-nowrap">Onboarded &amp; growing</p>
                  </div>
                </div>

                {/* Top-right Chip on mobile, bottom-right on larger screens so it never collides with the stat card */}
                <div className="absolute -top-3 right-3 sm:-bottom-4 sm:right-6 sm:top-auto z-20 flex items-center gap-2 rounded-full bg-[#1447E6] pl-2.5 pr-3.5 py-1.5 sm:pl-3 sm:pr-4 sm:py-2 text-white shadow-xl shadow-[#1447E6]/30">
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

                <div className={`my-4 rounded-2xl p-4 ${area.highlighted ? "bg-black/15" : "bg-white border border-slate-100"}`}>
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

              <ul className="space-y-4">
                {[
                  "Timed exams (1–360 mins) with practice modules pulled from WAEC, NECO, and JAMB banks across 13+ subjects.",
                  "Bulk question upload from PDF, DOCX, or TXT documents with smart question/answer extraction.",
                  "LaTeX & KaTeX compatibility for neat rendering of mathematical equations and chemical formulas.",
                  "Built-in proctoring checks including tab-switch locks with a 3-strike policy and auto-submit behavior."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#F5A623] shrink-0 mt-0.5" />
                    <span className="text-slate-600 text-sm sm:text-base font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Diagram: computer-based exam screen */}
            <div className="w-full mx-auto rounded-[2rem] bg-[#f8f9fc] border border-slate-100 p-6 sm:p-10">
              <svg viewBox="0 0 480 340" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Monitor stand */}
                <rect x="210" y="292" width="60" height="14" rx="6" fill="#CBD5E1" />
                <rect x="170" y="306" width="140" height="10" rx="5" fill="#CBD5E1" />

                {/* Monitor / screen */}
                <rect x="40" y="20" width="400" height="270" rx="22" fill="white" stroke="#E2E8F0" strokeWidth="2" />

                {/* Header bar */}
                <rect x="64" y="44" width="352" height="26" rx="8" fill="#0B1220" />

                {/* Question lines */}
                <rect x="64" y="90" width="352" height="10" rx="5" fill="#E2E8F0" />
                <rect x="64" y="106" width="200" height="10" rx="5" fill="#E2E8F0" />

                {/* Answer options */}
                <rect x="64" y="132" width="352" height="30" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="2" />
                <circle cx="82" cy="147" r="7" fill="#E2E8F0" />

                <rect x="64" y="170" width="352" height="30" rx="10" fill="#1447E6" fillOpacity="0.08" stroke="#1447E6" strokeWidth="2" />
                <circle cx="82" cy="185" r="7" fill="#1447E6" />
                <path d="M78.5 185l2.5 2.5 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                <rect x="64" y="208" width="352" height="30" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="2" />
                <circle cx="82" cy="223" r="7" fill="#E2E8F0" />

                <rect x="64" y="246" width="352" height="30" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="2" />
                <circle cx="82" cy="261" r="7" fill="#E2E8F0" />

                {/* Timer badge */}
                <rect x="366" y="4" width="80" height="32" rx="16" fill="#F5A623" />
                <circle cx="384" cy="20" r="8" fill="none" stroke="#0B1220" strokeWidth="2" />
                <path d="M384 15v5l4 3" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="398" y="15" width="34" height="10" rx="5" fill="#0B1220" fillOpacity="0.7" />

                {/* Anti-cheat / verified badge */}
                <circle cx="420" cy="270" r="30" fill="#1447E6" stroke="white" strokeWidth="4" />
                <path d="M420 254l14 4.5v10c0 9-6 15.5-14 18.5-8-3-14-9.5-14-18.5v-10z" fill="white" />
                <path d="M414.5 270l3.8 3.8L427 264" stroke="#1447E6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                {/* Ascending-line motif accent */}
                <path d="M8 320 Q 30 300, 52 312 T 96 296" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" fill="none" />
                <circle cx="8" cy="320" r="4" fill="#F5A623" />
                <circle cx="96" cy="296" r="4" fill="#F5A623" />
              </svg>
            </div>
          </div>
        </section>

        {/* ABOUT US + STATS */}
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

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 rounded-full bg-[#1447E6] text-white px-6 py-3 shadow-lg shadow-[#1447E6]/25">
              <Award className="h-5 w-5 text-[#F5A623]" />
              <span className="font-bold text-sm whitespace-nowrap">100+ Schools Onboarded</span>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-slate-900">50,000+</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students Managed</div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-slate-900">99.9%</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uptime Guarantee</div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-slate-900">24/7</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Support</div>
            </div>
          </div>
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
                  {isOpen && (
                    <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-start sm:px-6 sm:pl-[3.75rem]">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${m.color}`}>
                        <Illustration className="h-9 w-9" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800">{m.headline}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">{m.desc}</p>
                      </div>
                    </div>
                  )}
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
                      <h4 className="text-xs font-bold text-slate-800">{sec.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sec.desc}</p>
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

          <div className="grid gap-6 sm:grid-cols-4 max-w-6xl mx-auto">
            {onboardingSteps.map((step, idx) => (
              <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="text-3xl font-black text-[#1447E6]/20 absolute top-4 right-4">{step.step}</div>
                <div className="space-y-3 mt-6">
                  <h3 className="text-base font-bold text-slate-800 leading-snug">{step.title}</h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
                    className="flex justify-between items-center w-full p-5 text-left text-sm sm:text-base font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <span className="pr-4">{faq.question}</span>
                    <HelpCircle className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "text-[#1447E6] rotate-180" : "text-slate-400"}`} />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 border-t border-slate-50 text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
                      {faq.answer}
                    </div>
                  )}
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
              <div className="flex flex-col items-center text-center p-8 bg-[#12B76A]/10 border border-[#12B76A]/20 rounded-2xl relative z-10 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#12B76A] text-white shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
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
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>
      </main>

      <BrandRibbon />

      <MarketingFooter />
    </div>
  );
}
