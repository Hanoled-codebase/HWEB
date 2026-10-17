"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, HelpCircle } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { RiseWords } from "@/components/landing/motion";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I sign up for Hanoled?",
        a: "Visit our homepage and click 'Book a Demo' or 'Get Started'. Our team will set up your school account, walk you through the platform, and help you import existing data.",
      },
      {
        q: "Can I use Hanoled on my phone?",
        a: "Yes! Hanoled is fully responsive and works on phones, tablets, and desktops. Teachers and parents can access everything from their mobile browser — no app download required.",
      },
      {
        q: "How long does it take to set up?",
        a: "Most schools are fully operational within 1–2 days. We help you import your student records, set up classes, and configure your first term. Complex schools with multiple branches may take 3–5 days.",
      },
    ],
  },
  {
    category: "Academics & Results",
    questions: [
      {
        q: "How does result computation work?",
        a: "You set up grading scales and result templates, then enter scores per subject. Hanoled automatically computes totals, averages, positions, and generates broadsheet results with a single click.",
      },
      {
        q: "Can I customise report cards?",
        a: "Yes. Result templates are fully customisable — you can choose which fields to show, add affective domain assessments, psychomotor skills, teacher comments, and principal remarks.",
      },
      {
        q: "Does Hanoled support the Nigerian grading system?",
        a: "Absolutely. We support the standard A1–F9 WAEC grading scale, custom grading scales, and GPA-based systems. You can create multiple grading configurations for different class levels.",
      },
    ],
  },
  {
    category: "Fees & Payments",
    questions: [
      {
        q: "How do parents pay fees?",
        a: "Schools can record manual payments (cash, bank transfer) in the system. We also support integration with payment gateways for online fee collection, so parents can pay directly from their dashboard.",
      },
      {
        q: "Can I set different fee structures per class?",
        a: "Yes. You can create unique fee structures for each class level, including term-specific fees, one-time charges, and optional items like transport or uniforms.",
      },
      {
        q: "Does Hanoled generate receipts?",
        a: "Yes. Every payment recorded in the system generates a digital receipt that can be printed or shared via WhatsApp/email with the parent.",
      },
    ],
  },
  {
    category: "Communication",
    questions: [
      {
        q: "Can I send messages to all parents at once?",
        a: "Yes. The Bulk Send feature lets you broadcast messages to all parents in a specific class via WhatsApp, SMS, or email. You can use templates with variables like {{student_name}} for personalisation.",
      },
      {
        q: "Is WhatsApp integration included?",
        a: "Yes. Hanoled integrates with WhatsApp Business API, allowing you to send individual and bulk messages directly from the Communication Hub.",
      },
    ],
  },
  {
    category: "Security & Data",
    questions: [
      {
        q: "Is my school's data safe?",
        a: "Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We run automated daily backups and comply with the Nigeria Data Protection Regulation (NDPR).",
      },
      {
        q: "Who can access what?",
        a: "Hanoled uses role-based access control. Owners see everything, admins manage operations, teachers see only their assigned classes and subjects, and parents see only their children's records.",
      },
      {
        q: "Can I export my data?",
        a: "Yes. You can export student records, results, financial reports, and more as CSV or Excel files at any time. Your data belongs to you.",
      },
    ],
  },
  {
    category: "Pricing & Billing",
    questions: [
      {
        q: "How much does Hanoled cost?",
        a: "Pricing depends on the number of students and features you need. Contact us for a personalised quote — we offer plans for schools of every size, from 50 to 5,000+ students.",
      },
      {
        q: "Is there a free trial?",
        a: "We offer a guided demo and pilot period so you can experience the platform with your real school data before committing. Contact our sales team to get started.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. There are no long-term contracts. You can cancel your subscription at the end of any billing cycle. We'll help you export all your data if you decide to leave.",
      },
    ],
  },
];

export default function FaqsPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-indigo-50/30 to-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm">
              <HelpCircle className="h-4 w-4" /> FAQs
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              <RiseWords>
                Frequently Asked Questions
              </RiseWords>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Find quick answers to the most common questions about Hanoled.
            </p>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  {section.category}
                </h2>
                <div className="space-y-2">
                  {section.questions.map((faq, qi) => {
                    const id = `${section.category}-${qi}`;
                    const isOpen = openIndex === id;
                    return (
                      <div
                        key={id}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <button
                          onClick={() => toggle(id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between px-6 py-4 text-left"
                        >
                          <span className="text-sm font-semibold text-slate-800">
                            {faq.q}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ease-[var(--ease-out-smooth)] ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div className="m-collapsible" data-open={isOpen} aria-hidden={!isOpen}>
                          <div>
                            <div className="border-t border-slate-100 px-6 py-4">
                              <p className="text-sm leading-relaxed text-slate-500">
                                {faq.a}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-slate-50 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              Didn&apos;t find your answer?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Our support team is here to help. Submit a ticket and we&apos;ll
              get back to you shortly.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0F3BC4]"
              >
                Submit a Ticket <ArrowRight className="mk-arrow-x h-4 w-4" />
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Help Center <ArrowRight className="mk-arrow-x h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
