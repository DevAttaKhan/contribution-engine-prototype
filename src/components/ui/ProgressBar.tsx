import { cn } from "../../lib/cn";

type ProgressBarProps = {
  value: number;
  className?: string;
  label?: string;
};

export const ProgressBar = ({ value, className, label }: ProgressBarProps) => {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-slate-500">{clamped.toFixed(0)}%</span>
        </div>
      ) : null}
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
