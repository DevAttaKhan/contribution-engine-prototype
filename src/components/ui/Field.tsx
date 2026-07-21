import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type FieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
};

export const Field = ({
  label,
  htmlFor,
  children,
  hint,
  error,
  className,
}: FieldProps) => (
  <div className={cn("space-y-1.5", className)}>
    <label
      className="block text-sm font-medium text-slate-700"
      htmlFor={htmlFor}
    >
      {label}
    </label>
    {children}
    {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    {error ? <p className="text-xs text-danger-600">{error}</p> : null}
  </div>
);

export const Label = ({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn("block text-sm font-medium text-slate-700", className)}
    {...props}
  />
);
