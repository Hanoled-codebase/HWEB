import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingHeader />

      <main className="flex-1 bg-slate-50/50 py-16 pb-28">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-slate-900">
              Simple, transparent pricing
            </h1>
            <p className="max-w-[700px] text-slate-500 md:text-xl">
              No hidden fees. No surprise charges. Choose the plan that fits your school&apos;s size and needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="flex flex-col p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-slate-900">Startup</h3>
              <p className="text-slate-500 mt-2">Free setup for small and new institutions.</p>
              <div className="my-6">
                 <span className="text-4xl font-bold text-slate-900">₦0</span>
                 <span className="text-slate-500 font-medium">/student /term</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Up to 50 Students', 'Unlimited Teachers', 'Standard Gradebooks', 'Parent Portal Access', 'Community Support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-[#1447E6] text-[#1447E6] hover:bg-[#1447E6]/10 h-12 font-semibold">
                <Link href="/signin">Get Started Free</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="flex flex-col p-8 bg-[#1447E6] rounded-2xl shadow-xl transform md:-translate-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 py-1 px-4 bg-[#F5A623] text-slate-950 text-xs font-bold tracking-wider uppercase rounded-bl-lg">
                Recommended
              </div>
              <h3 className="text-2xl font-bold text-white mt-2">Growth</h3>
              <p className="text-blue-100 mt-2">Complete academic operations for scaling schools.</p>
              <div className="my-6">
                 <span className="text-4xl font-bold text-white">₦3,000</span>
                 <span className="text-blue-100 font-medium">/student /term</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited Students', 'Unlimited Teachers', 'Bulk Student Upload', 'Live Parent Notifications', 'Priority WAT Support', 'Full System Analytics'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check className="h-5 w-5 text-[#F5A623] shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full rounded-full bg-white text-[#1447E6] hover:bg-slate-50 h-12 font-bold shadow-sm">
                <Link href="/signin">Upgrade to Growth</Link>
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="flex flex-col p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
              <p className="text-slate-500 mt-2">For large educational networks and universities.</p>
              <div className="my-6">
                 <span className="text-4xl font-bold text-slate-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited Students', 'Multiple Campuses', 'White-label Mobile App', 'Dedicated Account Manager', 'Custom API Integration'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full rounded-full border-slate-200 text-slate-900 hover:bg-slate-50 h-12 font-semibold">
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-20 text-center space-y-4">
             <h4 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h4>
             <div className="max-w-3xl mx-auto text-left grid gap-4 mt-8">
                {[
                  { q: "Can I switch plans later?", a: "Absolute. You can upgrade or downgrade your plan at any time from your organization settings." },
                  { q: "Do you offer termly billing discounts?", a: "Yes, we offer custom discounts if you choose to pay annually across three academic terms." },
                  { q: "What happens after onboarding?", a: "Our dedicated support team assists you with data migration, teacher training, and system setup." }
                ].map((faq, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="font-bold text-slate-900">{faq.q}</h5>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </main>
      
      <MarketingFooter />
    </div>
  );
}
