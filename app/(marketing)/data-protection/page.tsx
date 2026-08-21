import { Metadata } from "next";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Protection Policy – Hanoled",
  description: "Data Protection Policy and GDPR/NDPR compliance details for Hanoled.",
};

export default function DataProtectionPage() {
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
              Data Protection <span className="text-[#1447E6]">Policy</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose prose-slate">
          <h2>1. Introduction</h2>
          <p>
            At Hanoled, data protection is fundamentally important to our service. This Data Protection Policy outlines our commitment to protecting the personal data of students, parents, and staff managed within our platform, ensuring compliance with relevant data protection laws including the Nigeria Data Protection Regulation (NDPR) and other global standards.
          </p>

          <h2>2. Scope</h2>
          <p>
            This policy applies to all data processed by Hanoled acting as a Data Processor on behalf of educational institutions (the Data Controllers).
          </p>

          <h2>3. Data Processing Principles</h2>
          <p>
            We adhere to the core principles of data protection:
          </p>
          <ul>
            <li><strong>Lawfulness, Fairness, and Transparency:</strong> Data is processed legally and transparently.</li>
            <li><strong>Purpose Limitation:</strong> Data is collected for specific, explicit, and legitimate purposes (providing the school management service).</li>
            <li><strong>Data Minimization:</strong> We only collect data that is adequate, relevant, and necessary for the service.</li>
            <li><strong>Accuracy:</strong> We provide tools for schools to keep their data accurate and up to date.</li>
            <li><strong>Storage Limitation:</strong> Data is kept in a form which permits identification of data subjects for no longer than is necessary.</li>
            <li><strong>Integrity and Confidentiality:</strong> Data is processed in a manner that ensures appropriate security, including protection against unauthorized or unlawful processing and against accidental loss, destruction, or damage.</li>
          </ul>

          <h2>4. Role of Hanoled (Data Processor)</h2>
          <p>
            When processing student and staff data, Hanoled acts as a Data Processor. The school determines the purpose and means of processing (acting as the Data Controller). We process data solely on the documented instructions of the school.
          </p>

          <h2>5. Technical and Organizational Measures</h2>
          <p>
            We implement stringent technical and organizational measures to ensure a level of security appropriate to the risk. This includes data encryption at rest and in transit, strict access control, regular security audits, and automated backups.
          </p>

          <h2>6. Data Breach Notification</h2>
          <p>
            In the event of a personal data breach, Hanoled will notify the affected educational institution (the Data Controller) without undue delay after becoming aware of it, assisting them in meeting their own notification obligations to authorities and data subjects.
          </p>

          <h2>7. Contact</h2>
          <p>
            For any data protection inquiries or to reach our Data Protection Officer, please contact data-protection@hanoled.com.
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
