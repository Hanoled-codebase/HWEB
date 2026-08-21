import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center px-4">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto leading-relaxed">
        We couldn&apos;t find the page you were looking for. It might have been moved or doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
