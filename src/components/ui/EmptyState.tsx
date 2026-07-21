import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center",
      className,
    )}
  >
    <div className="rounded-2xl bg-white p-4 text-primary-600 shadow-sm">
      <Icon className="h-8 w-8" aria-hidden="true" />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);
