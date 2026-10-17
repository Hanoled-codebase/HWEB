import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { BrandRibbon } from "@/components/landing/BrandRibbon";
import {
  ArrowLeft,
  ArrowRight,
  MonitorSmartphone,
  School,
  Share2,
  Calendar,
  Clock,
  Shield,
  FileSpreadsheet,
  Users
} from "lucide-react";

const articleData = {
  "centralized-directory": {
    badge1: "Administration",
    badge2: "Management",
    title: "Centralized Directory: The Future of School Management",
    date: "March 25, 2026",
    time: "4 min read",
    gradient: "from-blue-50 to-blue-200",
    icon: School,
    heroText: "Centralized",
    iconColor: "text-black/10",
    content: (
      <>
        <p className="mb-6 text-lg font-medium leading-relaxed text-slate-800 sm:mb-8 sm:text-xl">
          In today’s fast-paced educational environments, maintaining scattered directories of students, teachers, and parents is a recipe for administrative burnout. Hanoled brings a cohesive, centralized structure that connects the entire institution.
        </p>
        <h2 className="mb-4 mt-8 text-xl sm:text-2xl">Why Centralization Matters</h2>
        <p>
          Schools traditionally rely on disconnected spreadsheets or clunky legacy software. This results in missing data, duplicate entries, and frustrated parents trying to understand where to find information. A unified directory means:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4 mb-8">
          <li><strong>Single Source of Truth:</strong> Change a student&apos;s record once, and it updates across gradebooks, parent portals, and admin dashboards simultaneously.</li>
          <li><strong>Automated Role Binding:</strong> Assigning a parent to a student automatically unlocks secure, child-specific access to grades and alerts.</li>
          <li><strong>Rapid Communication:</strong> Staff can instantly broadcast announcements to specific classes without manually collating email lists.</li>
        </ul>
        <h2 className="mb-4 mt-10 text-xl sm:mt-12 sm:text-2xl">Implementing the Change</h2>
        <p>
          Transitioning to a unified system might sound daunting, but it starts with simple steps. By utilizing Hanoled&apos;s intuitive onboarding module, schools can quickly drag and drop existing rosters into the platform. 
        </p>
        <p>
          The system intelligently maps out hierarchies, ensuring that the <i>School Manager</i> retains top-level oversight, while teachers seamlessly gain control of their specific modular gradebooks.
        </p>
        <div className="relative my-8 rounded-[1.75rem] bg-amber-50 p-5 pt-6 sm:my-10 sm:rounded-[2rem] sm:p-6 sm:pt-7">
          <span aria-hidden="true" className="absolute -top-0.5 left-6 h-1.5 w-14 rounded-full bg-[#F5A623]" />
          <p className="m-0 text-slate-800 font-medium italic">
            &ldquo;Before Hanoled, finding a parent&apos;s updated phone number took hunting through three different files. Now, it&apos;s searchable from the dashboard in seconds.&rdquo;
          </p>
          <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">— School Administrator</p>
        </div>
        <p>
          Innovation in education doesn&apos;t just mean new ways to teach—it means new ways to manage the environment surrounding the teaching. By clearing administrative hurdles, Hanoled lets educators focus on what they do best: leading the next generation.
        </p>
      </>
    )
  },
  "dynamic-gradebooks": {
    badge1: "Academics",
    badge2: "Performance",
    title: "Dynamic Gradebooks: Real-Time Assessment and Clarity",
    date: "April 2, 2026",
    time: "5 min read",
    gradient: "from-blue-100 to-blue-300",
    icon: FileSpreadsheet,
    heroText: "Perform",
    iconColor: "text-[#0B2E99]/10",
    content: (
      <>
        <p className="mb-6 text-lg font-medium leading-relaxed text-slate-800 sm:mb-8 sm:text-xl">
          Teachers spend hours manually calculating scores, formatting transcripts, and preparing reports at the end of every term. Hanoled&apos;s dynamic gradebooks eliminate this redundant work with immediate computation and visual tracking.
        </p>
        <h2 className="mb-4 mt-8 text-xl sm:text-2xl">Intuitive Assessment Entry</h2>
        <p>
          Recording scores should be as easy as filling out a clean, modern spreadsheet that instantly validates bounds. Our gradebooks support custom continuous assessments (CA) and exam formats perfectly tailored to your school&apos;s curriculum.
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4 mb-8">
          <li><strong>Instant Averaging:</strong> See class averages, top performers, and struggling students update in real-time as you enter each score.</li>
          <li><strong>Color-Coded Performance:</strong> Visual indicators make identifying score trends simple—emerald for high performers, amber indicating caution, and red for remedial alerts.</li>
          <li><strong>Commentary Made Easy:</strong> Drop pre-set or custom localized remarks based on dynamically calculated student standing.</li>
        </ul>
        <h2 className="mb-4 mt-10 text-xl sm:mt-12 sm:text-2xl">Unifying the School Map</h2>
        <p>
          What happens when scores are fully compiled? Typically, a messy printout. With Hanoled, compiled dynamic gradebooks instantly generate secure PDF broadsheets and individual report cards that parents see immediately depending on the admin&apos;s release date.
        </p>
        <div className="relative my-8 rounded-[1.75rem] bg-[#EEF0FF] p-5 pt-6 sm:my-10 sm:rounded-[2rem] sm:p-6 sm:pt-7">
          <span aria-hidden="true" className="absolute -top-0.5 left-6 h-1.5 w-14 rounded-full bg-[#1447E6]" />
          <p className="m-0 text-slate-800 font-medium italic">
            &ldquo;I used to take grade sheets home every weekend leading up to exam release. Now I calculate everything within the app and the system generates the broadsheets instantly!&rdquo;
          </p>
          <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">— Subject Teacher</p>
        </div>
      </>
    )
  },
  "role-based-access": {
    badge1: "Security",
    badge2: "Privacy",
    title: "Role-Based Access: Securing Educational Data Ecosystems",
    date: "April 10, 2026",
    time: "3 min read",
    gradient: "from-amber-50 to-amber-200",
    icon: Shield,
    heroText: "Secure",
    iconColor: "text-[#0B1220]/10",
    content: (
      <>
        <p className="mb-6 text-lg font-medium leading-relaxed text-slate-800 sm:mb-8 sm:text-xl">
          A school relies on maintaining strict confidentiality over student records, academic plans, and teacher data. Hanoled employs robust role-based access controls (RBAC) to ensure that users access exactly what they need—and nothing they don&apos;t.
        </p>
        <h2 className="mb-4 mt-8 text-xl sm:text-2xl">The Principle of Least Privilege</h2>
        <p>
          No one wants a parent stumbling into an internal staff directory or a teacher accidentally editing another subject&apos;s scores. Hanoled compartmentalizes data logically without making the platform difficult to navigate.
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-4 mb-8">
          <li><strong>Admin Supremacy:</strong> Complete oversight of system settings, billing, bulk modifications, and institution-wide broadcasts.</li>
          <li><strong>Teacher Sandbox:</strong> Read-only access to their allocated class rosters, with write access explicitly restricted to their active dynamic gradebook slots.</li>
          <li><strong>Parent Portals:</strong> Secure, read-only dashboard specifically linking them to their verified ward&apos;s attendance, remarks, and performance summaries.</li>
        </ul>
        <h2 className="mb-4 mt-10 text-xl sm:mt-12 sm:text-2xl">Data Trust and Reliability</h2>
        <p>
          Knowing that the right eyes are looking at the right data builds enormous trust. Admins have detailed audit logs showing score edits, and parents feel secure knowing that other people don&apos;t have access to their child&apos;s transcript.
        </p>
        <div className="relative my-8 rounded-[1.75rem] bg-[#EEF0FF] p-5 pt-6 sm:my-10 sm:rounded-[2rem] sm:p-6 sm:pt-7">
          <span aria-hidden="true" className="absolute -top-0.5 left-6 h-1.5 w-14 rounded-full bg-[#1447E6]" />
          <p className="m-0 text-slate-800 font-medium italic">
            &ldquo;Distributing report cards used to be a chaos of paper limits and privacy envelopes. Today, when we hit release, parents unlock only their child&apos;s dashboard via digital authentication.&rdquo;
          </p>
          <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">— School Proprietor</p>
        </div>
      </>
    )
  }
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  if (!Object.keys(articleData).includes(slug)) {
    notFound();
  }

  const article = articleData[slug as keyof typeof articleData];
  const Icon = article.icon;

  return (
    <div className="min-h-screen bg-[#f8f9fc] pb-12 font-sans selection:bg-[#1447E6] selection:text-white">
      {/* Top Navbar */}
      <MarketingHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
         <div className="mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#1447E6] sm:text-sm">
               <ArrowLeft className="h-4 w-4" />
               Back to front page
            </Link>
         </div>

         <article className="relative overflow-hidden rounded-[2.25rem] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-[3rem] sm:p-12">
            {/* Header Content */}
            <div className="relative z-10 space-y-5 sm:space-y-6">
               <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="rounded-full bg-[#1447E6]/10 px-4 py-1.5 text-xs font-bold text-[#1447E6]">
                     {article.badge1}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600">
                     {article.badge2}
                  </span>
               </div>
               
               <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold leading-[1.15] tracking-tight text-slate-900">
                  {article.title}
               </h1>
               
               <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 text-xs font-medium text-slate-500 sm:gap-6 sm:pb-8 sm:text-sm">
                  <div className="flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     {article.date}
                  </div>
                  <div className="flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     {article.time}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                     <button className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 sm:px-4 sm:text-sm">
                        <Share2 className="h-4 w-4" />
                        Share
                     </button>
                  </div>
               </div>
            </div>

            {/* Hero Image Block */}
            <div className={`relative mt-8 flex h-56 w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${article.gradient} sm:h-96 sm:rounded-[2rem]`}>
               <Icon className={`h-32 w-32 absolute ${article.iconColor}`} />
               <div className="absolute inset-0 bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:24px_24px] opacity-20" />
               
               {/* Decorative Abstract floating elements */}
               <div className="bg-white/40 h-24 w-24 rounded-full absolute -top-8 -right-8 blur-xl" />
               <div className="bg-[#1447E6]/20 h-40 w-40 rounded-full absolute bottom-4 left-10 blur-2xl" />
               
               <h2 className="z-10 -rotate-2 text-3xl font-bold italic text-white/50 mix-blend-overlay sm:text-5xl">{article.heroText}</h2>
            </div>

            {/* Content Body */}
            <div className="prose mt-10 max-w-none prose-base prose-slate 
                            prose-headings:font-bold prose-headings:text-slate-900 
                            prose-p:text-slate-600 prose-p:leading-relaxed 
                            prose-a:text-[#1447E6] prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                            prose-li:text-slate-600 sm:mt-12 sm:prose-lg">
               {article.content}
            </div>
            
            {/* Bottom Author block */}
            <div className="mt-12 flex items-center gap-4 border-t border-slate-100 pt-6 sm:mt-16 sm:pt-8">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1220] text-base font-bold text-white shadow-md sm:h-14 sm:w-14 sm:text-lg">
                  HA
               </div>
               <div>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">Hanoled Editorial Team</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Building the future of school tech.</p>
               </div>
            </div>
         </article>
      </main>

      <BrandRibbon />

      {/* Footer */}
      <footer className="bg-[#1447E6] pt-1 mt-8">
        <div className="bg-[#0B1220] px-6 py-8 text-center sm:text-left">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-sm font-medium text-slate-400 sm:flex-row">
            <p className="flex items-center gap-2">
               Access from everywhere! <MonitorSmartphone className="h-4 w-4" />
            </p>
            <p>
              © {new Date().getFullYear()} Hanoled School Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
