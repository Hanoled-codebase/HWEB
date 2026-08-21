import type { ReactNode } from "react";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableEmptyProps {
  colSpan: number;
  searchQuery?: string;
  emptyMessage?: string;
  searchMessage?: string;
  children?: ReactNode;
}

export function TableEmpty({
  colSpan,
  searchQuery,
  emptyMessage = "No results found.",
  searchMessage = "No results match your search.",
  children,
}: TableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-slate-500">
        {children ?? (searchQuery ? searchMessage : emptyMessage)}
      </TableCell>
    </TableRow>
  );
}
