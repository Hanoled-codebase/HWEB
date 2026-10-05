"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { DrawnCheck, RiseWords } from "@/components/landing/motion";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    school: "",
    category: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50/40 via-slate-50/50 to-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-sm font-semibold text-[#1447E6] shadow-sm">
              <Headphones className="h-4 w-4" /> Support
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              <RiseWords>
                Submit a Support Ticket
              </RiseWords>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              Having an issue or need assistance? Fill in the form below and our
              team will respond within 24 hours.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              {isSubmitted ? (
                <div data-motion="in" className="m-pop rounded-2xl border border-blue-200 bg-blue-50/50 p-12 text-center">
                  <DrawnCheck className="mx-auto h-12 w-12 text-[#1447E6]" />
                  <h2 className="mt-4 text-2xl font-bold text-slate-900">
                    Ticket Submitted!
                  </h2>
                  <p className="mt-2 text-slate-500">
                    We&apos;ve received your request and will get back to you
                    within 24 hours via email.
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1447E6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0b33b3]"
                  >
                    Back to Home <ArrowRight className="mk-arrow-x h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        School Name
                      </label>
                      <input
                        type="text"
                        value={formData.school}
                        onChange={(e) =>
                          setFormData({ ...formData, school: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100"
                        placeholder="Your school name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="bug">Bug Report</option>
                        <option value="billing">Billing Issue</option>
                        <option value="feature">Feature Request</option>
                        <option value="account">Account Access</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100"
                      placeholder="Describe your issue or question in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1447E6] px-6 py-3 font-semibold text-white transition-all hover:bg-[#0b33b3] shadow-md shadow-[#1447E6]/20 disabled:opacity-60 sm:w-auto"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Ticket
                  </button>
                </form>
              )}
            </div>

            {/* Contact info sidebar */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900">Other ways to reach us</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-[#1447E6]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Email</p>
                      <p className="text-sm text-slate-500">info@hanoled.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-[#1447E6]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Phone</p>
                      <p className="text-sm text-slate-500">+234 704 739 6999</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 text-[#1447E6]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">WhatsApp</p>
                      <p className="text-sm text-slate-500">
                        <Link
                          href="https://wa.me/2347047396999"
                          target="_blank"
                          className="text-[#1447E6] hover:underline"
                        >
                          Chat with us
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
                <h3 className="font-bold text-[#0B1220] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#1447E6]" />
                  Response Time
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  We typically respond within <strong className="text-slate-900 font-bold">24 hours</strong> on
                  business days. Urgent issues (system downtime, data access)
                  are prioritised and addressed within <strong className="text-[#1447E6] font-bold">4 hours</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
