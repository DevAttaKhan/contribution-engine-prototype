import { Copy, Link2, SplitSquareHorizontal, Users } from "lucide-react";
import type { ContributionPlan } from "../../types";
import {
  getEqualSharePaidCount,
  getEqualShareSlotsRemaining,
  getOpenContributionAvailable,
  getPlanMetrics,
} from "../../store";
import { computeEqualShareAmount } from "../../lib/money";
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

type ContributionLinksPanelProps = {
  plan: ContributionPlan | null;
  isDraft: boolean;
  onSetShareCount: (count: number) => void;
  onSetShareAmount: (amount: number) => void;
  onPublish: () => void;
};

export const ContributionLinksPanel = ({
  plan,
  isDraft,
  onSetShareCount,
  onSetShareAmount,
  onPublish,
}: ContributionLinksPanelProps) => {
  if (!plan) {
    return (
      <EmptyState
        description="Create a contribution plan to generate links."
        icon={Link2}
        title="No links yet"
      />
    );
  }

  const metrics = getPlanMetrics(plan);
  const openAvailable = getOpenContributionAvailable(plan);
  const paidSlots = getEqualSharePaidCount(plan);
  const slotsRemaining = getEqualShareSlotsRemaining(plan);
  const namedParticipants = plan.participants.filter(
    (participant) =>
      participant.status !== "CANCELLED" &&
      participant.status !== "EXPIRED" &&
      (participant.source === "MANUAL" ||
        participant.source === "NAMED_LINK" ||
        !participant.source),
  );

  const handleCopyLink = async (token: string) => {
    const href = `${window.location.origin}/contribute/${token}`;
    await navigator.clipboard.writeText(href);
  };

  const showOpenLink =
    plan.mode === "UNIFIED" ||
    plan.mode === "OPEN" ||
    plan.mode === "HYBRID" ||
    Boolean(plan.openLinkToken);

  const showEqualShare =
    plan.mode === "UNIFIED" ||
    plan.mode === "EQUAL_SHARE" ||
    Boolean(plan.equalShareLinkToken || plan.equalShareCount);

  return (
    <div className="space-y-6">
      {showOpenLink ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Open contribution link
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              Anyone with this link can contribute any amount. Payers appear
              automatically in the Participants tab.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.status === "PUBLISHED" && plan.openLinkToken ? (
              <>
                <ContributionLink token={plan.openLinkToken} />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => handleCopyLink(plan.openLinkToken!)}
                    variant="secondary"
                  >
                    <Copy className="h-4 w-4" />
                    Copy open link
                  </Button>
                  <p className="text-sm text-slate-500">
                    Available through open link: <Money amount={openAvailable} />
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {isDraft
                  ? "Open link is ready — publish the plan to activate it."
                  : "Publish the plan to activate the open link."}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showEqualShare ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SplitSquareHorizontal className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Equal share link
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              One shared link where everyone pays the same fixed amount.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                htmlFor="links-share-count"
                hint={
                  isDraft
                    ? "Changing headcount recalculates share from booking total."
                    : "Leave the field to publish a new version with updated headcount."
                }
                label="Number of people"
              >
                <Input
                  id="links-share-count"
                  key={`share-count-${plan.id}-${plan.equalShareCount}`}
                  min="1"
                  defaultValue={plan.equalShareCount ?? 40}
                  onBlur={(event) => {
                    const count = Number(event.target.value);
                    if (
                      Number.isFinite(count) &&
                      count >= 1 &&
                      Math.floor(count) !== (plan.equalShareCount ?? 0)
                    ) {
                      onSetShareCount(Math.floor(count));
                    }
                  }}
                  step="1"
                  type="number"
                />
              </Field>
              <Field
                htmlFor="links-share-amount"
                hint={
                  isDraft
                    ? "Override the per-person equal share amount, then leave the field."
                    : "Blur/leave the field to publish a new version and regenerate the equal share link."
                }
                label="Equal share amount (€)"
              >
                <Input
                  id="links-share-amount"
                  min="0.01"
                  onBlur={(event) => {
                    const amount = Number(event.target.value);
                    if (
                      Number.isFinite(amount) &&
                      amount > 0 &&
                      Math.abs(amount - (plan.equalShareAmount ?? 0)) > 0.001
                    ) {
                      onSetShareAmount(amount);
                    }
                  }}
                  step="0.01"
                  type="number"
                  defaultValue={
                    plan.equalShareAmount ??
                    computeEqualShareAmount(
                      plan.bookingTotal,
                      plan.equalShareCount ?? 40,
                    )
                  }
                  key={`share-amount-${plan.id}-${plan.equalShareAmount}`}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Share per person</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  <Money
                    amount={
                      plan.equalShareAmount ??
                      computeEqualShareAmount(
                        plan.bookingTotal,
                        plan.equalShareCount ?? 40,
                      )
                    }
                  />
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Slots paid</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {paidSlots} / {plan.equalShareCount ?? 0}
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
                  <Button
                    onClick={() =>
                      handleCopyLink(plan.equalShareLinkToken!)
                    }
                    variant="secondary"
                  >
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
                Publish the plan to activate the equal share link.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Named participant links
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Individual links for manually added participants. Add people on the
            Participants tab.
          </p>
        </CardHeader>
        <CardContent>
          {namedParticipants.length === 0 ? (
            <p className="text-sm text-slate-500">
              No named participants yet. Add participants to generate individual
              links.
            </p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Link</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {namedParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium text-slate-900">
                      {participant.name}
                    </TableCell>
                    <TableCell>
                      <Money amount={participant.allocatedAmount} />
                    </TableCell>
                    <TableCell>
                      {plan.status === "PUBLISHED" &&
                      participant.status === "PENDING" ? (
                        <ContributionLink token={participant.linkToken} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {plan.status === "PUBLISHED" &&
                      participant.status === "PENDING" ? (
                        <Button
                          aria-label={`Copy link for ${participant.name}`}
                          onClick={() => handleCopyLink(participant.linkToken)}
                          size="sm"
                          variant="ghost"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isDraft ? (
        <div className="flex justify-end">
          <Button onClick={onPublish}>Publish contribution plan</Button>
        </div>
      ) : null}
    </div>
  );
};
