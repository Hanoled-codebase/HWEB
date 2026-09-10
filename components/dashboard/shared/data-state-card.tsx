import { Lock, TriangleAlert } from "lucide-react";

interface DataStateCardProps {
  /** "forbidden" for a 403 (a permission boundary, not a bug) vs "error" for a real failure. */
  variant: "forbidden" | "error";
  title?: string;
  description?: string;
}

const DEFAULTS = {
  forbidden: {
    title: "You don't have access to this",
    description: "This isn't available to your role. If you think that's wrong, ask an admin to check your permissions.",
  },
  error: {
    title: "Couldn't load this right now",
    description: "Something went wrong on our end. Try refreshing the page.",
  },
} as const;

export function DataStateCard({ variant, title, description }: DataStateCardProps) {
  const Icon = variant === "forbidden" ? Lock : TriangleAlert;
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
      <Icon className="mx-auto mb-4 h-8 w-8 text-slate-400" />
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
        {title ?? DEFAULTS[variant].title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
        {description ?? DEFAULTS[variant].description}
      </p>
    </div>
  );
}
