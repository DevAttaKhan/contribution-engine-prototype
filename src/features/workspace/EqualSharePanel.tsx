import { Copy, SplitSquareHorizontal } from "lucide-react";
import { formatCurrency } from "../../lib/money";
import { formatDateTime } from "../../lib/format";
import type { ContributionPlan } from "../../types";
import {
  getEqualSharePaidCount,
  getEqualShareSlotsRemaining,
  getPlanMetrics,
} from "../../store";
import { ContributionLink, Money } from "../../components/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui";

type EqualSharePanelProps = {
  plan: ContributionPlan | null;
  isDraft: boolean;
  onSetShareCount: (count: number) => void;
  onPublish: () => void;
};

export const EqualSharePanel = ({
  plan,
  isDraft,
  onSetShareCount,
  onPublish,
}: EqualSharePanelProps) => {
  if (!plan || plan.mode !== "EQUAL_SHARE") {
    return (
      <EmptyState
        description="Equal Share Link mode splits a booking total by headcount and tracks each payer on one shared link."
        icon={SplitSquareHorizontal}
        title="Equal share not enabled"
      />
    );
  }

  const metrics = getPlanMetrics(plan);
  const paidSlots = getEqualSharePaidCount(plan);
  const slotsRemaining = getEqualShareSlotsRemaining(plan);
  const equalPayers = plan.contributors.filter(
    (contributor) => contributor.viaEqualShare,
  );

  const handleCopyLink = async () => {
    if (!plan.equalShareLinkToken) return;
    const href = `${window.location.origin}/contribute/${plan.equalShareLinkToken}`;
    await navigator.clipboard.writeText(href);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Equal share setup
          </h3>
          <p className="text-sm text-slate-500">
            Example: €{plan.bookingTotal.toFixed(0)} / {plan.equalShareCount}{" "}
            people = {formatCurrency(plan.equalShareAmount ?? 0)} each.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDraft ? (
            <Field
              htmlFor="share-count"
              label="Number of people"
              hint="Changing headcount recalculates the equal share amount."
            >
              <Input
                id="share-count"
                min="1"
                onChange={(event) => {
                  const count = Number(event.target.value);
                  if (Number.isFinite(count) && count >= 1) {
                    onSetShareCount(Math.floor(count));
                  }
                }}
                step="1"
                type="number"
                value={plan.equalShareCount ?? 1}
              />
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Share per person</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                <Money amount={plan.equalShareAmount ?? 0} />
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Slots paid</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {paidSlots} / {plan.equalShareCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Remaining balance</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                <Money amount={metrics.remainingBalance} />
              </p>
            </div>
          </div>

          {plan.status === "PUBLISHED" && plan.equalShareLinkToken ? (
            <div className="space-y-3">
              <ContributionLink token={plan.equalShareLinkToken} />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCopyLink} variant="secondary">
                  <Copy className="h-4 w-4" />
                  Copy equal share link
                </Button>
                <p className="text-sm text-slate-500">
                  {slotsRemaining} slot(s) remaining
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Publish the plan to generate the shared equal-pay link.
            </p>
          )}

          {isDraft ? (
            <div className="flex justify-end">
              <Button onClick={onPublish}>Publish equal share plan</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Equal share payers
          </h3>
          <p className="text-sm text-slate-500">
            Everyone who pays via the shared link is tracked here with name and
            email.
          </p>
        </CardHeader>
        <CardContent>
          {equalPayers.length === 0 ? (
            <p className="text-sm text-slate-500">No equal share payments yet.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Paid at</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equalPayers.map((payer) => (
                  <TableRow key={payer.id}>
                    <TableCell className="font-medium text-slate-900">
                      {payer.name}
                    </TableCell>
                    <TableCell>{payer.email}</TableCell>
                    <TableCell>
                      <Money amount={payer.amount} />
                    </TableCell>
                    <TableCell>{formatDateTime(payer.paidAt)}</TableCell>
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
