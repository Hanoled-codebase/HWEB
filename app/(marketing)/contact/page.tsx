"use client";

import { Metadata } from "next";
import { Mail, MapPin, Phone, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Button } from "@/components/ui/button";

import { HSMS_BASE } from "@/lib/api";

const API_BASE = HSMS_BASE;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const data = {
      firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value.trim(),
      lastName:  (form.elements.namedItem("lastName")  as HTMLInputElement).value.trim(),
      email:     (form.elements.namedItem("email")     as HTMLInputElement).value.trim(),
      school:    (form.elements.namedItem("school")    as HTMLInputElement).value.trim(),
      message:   (form.elements.namedItem("message")   as HTMLTextAreaElement).value.trim(),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        const issues: string[] = json.issues || [];
        if (issues.length > 0) {
          issues.forEach((msg) => toast.error(msg));
        } else {
          toast.error(json.error || "Something went wrong. Please try again.");
        }
        return;
      }

      toast.success("Message sent! We'll get back to you within 24 hours.");
      form.reset();
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans selection:bg-[#1447E6] selection:text-white flex flex-col">
      <MarketingHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[3rem] bg-white px-6 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-12 sm:py-20 lg:px-16 text-center">
          {/* Dot Grid Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 shadow-sm transform rotate-2 hover:rotate-0 transition-transform cursor-default">
              <MessageSquare className="h-4 w-4 text-[#1447E6]" />
              <span className="text-sm font-bold text-[#1447E6]">Get in Touch</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
                Let&apos;s talk about <span className="text-[#1447E6]">your school</span>
              </h1>
              {/* Wavy accent line under title */}
              <svg width="120" height="20" viewBox="0 0 120 20" className="text-[#f6c24e] fill-none stroke-current stroke-[4px] mx-auto mt-2">
                <path d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" strokeLinecap="round" />
              </svg>
            </div>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              Whether you need a demo, have a question about pricing, or need technical support, our team is ready to help.
            </p>
          </div>
        </section>

        {/* Contact Grid Section */}
        <section className="mt-16 grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Left Column - Contact Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-8 h-full">
               <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Reach out directly</h3>
                  <p className="text-slate-500 font-medium mb-4">We usually respond within 2 hours during business days.</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex -space-x-3">
                      {[
                        { bg: "bg-[#7b5fff]", initials: "CS" },
                        { bg: "bg-[#f6c24e]", initials: "TJ" },
                        { bg: "bg-[#4ecb71]", initials: "KO" },
                      ].map((user, i) => (
                        <div
                          key={i}
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm ${user.bg}`}
                        >
                          {user.initials}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Support Team</span>
                  </div>
               </div>
               
               <div className="space-y-6 flex-1">
                 {/* Email */}
                 <div className="flex items-center gap-5 p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition-colors border border-blue-100/50">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[#1447E6]">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Email Us</p>
                      <a href="mailto:hello@hanoled.io" className="text-slate-500 font-medium hover:text-[#1447E6] transition-colors">
                        hello@hanoled.io
                      </a>
                    </div>
                 </div>
                 
                 {/* Phone */}
                 <div className="flex items-center gap-5 p-4 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors border border-emerald-100/50">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <Phone className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Call Us</p>
                      <a href="tel:+234800HANOLED" className="text-slate-500 font-medium hover:text-emerald-600 transition-colors">
                        +234 (800) HANOLED
                      </a>
                    </div>
                 </div>
                 
                 {/* Office */}
                 <div className="flex items-center gap-5 p-4 rounded-2xl bg-orange-50/50 hover:bg-orange-50 transition-colors border border-orange-100/50">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Visit Us</p>
                      <p className="text-slate-500 font-medium">
                        12 Innovation Drive, Yaba, Lagos
                      </p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          
          {/* Right Column - Form */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 shadow-xl relative overflow-hidden" id="contact-quote">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1447E6]/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#f6c24e]/10 blur-3xl pointer-events-none" />
            
            <h3 className="text-2xl font-bold text-white mb-8 relative z-10">Send us a message</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-bold text-slate-300">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-[#1447E6] focus:outline-none focus:ring-1 focus:ring-[#1447E6] transition-colors"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-bold text-slate-300">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-[#1447E6] focus:outline-none focus:ring-1 focus:ring-[#1447E6] transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-slate-300">
                  Work Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-[#1447E6] focus:outline-none focus:ring-1 focus:ring-[#1447E6] transition-colors"
                  placeholder="john@school.edu.ng"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="school" className="text-sm font-bold text-slate-300">
                  School Name
                </label>
                <input
                  id="school"
                  name="school"
                  type="text"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-[#1447E6] focus:outline-none focus:ring-1 focus:ring-[#1447E6] transition-colors"
                  placeholder="Excellence Academy"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-bold text-slate-300">
                  How can we help?
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-[#1447E6] focus:outline-none focus:ring-1 focus:ring-[#1447E6] transition-colors"
                  placeholder="Tell us about your school's needs..."
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#1447E6] hover:bg-[#0b33b3] h-14 text-white font-bold text-base shadow-lg shadow-[#1447E6]/20 transition-transform hover:-translate-y-1">
                {isSubmitting ? "Sending..." : <><Send className="mr-2 h-5 w-5" /> Send Message</>}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
