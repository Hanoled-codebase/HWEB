import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { HanoledLogo } from "@/components/ui/HanoledLogo";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0B1220] border-t border-white/10 text-slate-400 mt-auto w-full">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-8 md:grid-cols-5 border-b border-white/10 pb-12">
          {/* Column 1 - Brand */}
          <div className="col-span-2 space-y-4 md:col-span-1">
            <HanoledLogo variant="white" size="md" />
            <p className="text-xs font-semibold leading-relaxed text-slate-300">
              Modern school management, built specifically for Nigerian primary & secondary schools.
            </p>
            
            {/* Social icons */}
            <div className="flex items-center gap-3 text-slate-400">
              <Link href="https://wa.me/2347047396999" target="_blank" className="hover:text-[#12B76A] transition-colors">
                <span className="sr-only">WhatsApp</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 1.981 14.119.957 11.49.957c-5.43 0-9.85 4.37-9.855 9.801-.002 1.768.468 3.493 1.36 5.031L1.93 21.09l5.127-1.346v-.002-.001-.001z"/>
                </svg>
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                <span className="sr-only">X / Twitter</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Link>
              <Link href="#" className="hover:text-[#1447E6] transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2 text-xs font-semibold">
              <li><Link href="/features" className="hover:text-[#1447E6] transition-colors">Features</Link></li>
              <li><Link href="/hcbt" className="hover:text-[#1447E6] transition-colors">HCBT / Exam Engine</Link></li>
              <li><Link href="/admissions-portal" className="hover:text-[#1447E6] transition-colors">Admissions Portal</Link></li>
              <li><Link href="/security" className="hover:text-[#1447E6] transition-colors">Security</Link></li>
              <li><Link href="/#contact-quote" className="hover:text-[#1447E6] transition-colors">Book a Demo</Link></li>
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2 text-xs font-semibold">
              <li><Link href="/about" className="hover:text-[#1447E6] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#1447E6] transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4 - Support */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-2 text-xs font-semibold">
              <li><Link href="/help" className="hover:text-[#1447E6] transition-colors">Help Center</Link></li>
              <li><Link href="/support" className="hover:text-[#1447E6] transition-colors">Submit a Support Ticket</Link></li>
              <li><Link href="/faqs" className="hover:text-[#1447E6] transition-colors">FAQs</Link></li>
            </ul>
          </div>

          {/* Column 5 - Legal */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2 text-xs font-semibold">
              <li><Link href="/privacy" className="hover:text-[#1447E6] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#1447E6] transition-colors">Terms of Service</Link></li>
              <li><Link href="/data-protection" className="hover:text-[#1447E6] transition-colors">Data Protection Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 pt-8 text-xs font-semibold sm:flex-row text-slate-400">
          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-[#1447E6]" /> info@hanoled.com</span>
            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-[#1447E6]" /> +234 704 739 6999</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#1447E6]" /> Abeokuta, Nigeria</span>
          </div>
          <div>
            © {new Date().getFullYear()} Hanoled School Platform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
