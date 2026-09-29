import type { ReactNode } from "react";

interface EntityHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

// On phones the shell's top bar already names the page, so only the action row shows here.
export function EntityHeader({ title, subtitle, action }: EntityHeaderProps) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
