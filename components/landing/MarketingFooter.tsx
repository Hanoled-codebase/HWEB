import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { HanoledLogo } from "@/components/ui/HanoledLogo";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0B1220] border-t border-white/10 text-slate-400 mt-auto w-full">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-8 md:grid-cols-4 lg:grid-cols-5 border-b border-white/10 pb-12">
          {/* Column 1 - Brand */}
          <div className="col-span-2 space-y-4 md:col-span-4 lg:col-span-1">
            <HanoledLogo variant="white" size="md" />
            <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-300">
              Modern school management, built specifically for Nigerian primary & secondary schools.
            </p>
            
            {/* Social: only channels with a real address. Add X / LinkedIn here once the accounts exist. */}
            <div className="-ml-2.5 flex items-center gap-1 text-slate-400">
              <Link href="https://wa.me/2347047396999" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white">
                <span className="sr-only">WhatsApp</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 1.981 14.119.957 11.49.957c-5.43 0-9.85 4.37-9.855 9.801-.002 1.768.468 3.493 1.36 5.031L1.93 21.09l5.127-1.346v-.002-.001-.001z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-1 text-sm font-medium pointer-coarse:space-y-0">
              <li><Link href="/features" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Features</Link></li>
              <li><Link href="/hcbt" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">HCBT / Exam Engine</Link></li>
              <li><Link href="/admissions-portal" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Admissions Portal</Link></li>
              <li><Link href="/security" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Security</Link></li>
              <li><Link href="/#contact-quote" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Book a Demo</Link></li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-1 text-sm font-medium pointer-coarse:space-y-0">
              <li><Link href="/about" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">About Us</Link></li>
              <li><Link href="/contact" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4 - Support */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-1 text-sm font-medium pointer-coarse:space-y-0">
              <li><Link href="/help" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Help Center</Link></li>
              <li><Link href="/support" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Submit a Support Ticket</Link></li>
              <li><Link href="/faqs" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">FAQs</Link></li>
            </ul>
          </div>

          {/* Column 5 - Legal */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-1 text-sm font-medium pointer-coarse:space-y-0">
              <li><Link href="/privacy" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Privacy Policy</Link></li>
              <li><Link href="/terms" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Terms of Service</Link></li>
              <li><Link href="/data-protection" className="inline-flex items-center py-1 transition-colors hover:text-white pointer-coarse:min-h-11 pointer-coarse:py-0">Data Protection Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 pt-8 text-xs font-semibold md:flex-row text-slate-400">
          <div className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-1">
            <a href="mailto:info@hanoled.com" className="flex items-center gap-1.5 transition-colors hover:text-white pointer-coarse:min-h-11"><Mail className="h-4 w-4 text-[#1447E6]" aria-hidden="true" /> info@hanoled.com</a>
            <a href="tel:+2347047396999" className="flex items-center gap-1.5 transition-colors hover:text-white pointer-coarse:min-h-11"><Phone className="h-4 w-4 text-[#1447E6]" aria-hidden="true" /> +234 704 739 6999</a>
            <span className="flex items-center gap-1.5 pointer-coarse:min-h-11"><MapPin className="h-4 w-4 text-[#1447E6]" aria-hidden="true" /> Abeokuta, Nigeria</span>
          </div>
          <div className="text-center md:text-right">
            © {new Date().getFullYear()} Hanoled School Platform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
