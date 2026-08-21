import type { ReactNode } from "react";

interface TableContainerProps {
  children: ReactNode;
  className?: string;
}

export function TableContainer({ children, className = "" }: TableContainerProps) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
