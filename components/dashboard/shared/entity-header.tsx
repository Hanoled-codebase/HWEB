import type { ReactNode } from "react";

interface EntityHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function EntityHeader({ title, subtitle, action }: EntityHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        <p className="text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
