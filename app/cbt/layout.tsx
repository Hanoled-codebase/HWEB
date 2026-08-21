import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "katex/dist/katex.min.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanoled CBT — Computer-Based Testing System",
  description: "Modern, secure computer-based testing and examination platform for the Hanoled School Suite.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
    ],
  },
};

export default function CBTLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`cbt-theme ${poppins.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
      {children}
    </div>
  );
}
