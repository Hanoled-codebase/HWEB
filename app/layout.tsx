import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { QueryProvider } from "@/components/app/QueryProvider";
import { ServiceWorkerCleanup } from "@/components/app/ServiceWorkerCleanup";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hanoled - School Management Platform",
  description: "Modern, unified school management system built specifically for Nigerian primary & secondary schools. HCBT Exam Engine, Admissions Portal, and School Management.",
  metadataBase: new URL("https://www.hanoled.com"),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
      { url: "/hanoled.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Hanoled - School Management Platform",
    description: "Modern, unified school management system built specifically for Nigerian primary & secondary schools.",
    url: "https://www.hanoled.com",
    siteName: "Hanoled",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hanoled",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanoled - School Management Platform",
    description: "Modern, unified school management system built specifically for Nigerian primary & secondary schools.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${poppins.className} min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans`}
        suppressHydrationWarning
      >
        <ServiceWorkerCleanup />
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
