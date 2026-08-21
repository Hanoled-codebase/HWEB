import { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service – Hanoled",
  description: "Terms of Service for using the Hanoled School Management Platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
              <Shield className="h-4 w-4" /> Legal
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Terms of <span className="text-[#1447E6]">Service</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose prose-slate">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Hanoled platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Hanoled is a school management platform providing tools for administration, academics, communications, and financial tracking for educational institutions. The service is subject to modification and enhancements over time.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            To use certain features of the service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
          </p>

          <h2>4. User Responsibilities</h2>
          <p>
            You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You agree not to disclose your password to any third party.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>
            You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You may not attempt to gain unauthorized access to our systems or user accounts.
          </p>

          <h2>6. Subscription and Billing</h2>
          <p>
            Access to certain features requires a paid subscription. Billing cycles, fees, and payment terms will be provided at the time of purchase. All fees are non-refundable unless otherwise required by law.
          </p>

          <h2>7. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes.
          </p>

          <h2>9. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@hanoled.com.
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
