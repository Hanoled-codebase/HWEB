import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  School,
  Shield,
} from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { HeroUnderline, RiseWords } from "@/components/landing/motion";

export const metadata: Metadata = {
  title: "About Us – Hanoled",
  description:
    "Learn about Hanoled's mission to modernise school management across Nigeria with modern, accessible, cloud-native technology.",
};

const values = [
  {
    icon: School,
    title: "School-First Design",
    description:
      "We design every feature around the real operational realities of Nigerian schools — from power cuts to varying internet stability.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: Shield,
    title: "Uncompromising Integrity",
    description:
      "Student data, financial ledgers, and gradebooks are protected with bank-grade encryption and role-based permissions.",
    color: "bg-[#1447E6]/10 text-[#1447E6]",
  },
  {
    icon: Heart,
    title: "Relentless Support",
    description:
      "We don't just sell software; we partner with your school. Our support team is always a call or WhatsApp message away.",
    color: "bg-[#F5A623]/10 text-[#0B1220]",
  },
];



export default function AboutPage() {
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
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-8 flex flex-col items-center">
            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
                <RiseWords>
                  Modernising school management <br />
                  <span className="text-[#1447E6]">across West Africa</span>
                </RiseWords>
              </h1>
              {/* Wavy accent line under title: writes itself once the headline has risen */}
              <HeroUnderline />
            </div>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              Hanoled was founded with a simple mission: give every school the same powerful tools
              used by the best institutions in the world.
            </p>
          </div>
        </section>


        {/* Our Story Section */}
        <section className="mt-16 bg-white rounded-[3rem] px-8 py-16 sm:px-16 sm:py-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl mb-8">
              Why we started Hanoled
            </h2>
            
            <div className="space-y-6 text-lg leading-relaxed text-slate-500 font-medium">
              <p>
                For years, school administrators spent countless hours manually compiling report cards, tracking down tuition debt on paper registers, and manually typing out results for broadcast.
              </p>
              <blockquote className="relative my-8 rounded-2xl bg-[#EEF0FF] p-6 pt-7 text-slate-700 italic">
                <span aria-hidden="true" className="absolute -top-0.5 left-6 h-1.5 w-14 rounded-full bg-[#1447E6]" />
                "We spent months in staffrooms, bursar offices, and principal desks listening to the exact challenges school teams face every term. The result is an all-in-one platform."
              </blockquote>
              <p>
                Today, Hanoled powers forward-thinking schools, saving hundreds of administrative hours every academic session and providing parents with transparent, real-time insights into their children's education.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl md:text-4xl">
              What drives us forward
            </h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-3 max-w-6xl mx-auto">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="group relative flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] shadow-sm ${v.color}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#F5A623] px-8 py-16 sm:px-12 sm:py-20 text-center shadow-xl text-slate-900">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h2 className="text-3xl font-extrabold sm:text-5xl leading-tight">
                Join the Hanoled community
              </h2>
              <p className="text-lg text-[#0B1220]/80 font-bold">
                Be part of the movement to modernise education management. Let&apos;s build the future of schooling together.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/#contact-quote"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#0B1220] px-8 font-bold text-white transition-all hover:bg-[#1447E6] hover:-translate-y-1 hover:shadow-lg"
                >
                  Book a Demo <ArrowRight className="mk-arrow-x h-5 w-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-[#0B1220] px-8 font-bold text-[#0B1220] transition-all hover:bg-[#0B1220]/5"
                >
                  Contact Us
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
