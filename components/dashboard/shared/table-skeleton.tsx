import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ColumnConfig {
  className?: string;
  width?: string;
}

interface TableSkeletonProps {
  rows?: number;
  columns: ColumnConfig[];
}

export function TableSkeleton({ rows = 4, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {columns.map((col, j) => (
            <TableCell key={j} className={col.className} align={j === columns.length - 1 ? "right" : undefined}>
              {col.width ? (
                <Skeleton className={`h-4 ${col.width}`} />
              ) : (
                <Skeleton className="h-4 w-full" />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
