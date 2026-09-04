"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  MonitorSmartphone,
  School,
  Shield,
  Award,
  Crown,
  Globe,
  Rocket,
  Users,
  CheckCircle2,
  Lock,
  Server,
  Database,
  RefreshCw,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Loader2,
  BookOpen,
  Wallet,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/hcbt", label: "HCBT Engine" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

function BrandRibbon() {
  return (
    <div className="w-full overflow-hidden bg-[#7b5fff] py-3 shadow-md">
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

export default function LandingPage() {
  // Tabs State for Expanded Feature Overview
  const [activeTab, setActiveTab] = useState("admin");

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
      icon: School,
      title: "School Administration",
      headline: "Every record, one place",
      color: "border-[#1447E6] text-[#1447E6] bg-blue-50/50",
      desc: "Student profiles, staff records with TRCN tracking, class & subject setup, role-based access, multi-site support for schools with more than one branch.",
    },
    {
      id: "academics",
      icon: BookOpen,
      title: "Academic Management",
      headline: "Grading that computes itself",
      color: "border-[#f6c24e] text-[#937400] bg-amber-50/50",
      desc: "Digital gradebook with configurable CA/exam weightings, scheme of work & lesson notes, homework assignment and digital submission, one-click result publishing to parents.",
    },
    {
      id: "finance",
      icon: Wallet,
      title: "Financial Management",
      headline: "Fees, invoicing & collections in one flow",
      color: "border-[#4cd988] text-emerald-700 bg-emerald-50/50",
      desc: "Configurable fee structures by category, auto-generated invoicing, Paystack/Monnify online payment collection, a live debt dashboard with top-debtor tracking, scratch-card result checking.",
    },
    {
      id: "comm",
      icon: MessageSquare,
      title: "Communication Portal",
      headline: "Parents never find out late",
      color: "border-[#ff7b92] text-rose-600 bg-rose-50/50",
      desc: "WhatsApp, Email, and SMS messaging with templates; automatic alerts the moment a student scores below 60% on any assessment.",
    },
    {
      id: "welfare",
      icon: Users,
      title: "Student Welfare & Operations",
      headline: "Beyond academics",
      color: "border-[#fcb3e2] text-pink-600 bg-pink-50/50",
      desc: "Daily attendance tracking, timetabling, library loan management, hostel room allocation, and school bus route tracking with GPS stop coordinates.",
    },
    {
      id: "admissions",
      icon: Calendar,
      title: "Admissions Portal",
      headline: "From application to enrollment",
      color: "border-[#9fb0ff] text-indigo-700 bg-indigo-50/50",
      desc: "Public application forms with online fee payment, entrance exam scheduling tied directly into HCBT, and a full pending ➔ enrolled status workflow with automatic admission numbers.",
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
    <div className="min-h-screen bg-[#f8f9fc] font-sans selection:bg-[#1447E6] selection:text-white">
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
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                <span className="text-xl">😃</span>
                <span className="text-sm font-bold text-[#1447E6]">Hanoled Workspace</span>
              </div>
              
              <div className="space-y-6">
                <h1 className="text-[1.75rem] font-bold leading-[1.15] text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                  <span className="text-[#1447E6]">Hanoled</span>
                  <br />
                  The ultimate school management system!
                </h1>
                
                {/* Wavy accent line under title */}
                <svg width="120" height="20" viewBox="0 0 120 20" className="text-[#f6c24e] fill-none stroke-current stroke-[4px]">
                  <path d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" strokeLinecap="round" />
                </svg>

                <p className="text-lg leading-relaxed text-slate-500">
                  A modern platform built specifically for West African schools that brings administrators, teachers, and parents together. Empower parents to monitor their wards&rsquo; academic performance and fee statuses in real-time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <Button
                  asChild
                  className="h-14 rounded-full bg-[#1b2333] px-8 text-base font-bold text-white transition-all hover:bg-[#2c3850] hover:shadow-lg hover:-translate-y-1"
                >
                  <Link href="#contact-quote">
                    Book a Custom Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[
                      { bg: "bg-[#7b5fff]", initials: "TC" },
                      { bg: "bg-[#f6c24e]", initials: "PA" },
                      { bg: "bg-[#4ecb71]", initials: "AD" },
                      { bg: "bg-[#ff7b92]", initials: "ST" },
                    ].map((user, i) => (
                      <div
                        key={i}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm ${user.bg}`}
                      >
                        {user.initials}
                      </div>
                    ))}
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#1b2333] text-[10px] font-bold text-white shadow-sm">
                      +1200
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Users</span>
                </div>
              </div>
            </div>

            {/* Right Box (African Student Hero Portrait) */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute -left-6 top-1/4 h-8 w-8 text-[#f6c24e]">
                <Award className="h-full w-full fill-current" />
              </div>
              <div className="absolute -right-4 top-10 h-10 w-10 text-[#1447E6]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>

              {/* Green Floating Badge */}
              <div className="absolute bottom-4 left-4 sm:bottom-10 sm:-left-6 z-20 flex items-center gap-3 rounded-[1.5rem] bg-[#4cd988] px-5 py-4 text-white shadow-xl shadow-[#4cd988]/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide">Unified Platform</p>
                  <p className="text-xs font-medium text-white/90 mt-0.5">Built for Nigerian Schools</p>
                </div>
              </div>

              {/* Main Image Container */}
              <div className="relative h-[350px] sm:h-[450px] lg:h-[550px] w-full max-w-[450px]">
                <div className="absolute inset-x-8 bottom-0 h-20 rounded-[50%] bg-[#5e41ff]/20 blur-2xl" />
                <Image
                  src="/landing-student-hero.png"
                  alt="Hanoled Student"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
                  className="object-cover rounded-[3rem] shadow-2xl z-10"
                  style={{ objectPosition: "center top" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2.1: HCBT ENGINE (Dedicated Section) */}
        <section className="mt-16 rounded-[3rem] bg-slate-900 text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#5e41ff]/20 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          
          <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Description */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-4 py-1.5 text-xs font-bold text-[#f0c34b] shadow-sm">
                <Rocket className="h-4 w-4" />
                Industry First Feature
              </div>
              <h2 className="text-3xl font-extrabold sm:text-4xl md:text-5xl leading-tight">
                HCBT — exams that run themselves.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
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
                    <CheckCircle2 className="h-6 w-6 text-[#f0c34b] shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm sm:text-base font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Mockup UI of a running exam */}
            <div className="w-full  mx-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:p-6 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hanoled CBT Exam Screen</div>
              </div>
              
              <div className="flex justify-between items-center bg-slate-900 rounded-xl p-3 border border-slate-800 mb-4">
                <div className="text-xs sm:text-sm font-bold text-[#f0c34b]">BIOLOGY SSCE EXAM</div>
                <div className="flex items-center gap-2 font-mono text-sm text-red-400 font-bold bg-slate-950 px-3 py-1.5 rounded-lg border border-red-950">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-500" />
                  <span>Time Left: 42:15</span>
                </div>
              </div>

              {/* Anti-cheat Alert simulation */}
              <div className="bg-red-950/40 border border-red-900 rounded-xl p-3 mb-4 text-xs flex gap-2.5 text-red-300">
                <Shield className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <span className="font-bold text-red-200">Anti-Cheating Proctor Active:</span> Tab switches will trigger lockouts. Strikes: <span className="font-extrabold text-red-400 bg-slate-950 px-1.5 py-0.5 rounded">0 / 3</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-200 leading-relaxed">
                  Question 14: Which of the following organelles is responsible for the cellular respiration process?
                </div>

                <div className="grid gap-2">
                  {[
                    { key: "A", val: "Ribosomes" },
                    { key: "B", val: "Mitochondria", checked: true },
                    { key: "C", val: "Golgi apparatus" },
                    { key: "D", val: "Endoplasmic reticulum" }
                  ].map((opt) => (
                    <div
                      key={opt.key}
                      className={`flex items-center gap-3 border rounded-xl p-3 text-xs transition-colors cursor-pointer ${
                        opt.checked 
                          ? "border-[#5e41ff] bg-[#5e41ff]/10 text-white" 
                          : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        opt.checked ? "bg-[#5e41ff] text-white" : "bg-slate-800 text-slate-400"
                      }`}>{opt.key}</span>
                      <span>{opt.val}</span>
                    </div>
                  ))}
                </div>

                {/* Navigator */}
                <div className="pt-4 border-t border-slate-800 mt-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Question Navigator</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, "14", 15].map((num) => (
                      <div
                        key={num}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                          num === "14" 
                            ? "bg-[#5e41ff] text-white font-extrabold ring-2 ring-[#7b5fff]/50"
                            : typeof num === 'string'
                              ? "bg-slate-800 text-slate-400"
                              : num < 14 
                                ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                                : "bg-slate-900 border border-slate-800 text-slate-500"
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 bg-slate-900 rounded-lg">Flag for Review</button>
                  <button className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors">Submit Exam</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE SECTION: Admin & Lists Grid */}
        <section className="mt-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Admin Blue Card */}
          <div className="relative overflow-hidden rounded-[3rem] bg-[#9fb0ff] p-8 pb-0 text-slate-900 shadow-sm transition-transform hover:-translate-y-1">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                 <h2 className="text-3xl font-bold leading-tight">
                    School<br/>Admin
                 </h2>
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/30 text-white shadow-sm">
                   <ChevronRight className="h-5 w-5" />
                 </div>
              </div>

              {/* Admin Portrait Replacement (Nigerian Principal Image) */}
              <div className="relative mt-8 flex justify-center">
                <div className="h-48 w-48 overflow-hidden rounded-t-[2rem] bg-slate-900 border-[6px] border-[#8e9ff4]">
                  <Image
                    src="/landing-admin-portrait.png"
                    alt="School Admin"
                    width={200}
                    height={200}
                    className="h-full w-full object-cover object-center opacity-90"
                  />
                </div>
                {/* Black Badge overlapping */}
                <div className="absolute -left-4 bottom-10 rounded-2xl bg-[#1b2333] px-4 py-3 text-center text-xs font-bold text-white shadow-xl shadow-[#1b2333]/40 transform -rotate-6">
                  <p>Overseeing</p>
                  <p className="text-[#a4b4ff]">entire school</p>
                  <p>records</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Workflows List */}
          <div className="flex flex-col justify-center gap-4">
             <div className="inline-flex justify-self-start items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#1447E6] shadow-sm self-start ml-2">
                Core Workflows
             </div>

             {[
               { icon: Users, title: "Staff & records", color: "bg-[#ffb09c] text-[#a53b21]", bg: "bg-white", desc: "Manage personnel easily" },
               { icon: FileSpreadsheet, title: "Teacher gradebooks", color: "bg-[#fce588] text-[#937400]", bg: "bg-white", desc: "Dynamic assessments" },
               { icon: BellRing, title: "Parent result access", color: "bg-[#a6baf5] text-[#1b3687]", bg: "bg-white", desc: "Real-time ward monitoring" },
               { icon: Shield, title: "Student data & security", color: "bg-[#fcb3e2] text-[#902a6b]", bg: "bg-white", desc: "Role-based controls" },
             ].map((item, idx) => (
                <div key={idx} className="group relative flex items-center justify-between rounded-[2rem] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md border border-slate-100">
                  <div className="flex flex-1 items-center gap-4 pl-2">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] shadow-sm ${item.color}`}>
                       <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#1b2333] text-white transition-colors group-hover:bg-[#1447E6]">
                     <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
             ))}
          </div>
        </section>

        {/* SECTION 2.2: EXPANDED FEATURE OVERVIEW (Tabbed Breakdown) */}
        <section id="about" className="mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <Badge className="bg-[#1447E6]/10 text-[#1447E6] border-0 hover:bg-[#1447E6]/20 px-3.5 py-1.5 text-xs font-bold mb-3">
              Platform Capabilities
            </Badge>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              What can Hanoled do?
            </h2>
            <p className="mt-3  text-slate-500 text-sm sm:text-base font-semibold">
              Explore the complete set of co-developed modules packed into Hanoled. Every school gets full access to all features with no artificial limits.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_2fr] max-w-6xl mx-auto items-start">
            {/* Tabs List */}
            <div className="flex flex-col gap-2 bg-white/70 p-2 rounded-[2rem] border border-slate-100 shadow-sm">
              {modules.map((m) => {
                const isSelected = activeTab === m.id;
                const IconComponent = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveTab(m.id)}
                    className={`flex items-center gap-3 w-full text-left p-3.5 rounded-[1.5rem] transition-all text-sm font-bold ${
                      isSelected
                        ? "bg-[#1b2333] text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 shrink-0 ${isSelected ? "text-[#f0c34b]" : "text-[#7b5fff]"}`} />
                    <span className="truncate">{m.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Tab content pane */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden min-h-[280px] flex flex-col justify-center">
              {modules.map((m) => {
                if (activeTab !== m.id) return null;
                const IconComponent = m.icon;
                return (
                  <div key={m.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${m.color}`}>
                        <IconComponent className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#7b5fff]">Module Spotlight</h4>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{m.title}</h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-slate-800">{m.headline}</h4>
                      <p className="text-slate-500 leading-relaxed text-sm sm:text-base font-semibold">
                        {m.desc}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Full Access Included</span>
                      <span className="text-[#1447E6] flex items-center gap-1">Enterprise Grade <Crown className="h-3 w-3" /></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2.3 & 2.6: SECURITY & PAYMENT INTEGRATION LOGOS BAR */}
        <section className="mt-16 rounded-[3rem] border border-slate-100 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Security */}
            <div className="space-y-6">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-0 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold">
                Security & Data Trust
              </Badge>
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
            <div className="bg-[#f8f9fc] rounded-[2.5rem] border border-slate-200/60 p-8 flex flex-col justify-center items-center gap-6 text-center">
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
              <div className="text-[10px] font-bold text-[#4cd988] bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                🔒 256-bit SSL secure gateway
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2.4: ONBOARDING STEPS */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-12">
            <Badge className="bg-[#f0c34b]/10 text-[#937400] border-0 hover:bg-[#f0c34b]/20 px-3.5 py-1.5 text-xs font-bold mb-3">
              Implementation Pathway
            </Badge>
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

        {/* SECTION 2.7: FAQ SECTION */}
        <section className="mt-16 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center mb-10">
            <Badge className="bg-[#7b5fff]/10 text-[#1447E6] border-0 hover:bg-[#7b5fff]/20 px-3.5 py-1.5 text-xs font-bold mb-3">
              Frequently Asked Questions
            </Badge>
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

        {/* SECTION 1.1: BOOK A DEMO / CUSTOM QUOTE FORM */}
        <section id="contact-quote" className="mt-16 max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-[3rem] bg-white p-8 sm:p-12 border border-slate-100 shadow-xl">
            <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-[#5e41ff]/5 blur-2xl" />
            
            <div className="relative z-10 text-center mb-8">
              <Badge className="bg-[#7b5fff]/10 text-[#1447E6] border-0 px-3 py-1.5 text-xs font-bold mb-3">
                Get Started
              </Badge>
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Get a custom quote for your school
              </h2>
              <p className="mt-2 text-slate-500 text-xs sm:text-sm font-semibold  mx-auto">
                No standardized checklists. Let us co-develop a customized Hanoled implementation blueprint matching your school term structures.
              </p>
            </div>

            {isSubmitted ? (
              <div className="flex flex-col items-center text-center p-8 bg-emerald-50 border border-emerald-100 rounded-2xl relative z-10 space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8f9fc] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Estimated Student Count</label>
                    <input
                      type="number"
                      placeholder="e.g. 350"
                      value={formData.studentCount}
                      onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8f9fc] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8f9fc] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8f9fc] px-4 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1447E6] focus:bg-white"
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

        {/* BOTTOM CALL TO ACTIONS (Purple & Yellow) */}
        <section id="contact" className="mt-16 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] relative">
          <div className="absolute -left-5 top-14 z-20 flex hidden lg:flex items-center justify-center w-8 py-6 bg-[#1b2333] text-white text-xs font-bold rounded-l-md rounded-r-none tracking-widest [writing-mode:vertical-lr] transform rotate-180 shadow-lg cursor-default h-40">
             SECURE
          </div>

          {/* Left Purple Box */}
          <div className="relative overflow-hidden rounded-[3rem] bg-[#6e4ef6] p-8 sm:p-10 lg:p-12 text-white shadow-xl shadow-[#6e4ef6]/20">
             <svg className="absolute top-0 right-0 w-full h-full text-white/5 opacity-50" viewBox="0 0 400 400" fill="none">
               <circle cx="350" cy="50" r="150" stroke="currentColor" strokeWidth="40" />
               <circle cx="350" cy="50" r="250" stroke="currentColor" strokeWidth="20" strokeDasharray="20 20" />
             </svg>

             <div className="grid gap-8 lg:grid-cols-[1fr_auto] items-center relative z-10 h-full">
                <div className="space-y-6">
                   <div className="inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold ring-1 ring-white/30 backdrop-blur-sm">
                      <BriefcaseIcon className="mr-2 h-4 w-4" />
                      About Hanoled
                   </div>
                   <h2 className="text-2xl font-bold leading-[1.1] tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                       A complete toolkit<br />for services!
                    </h2>
                   <p className="text-lg leading-relaxed text-white/80 font-medium">
                     The Hanoled management system brings everything together in one place for faster growth, without the paperwork. Used by top schools.
                   </p>
                   <Button asChild className="mt-2 h-12 rounded-full bg-white px-8 text-black hover:bg-slate-100 font-bold hover:shadow-lg transition-all w-fit text-sm">
                      <Link href="#platform">
                         Explore Platform
                         <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                   </Button>
                </div>

                {/* Illustration Asset */}
                <div className="hidden lg:flex relative h-56 w-56 items-center justify-center">
                   <div className="relative h-48 w-48 rounded-[2rem] border-4 border-[#8e76fb] bg-[#5c3cd6] shadow-2xl flex flex-col items-center justify-center rotate-3">
                      <div className="absolute top-4 w-1/2 h-3 rounded-full bg-[#8e76fb]" />
                      <FileSpreadsheet className="h-16 w-16 text-white mb-2" />
                      <div className="flex gap-2">
                         <div className="h-6 w-6 rounded-full bg-[#f6c24e]" />
                         <div className="h-6 w-6 rounded-full bg-[#ff7b92]" />
                         <div className="h-6 w-6 rounded-full bg-[#4cd988]" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Yellow Box */}
          <div className="relative overflow-hidden rounded-[3rem] bg-[#f0c34b] p-8 sm:p-10 shadow-xl shadow-[#f0c34b]/20 flex flex-col justify-between">
             <div className="absolute -right-10 -bottom-10 text-white/20">
               <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
             </div>

             <div className="relative z-10 space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1b2333] text-white mb-2 shadow-md">
                  <BellRing className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight sm:text-3xl">
                   Want to<br/>register?
                 </h2>
                <p className="text-sm font-medium leading-relaxed text-slate-800/80">
                  If you are a school manager, simply enter your email to start the free onboarding process with Hanoled!
                </p>
             </div>

             <div className="relative z-10 mt-8 flex w-full max-w-sm rounded-[1.5rem] bg-white p-1.5 shadow-sm border border-slate-100 focus-within:ring-2 focus-within:ring-[#5e41ff]/50">
               <input 
                 type="email" 
                 placeholder="Enter your email address..."
                 className="w-full bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
               />
               <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#f0c34b] text-slate-900 shadow-sm transition-transform hover:scale-105 hover:bg-[#eab733]">
                 <ArrowRight className="h-5 w-5" />
               </button>
             </div>
          </div>
        </section>

        {/* BOTTOM WHITE CTA SECTION (Before Footer) */}
        <section className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-8 rounded-[3rem] bg-white px-8 py-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:px-16 border border-slate-100">
           <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 text-[#1447E6] font-bold">
                 <Globe className="h-5 w-5" />
                 <span>Join the network</span>
              </div>
               <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                  Become a Hanoled member today!
               </h2>
              <p className="mt-4 text-lg font-medium text-slate-500">
                 Start managing your entire school easily and dynamically today. The future of operations starts here.
              </p>
           </div>
           
           {/* Phone mockup placeholder */}
           <div className="relative flex justify-center w-full max-w-[280px]">
              <div className="relative h-64 w-full rounded-[2rem] border-[12px] border-slate-900 bg-white shadow-2xl overflow-hidden flex flex-col transform rotate-3 z-10">
                 {/* Mock UI inside phone */}
                 <div className="h-12 w-full bg-[#f8f9fc] border-b flex items-center justify-between px-3">
                   <School className="h-5 w-5 text-[#1447E6]" />
                   <div className="h-2 w-16 bg-slate-200 rounded-full" />
                   <div className="h-6 w-6 rounded-full bg-slate-200" />
                 </div>
                 <div className="flex-1 p-4 space-y-3">
                   <div className="h-16 w-full rounded-xl bg-gradient-to-r from-[#e7e1ff] to-[#f4f2ff]" />
                   <div className="h-12 w-full rounded-xl bg-slate-100" />
                   <div className="h-12 w-full rounded-xl bg-slate-100" />
                 </div>
              </div>
              
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#f0c34b]/20 blur-3xl" />
           </div>
        </section>

      </main>

      <BrandRibbon />

      <MarketingFooter />
    </div>
  );
}

// Icon helper since Briefcase isn't imported above but used
function BriefcaseIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}
