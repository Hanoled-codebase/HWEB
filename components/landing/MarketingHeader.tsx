"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";

const featuresSubItems = [
  { href: "/hcbt", label: "HCBT Engine" },
  { href: "/admissions-portal", label: "Admissions Portal" },
];

const leftNavItems = [{ href: "/features", label: "Features" }, { href: "/contact", label: "Contact Us" }];
const rightNavItems = [{ href: "/about", label: "About Us" }];
const allNavItems = [...leftNavItems, ...rightNavItems];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href);
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
        isActive
          ? "bg-[#0B1220] text-white shadow-sm font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-[#1447E6]"
      }`}
    >
      {label}
    </Link>
  );
}

function FeaturesNavItem() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive =
    isActivePath(pathname, "/features") ||
    featuresSubItems.some((item) => isActivePath(pathname, item.href));

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={openNow}
        aria-expanded={open}
        className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
          isActive
            ? "bg-[#0B1220] text-white shadow-sm font-semibold"
            : "text-slate-600 hover:bg-slate-100 hover:text-[#1447E6]"
        }`}
      >
        Features
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-smooth)] ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-56 pt-2">
          <div className="m-pop rounded-2xl border border-slate-100 bg-white p-2 shadow-xl" style={{ ["--origin" as string]: "top left" }}>
            <Link
              href="/features"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1447E6] transition-colors hover:bg-slate-100"
            >
              All Features
            </Link>
            <div className="my-1 h-px bg-slate-100" />
            {featuresSubItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#1447E6]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const audienceEntrances = [
  { href: "/signin/student", label: "Student / Candidate" },
  { href: "/signin/parent", label: "Parent" },
  { href: "/signin/staff", label: "Staff / Admin" },
];

/** The header's Sign In control: hover (or click) reveals the role entrances —
 *  a person lands directly on the login form meant for them. Same hover
 *  pattern, timing and pane design as FeaturesNavItem. */
function SignInNavItem() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    // Leaving for a sign-in page should never leave a dead menu behind.
    if (isActivePath(pathname, "/signin")) setOpen(false);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, pathname]);

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <Link
        href="/signin"
        onClick={openNow}
        onFocus={openNow}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#1447E6] ${open ? "bg-slate-100 text-[#1447E6]" : ""}`}
      >
        Sign In
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-out-smooth)] ${open ? "rotate-180" : ""}`} />
      </Link>

      {open && (
        <div className="absolute right-0 top-full z-50 w-60 pt-2">
          <div className="m-pop rounded-2xl border border-slate-100 bg-white p-2 shadow-xl" style={{ ["--origin" as string]: "top right" }} role="menu">
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1447E6] transition-colors hover:bg-slate-100"
            >
              Universal sign-in
            </Link>
            <div className="my-1 h-px bg-slate-100" />
            {audienceEntrances.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block rounded-xl px-3.5 py-2.5 text-sm font-medium min-h-11 flex items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#1447E6]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="m-glass sticky top-0 z-50 pt-3 pb-2 px-3 sm:px-6 lg:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-[1.75rem] border border-slate-100 bg-white px-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:h-20 sm:rounded-[2rem] sm:px-6 py-2.5 sm:py-0">
        {/* Left Nav (desktop) */}
        <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
          <FeaturesNavItem />
          <NavLink href="/contact" label="Contact Us" />
        </nav>

        {/* Centered Logo */}
        <div className="shrink-0">
          <div className="sm:hidden">
            <HanoledLogo href="/" size="sm" />
          </div>
          <div className="hidden sm:block">
            <HanoledLogo href="/" size="md" />
          </div>
        </div>

        {/* Right Nav + CTAs (desktop) */}
        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          <nav className="flex items-center gap-0.5">
            {rightNavItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <SignInNavItem />
          <Link
            href="/contact"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1447E6] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1447E6]/25 transition-all hover:bg-[#0b33b3] hover:shadow-xl hover:shadow-[#1447E6]/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 lg:hidden"
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileMenuOpen}
        >
          <span key={mobileMenuOpen ? "close" : "open"} className="m-pop flex">{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</span>
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="m-pop mx-auto mt-2 max-h-[calc(100vh-6rem)] max-w-7xl overflow-y-auto overscroll-contain rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-xl lg:hidden" style={{ ["--origin" as string]: "top right" }}>
          <nav className="m-stagger flex flex-col gap-1">
            {allNavItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#0B1220] text-white font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-[#1447E6]"
                    }`}
                  >
                    {item.label}
                  </Link>
                  {item.href === "/features" && (
                    <div className="mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-4">
                      {featuresSubItems.map((sub) => {
                        const subActive = isActivePath(pathname, sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors ${
                              subActive
                                ? "text-[#1447E6] font-semibold"
                                : "text-slate-500 hover:bg-slate-50 hover:text-[#1447E6]"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-slate-100">
              <div>
                <Link
                  href="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <div className="mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-4">
                  {audienceEntrances.map((entrance) => (
                    <Link
                      key={entrance.href}
                      href={entrance.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-[#1447E6]"
                    >
                      {entrance.label}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1447E6] text-sm font-bold text-white shadow-md hover:bg-[#0b33b3]"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
