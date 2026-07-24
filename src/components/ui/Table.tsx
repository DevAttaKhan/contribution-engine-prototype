import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../lib/cn";

export const Table = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("overflow-x-auto", className)}>
    <table className="min-w-full divide-y divide-slate-200">{children}</table>
  </div>
);

export const TableHead = ({ children }: { children: ReactNode }) => (
  <thead className="bg-slate-50">{children}</thead>
);

export const TableBody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
);

export const TableRow = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) => (
  <tr className={cn("hover:bg-slate-50", className)} {...props}>
    {children}
  </tr>
);

export const TableHeaderCell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <th
    className={cn(
      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
      className,
    )}
    scope="col"
  >
    {children}
  </th>
);

export const TableCell = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) => (
  <td className={cn("px-4 py-3 text-sm text-slate-700", className)} {...props}>
    {children}
  </td>
);
