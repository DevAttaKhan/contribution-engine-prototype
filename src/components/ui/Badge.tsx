import { cn } from "../../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-500",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-primary-50 text-primary-700",
};

export const Badge = ({
  children,
  variant = "default",
  className,
}: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
      variantClasses[variant],
      className,
    )}
  >
    {children}
  </span>
);
