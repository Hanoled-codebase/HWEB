import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Poppins is bundled locally: the appliance has no internet, so the online
// build's next/font/google fetch is not an option here.
const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Poppins-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanoled CBT — Edge Appliance",
  description: "Offline computer-based testing on the Hanoled Edge Appliance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${poppins.className} cbt-theme min-h-full flex flex-col bg-background text-foreground font-sans`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
