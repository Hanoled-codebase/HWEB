"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api$/, "");

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
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingHeader />

      <main className="flex-1 bg-slate-50/50 py-16 pb-28">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
             
             {/* Info Side */}
             <div className="space-y-8">
               <div>
                 <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-slate-900">
                   Get in touch with our team
                 </h1>
                 <p className="mt-4 text-lg text-slate-500 max-w-xl leading-relaxed">
                   Whether you have a question about features, trials, pricing, or need a demo, our team is ready to answer all your questions.
                 </p>
               </div>

               <div className="space-y-6 pt-4">
                 <div className="flex items-start gap-4">
                   <div className="bg-[#1447E6]/10 p-3 rounded-xl shrink-0 mt-1">
                     <Mail className="h-6 w-6 text-[#1447E6]" />
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-900 text-lg">Email us</h3>
                     <p className="text-slate-500">We aim to respond within 24 hours.</p>
                     <a href="mailto:info@hanoled.com" className="text-[#1447E6] hover:underline font-medium block mt-1">info@hanoled.com</a>
                   </div>
                 </div>

                 <div className="flex items-start gap-4">
                   <div className="bg-[#1447E6]/10 p-3 rounded-xl shrink-0 mt-1">
                     <Phone className="h-6 w-6 text-[#1447E6]" />
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-900 text-lg">Call us</h3>
                     <p className="text-slate-500">Mon-Fri from 9am to 6pm WAT.</p>
                     <a href="tel:+2347047396999" className="text-[#1447E6] hover:underline font-medium block mt-1">+234 704 739 6999</a>
                   </div>
                 </div>

                 <div className="flex items-start gap-4">
                   <div className="bg-[#1447E6]/10 p-3 rounded-xl shrink-0 mt-1">
                     <MapPin className="h-6 w-6 text-[#1447E6]" />
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-900 text-lg">Visit us</h3>
                     <p className="text-slate-500">Abeokuta & Lagos, Nigeria.</p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Form Side */}
             <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200">
               <h3 className="text-2xl font-bold text-slate-900 mb-6">Send us a message</h3>
               <form onSubmit={handleSubmit} className="space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium text-slate-900">First Name</label>
                      <Input id="firstName" name="firstName" placeholder="John" required className="bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium text-slate-900">Last Name</label>
                      <Input id="lastName" name="lastName" placeholder="Doe" required className="bg-slate-50 border-slate-200" />
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                   <label htmlFor="email" className="text-sm font-medium text-slate-900">Work Email</label>
                   <Input id="email" name="email" type="email" placeholder="john@school.edu" required className="bg-slate-50 border-slate-200" />
                 </div>

                 <div className="space-y-2">
                   <label htmlFor="school" className="text-sm font-medium text-slate-900">School / Institution Name</label>
                   <Input id="school" name="school" placeholder="Harvard Academy" className="bg-slate-50 border-slate-200" />
                 </div>

                 <div className="space-y-2">
                   <label htmlFor="message" className="text-sm font-medium text-slate-900">How can we help?</label>
                   <Textarea id="message" name="message" placeholder="Tell us about your needs..." required className="min-h-[120px] bg-slate-50 border-slate-200 resize-y" />
                 </div>

                 <Button type="submit" className="w-full bg-[#1447E6] hover:bg-[#0b33b3] text-white h-12 rounded-xl text-md font-semibold" disabled={isSubmitting}>
                   {isSubmitting ? (
                     "Sending..."
                   ) : (
                     <span className="flex items-center">
                       Send Message <Send className="ml-2 h-4 w-4" />
                     </span>
                   )}
                 </Button>
               </form>
             </div>
          </div>
        </div>
      </main>
      
      <MarketingFooter />
    </div>
  );
}
