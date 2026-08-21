"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { LayoutDashboard, Menu, X, ArrowRight } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/hcbt", label: "HCBT Engine" },
  { href: "/admissions-portal", label: "Admissions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 pt-4 pb-2 px-4 sm:px-6 lg:px-8 backdrop-blur-md bg-white/80 transition-all">
      <header className="mx-auto flex max-w-7xl items-center justify-between rounded-[2rem] border border-slate-100 bg-white px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:h-20 sm:px-6 py-3 sm:py-0">
        {/* Logo */}
        <HanoledLogo href="/" size="md" />

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#0B1220] text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#1447E6]"
                }`}
              >
                {isActive && item.href === "/" ? (
                  <span className="flex items-center gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#1447E6]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1.5 rounded-full bg-[#1447E6] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1447E6]/25 transition-all hover:bg-[#0b33b3] hover:shadow-xl hover:shadow-[#1447E6]/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-4 shadow-xl lg:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#0B1220] text-white font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#1447E6]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-slate-100">
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1447E6] py-2.5 text-center text-sm font-bold text-white shadow-md hover:bg-[#0b33b3]"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
