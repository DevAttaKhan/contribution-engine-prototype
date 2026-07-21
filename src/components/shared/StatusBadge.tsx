import { formatCurrency } from "../../lib/money";
import type { ParticipantStatus } from "../../types";
import { Badge } from "../ui";
import { getStatusBadgeVariant } from "./statusUtils";

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
);

export const ParticipantStatusBadge = ({
  status,
}: {
  status: ParticipantStatus;
}) => <StatusBadge status={status} />;

export const ContributionLink = ({ token }: { token: string }) => {
  const href = `${window.location.origin}/contribute/${token}`;

  return (
    <a
      className="break-all text-sm font-medium text-primary-600 hover:text-primary-700"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {href}
    </a>
  );
};

export const Money = ({ amount }: { amount: number }) => (
  <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
);
