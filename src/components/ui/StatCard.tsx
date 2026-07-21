import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
};

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: StatCardProps) => (
  <div
    className={cn(
      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
      className,
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      </div>
      {Icon ? (
        <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  </div>
);
