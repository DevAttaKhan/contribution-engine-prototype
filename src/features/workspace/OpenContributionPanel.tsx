import { Copy, Link2 } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import type { ContributionPlan } from "../../types";
import {
  getOpenContributionAvailable,
  getPlanMetrics,
} from "../../store";
import { ContributionLink, Money } from "../../components/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui";

type OpenContributionPanelProps = {
  plan: ContributionPlan | null;
};

export const OpenContributionPanel = ({ plan }: OpenContributionPanelProps) => {
  if (!plan || (plan.mode !== "OPEN" && plan.mode !== "HYBRID")) {
    return (
      <EmptyState
        description="Open contribution is available in Open or Hybrid contribution modes."
        icon={Link2}
        title="Open contribution not enabled"
      />
    );
  }

  const metrics = getPlanMetrics(plan);
  const openAvailable = getOpenContributionAvailable(plan);
  const reservedForParticipants =
    plan.mode === "HYBRID"
      ? plan.participants.reduce(
          (total, participant) => total + participant.allocatedAmount,
          0,
        )
      : 0;

  const handleCopyLink = async () => {
    if (!plan.openLinkToken) return;
    const href = `${window.location.origin}/contribute/${plan.openLinkToken}`;
    await navigator.clipboard.writeText(href);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Public contribution link
          </h3>
          <p className="text-sm text-slate-500">
            Anyone with this link can contribute. No participant records are
            created before payment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.status === "PUBLISHED" && plan.openLinkToken ? (
            <>
              <ContributionLink token={plan.openLinkToken} />
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCopyLink} variant="secondary">
                  <Copy className="h-4 w-4" />
                  Copy public link
                </Button>
                <p className="text-sm text-slate-500">
                  Available through open link:{" "}
                  <Money amount={openAvailable} />
                </p>
              </div>
              {plan.mode === "HYBRID" ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    Reserved for named participants:{" "}
                    <Money amount={reservedForParticipants} />
                  </p>
                  <p className="mt-1">
                    Total booking balance remaining:{" "}
                    <Money amount={metrics.remainingBalance} />
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Publish the contribution plan to activate the public link.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Contributor records
          </h3>
          <p className="text-sm text-slate-500">
            Every successful open contribution is recorded for audit purposes.
          </p>
        </CardHeader>
        <CardContent>
          {plan.contributors.length === 0 ? (
            <p className="text-sm text-slate-500">No contributions received yet.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Contributor</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Paid at</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.contributors.map((contributor) => (
                  <TableRow key={contributor.id}>
                    <TableCell className="font-medium text-slate-900">
                      {contributor.name}
                    </TableCell>
                    <TableCell>{contributor.email}</TableCell>
                    <TableCell>
                      <Money amount={contributor.amount} />
                    </TableCell>
                    <TableCell>{formatDateTime(contributor.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
