import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "Help Center – Hanoled",
  description:
    "Find answers to common questions, browse guides, and learn how to get the most out of Hanoled.",
};

const categories = [
  {
    icon: Settings,
    title: "Getting Started",
    description:
      "Learn how to set up your school, invite teachers, and configure your first term.",
    articles: 8,
    href: "/faqs",
  },
  {
    icon: GraduationCap,
    title: "Student Management",
    description:
      "How to add students, manage enrollments, transfer students between classes, and more.",
    articles: 12,
    href: "/faqs",
  },
  {
    icon: BookOpen,
    title: "Academics & Results",
    description:
      "Setting up grading scales, computing results, managing broadsheets, and result templates.",
    articles: 15,
    href: "/faqs",
  },
  {
    icon: CreditCard,
    title: "Fees & Finance",
    description:
      "Creating fee structures, recording payments, generating receipts, and financial reports.",
    articles: 10,
    href: "/faqs",
  },
  {
    icon: MessageSquare,
    title: "Communication",
    description:
      "Sending messages via WhatsApp, Email, and SMS. Managing templates and broadcast lists.",
    articles: 7,
    href: "/faqs",
  },
  {
    icon: Users,
    title: "Staff & Roles",
    description:
      "Inviting teachers, assigning roles and permissions, managing teaching assignments.",
    articles: 6,
    href: "/faqs",
  },
];

export default function HelpCenterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/40 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm">
              <HelpCircle className="h-4 w-4" /> Help Center
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              How can we help?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Search our knowledge base or browse by category to find answers
              to your questions.
            </p>

            {/* Search bar (decorative) */}
            <div className="mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search for help articles..."
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600">
                    {cat.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {cat.description}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-slate-400">
                    {cat.articles} articles
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Still need help? */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1220] px-8 py-16 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-[#1447E6]" />
            <h2 className="mt-4 text-3xl font-bold text-white">
              Still need help?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Our support team is ready to assist you. Submit a ticket and
              we&apos;ll get back to you within 24 hours.
            </p>
            <div className="mt-8">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#0F3BC4]"
              >
                Submit a Ticket <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
