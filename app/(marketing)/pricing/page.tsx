import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Wallet } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc] font-sans selection:bg-[#1447E6] selection:text-white">
      <MarketingHeader />

      <main className="flex-1 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 w-full">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[3rem] bg-white px-6 py-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-12 sm:py-20 lg:px-16 text-center">
          {/* Dot Grid Background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 shadow-sm transform rotate-2 hover:rotate-0 transition-transform cursor-default">
              <span className="text-xl">💳</span>
              <span className="text-sm font-bold text-[#1447E6]">Pricing Plans</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-[2rem] font-bold leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl">
                Simple, transparent pricing
              </h1>
              {/* Wavy accent line under title */}
              <svg width="120" height="20" viewBox="0 0 120 20" className="text-[#1447E6] fill-none stroke-current stroke-[4px] mx-auto mt-2">
                <path d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" strokeLinecap="round" />
              </svg>
            </div>

            <p className="text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto font-medium">
              No hidden fees. No surprise charges. Choose the plan that fits your school&apos;s size and needs.
            </p>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="mt-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto relative z-10">
            {/* Basic Plan */}
            <div className="flex flex-col p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow relative">
              <h3 className="text-2xl font-bold text-slate-900">Startup</h3>
              <p className="text-slate-500 text-sm font-medium mt-2">Free setup for small and new institutions.</p>
              
              <div className="my-8">
                 <span className="text-5xl font-extrabold text-slate-900">₦0</span>
                 <span className="text-slate-500 font-bold ml-1">/student /term</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {['Up to 50 Students', 'Unlimited Teachers', 'Standard Gradebooks', 'Parent Portal Access', 'Community Support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signin" className="flex h-14 items-center justify-center rounded-full border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold w-full transition-colors">
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="flex flex-col p-10 bg-[#1447E6] rounded-[3rem] shadow-xl transform md:-translate-y-6 relative overflow-hidden">
              <svg className="absolute top-0 right-0 w-full h-full text-white/5 opacity-50 pointer-events-none" viewBox="0 0 400 400" fill="none">
                 <circle cx="350" cy="50" r="150" stroke="currentColor" strokeWidth="40" />
                 <circle cx="350" cy="50" r="250" stroke="currentColor" strokeWidth="20" strokeDasharray="20 20" />
              </svg>

              <div className="absolute -top-3 -right-3 transform rotate-12 py-2 px-6 bg-[#F5A623] text-slate-900 text-[10px] font-black tracking-widest uppercase rounded-2xl shadow-lg border-2 border-white z-20">
                Most Popular
              </div>
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              
              <h3 className="text-2xl font-bold text-white mt-2 relative z-10">Growth</h3>
              <p className="text-blue-100 text-sm font-medium mt-2 relative z-10">Complete academic operations for scaling schools.</p>
              
              <div className="my-8 relative z-10">
                 <span className="text-5xl font-extrabold text-white">₦3,000</span>
                 <span className="text-blue-200 font-bold ml-1">/student /term</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1 relative z-10">
                {['Unlimited Students', 'Unlimited Teachers', 'Bulk Student Upload', 'Live Parent Notifications', 'Priority WAT Support', 'Full System Analytics'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white font-semibold text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-amber-900">
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/signin" className="relative z-10 flex h-14 items-center justify-center rounded-full bg-white text-[#1447E6] hover:bg-slate-50 font-bold shadow-lg w-full transition-transform hover:-translate-y-1">
                Upgrade to Growth
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="flex flex-col p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow relative">
              <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
              <p className="text-slate-500 text-sm font-medium mt-2">For large educational networks and universities.</p>
              
              <div className="my-8">
                 <span className="text-4xl font-extrabold text-slate-900">Custom</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {['Unlimited Students', 'Multiple Campuses', 'White-label Mobile App', 'Dedicated Account Manager', 'Custom API Integration'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/contact" className="flex h-14 items-center justify-center rounded-full border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold w-full transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
          
        {/* FAQs Section */}
        <section className="mt-20 text-center space-y-6">
           <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-100 px-4 py-1.5 shadow-sm">
             <span className="text-sm font-bold text-[#1447E6]">Got Questions?</span>
           </div>
           <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
           
           <div className="max-w-4xl mx-auto text-left grid gap-6 md:grid-cols-2 mt-8">
              {[
                { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade your plan at any time from your organization settings." },
                { q: "Do you offer termly billing discounts?", a: "Yes, we offer custom discounts if you choose to pay annually across three academic terms." },
                { q: "What happens after onboarding?", a: "Our dedicated support team assists you with data migration, teacher training, and system setup." },
                { q: "Are there setup fees?", a: "No, there are zero setup fees across all our standard plans. Enterprise implementations may vary depending on custom API needs." }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <h5 className="font-bold text-slate-900">{faq.q}</h5>
                  <p className="text-slate-500 font-medium mt-3 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
           </div>
        </section>
      </main>
      
      <MarketingFooter />
    </div>
  );
}
