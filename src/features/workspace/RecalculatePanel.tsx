import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { computeEqualShareAmount, formatCurrency } from "../../lib/money";
import type { ContributionMode, ContributionPlan } from "../../types";
import {
  getCollectedFromParticipants,
  getParticipantPaidAmount,
  getPlanMetrics,
} from "../../store";
import { Money } from "../../components/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Field,
  Input,
  Select,
} from "../../components/ui";

type RecalculatePanelProps = {
  plan: ContributionPlan | null;
  currentPrice: number;
  onRecalculateEqual: (
    newBookingTotal: number,
    includePaidParticipants: boolean,
    newMode: ContributionMode,
    equalShareCount?: number,
  ) => void;
  onRecalculateManual: (
    allocations: { participantId: string; amount: number }[],
    newBookingTotal: number,
    includePaidParticipants: boolean,
    newMode: ContributionMode,
    equalShareCount?: number,
  ) => void;
};

export const RecalculatePanel = ({
  plan,
  currentPrice,
  onRecalculateEqual,
  onRecalculateManual,
}: RecalculatePanelProps) => {
  const [newPrice, setNewPrice] = useState(String(currentPrice));
  const [strategy, setStrategy] = useState<"equal" | "manual">("equal");
  const [includePaidParticipants, setIncludePaidParticipants] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    {},
  );
  const [validationError, setValidationError] = useState("");
  const [newMode, setNewMode] = useState<ContributionMode>(
    plan?.mode ?? "EQUAL_SPLIT",
  );
  const [equalShareCount, setEqualShareCount] = useState(
    String(plan?.equalShareCount ?? 40),
  );

  const metrics = getPlanMetrics(plan);
  const priceValue = Number(newPrice) || 0;
  const previousTotal = plan?.bookingTotal ?? currentPrice;
  const priceIncreased = priceValue > previousTotal;
  const priceReduced = priceValue < previousTotal;

  const canIncludePaid = priceIncreased;
  const willIncludePaid = canIncludePaid && includePaidParticipants;
  const usesNamedParticipants =
    newMode === "EQUAL_SPLIT" || newMode === "HYBRID";

  const pendingParticipants =
    plan?.participants.filter(
      (participant) => participant.status === "PENDING",
    ) ?? [];
  const paidParticipants =
    plan?.participants.filter(
      (participant) => participant.status === "PAID",
    ) ?? [];
  const eligibleParticipants =
    plan?.participants.filter(
      (participant) =>
        participant.status === "PENDING" || participant.status === "PAID",
    ) ?? [];

  const redistributionTargets = willIncludePaid
    ? eligibleParticipants
    : pendingParticipants;

  const redistributionPool = useMemo(() => {
    const open =
      plan?.contributors.reduce(
        (total, contributor) => total + contributor.amount,
        0,
      ) ?? 0;
    const paid = getCollectedFromParticipants(plan?.participants ?? []);

    if (willIncludePaid) {
      return Math.max(priceValue - open, 0);
    }

    return Math.max(priceValue - paid - open, 0);
  }, [plan, priceValue, willIncludePaid]);

  const handleRecalculate = () => {
    const price = Number(newPrice);
    if (!plan || plan.status !== "PUBLISHED" || Number.isNaN(price)) return;

    const includePaid = price > previousTotal && includePaidParticipants;
    const shareCount =
      newMode === "EQUAL_SHARE" ? Math.max(1, Number(equalShareCount) || 1) : undefined;

    if (!usesNamedParticipants || strategy === "equal") {
      onRecalculateEqual(price, includePaid, newMode, shareCount);
      return;
    }

    const allocations = redistributionTargets.map((participant) => ({
      participantId: participant.id,
      amount: Number(manualAmounts[participant.id] ?? 0),
    }));

    const total = allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0,
    );

    if (allocations.some((allocation) => allocation.amount < 0)) {
      setValidationError("Amounts cannot be negative.");
      return;
    }

    if (total - redistributionPool > 0.01) {
      setValidationError(
        `Allocated total cannot exceed the remaining balance (${formatCurrency(redistributionPool)}). Partial allocations are allowed.`,
      );
      return;
    }

    setValidationError("");
    onRecalculateManual(allocations, price, includePaid, newMode, shareCount);
  };

  if (!plan) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500">
            Create and publish a contribution plan before recalculating.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (plan.status !== "PUBLISHED") {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500">
            Publish the current draft plan first. Recalculation creates a new
            version and invalidates previous links.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Recalculate contributions
          </h3>
          <p className="text-sm text-slate-500">
            Switch contribution type anytime — completed payments stay recorded
            and still count toward the booking total. Use the Payments tab for
            the full ledger.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field htmlFor="new-price" label="Updated booking total">
              <Input
                id="new-price"
                min="0"
                onChange={(event) => {
                  setNewPrice(event.target.value);
                  const next = Number(event.target.value);
                  if (!(next > previousTotal)) {
                    setIncludePaidParticipants(false);
                  }
                }}
                step="0.01"
                type="number"
                value={newPrice}
              />
            </Field>
            <Field
              htmlFor="contribution-mode"
              label="Contribution type"
              hint={`Current: ${plan.mode.replaceAll("_", " ")}`}
            >
              <Select
                id="contribution-mode"
                onChange={(event) => {
                  const mode = event.target.value as ContributionMode;
                  setNewMode(mode);
                  if (mode === "OPEN" || mode === "EQUAL_SHARE") {
                    setStrategy("equal");
                  }
                }}
                value={newMode}
              >
                <option value="EQUAL_SPLIT">Equal Split (named)</option>
                <option value="EQUAL_SHARE">Equal Share Link</option>
                <option value="OPEN">Open Contribution</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </Field>
          </div>

          {newMode === "EQUAL_SHARE" ? (
            <Field
              hint={`Each person pays ${formatCurrency(computeEqualShareAmount(priceValue, Math.max(1, Number(equalShareCount) || 1)))}`}
              htmlFor="recalc-share-count"
              label="Equal share headcount"
            >
              <Input
                id="recalc-share-count"
                min="1"
                onChange={(event) => setEqualShareCount(event.target.value)}
                step="1"
                type="number"
                value={equalShareCount}
              />
            </Field>
          ) : null}

          {usesNamedParticipants ? (
            <Field htmlFor="strategy" label="Redistribution strategy">
              <Select
                id="strategy"
                onChange={(event) =>
                  setStrategy(event.target.value as "equal" | "manual")
                }
                value={strategy}
              >
                <option value="equal">Redistribute equally</option>
                <option value="manual">Manual allocation</option>
              </Select>
            </Field>
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Switching to {newMode.replaceAll("_", " ").toLowerCase()} keeps
              completed payments and collects the remainder through the new
              contribution type.
            </p>
          )}

          {usesNamedParticipants ? (
            <label
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                canIncludePaid
                  ? "border-primary-200 bg-primary-50"
                  : "border-slate-200 bg-slate-50 opacity-80"
              }`}
            >
              <input
                checked={willIncludePaid}
                className="mt-1"
                disabled={!canIncludePaid}
                onChange={(event) =>
                  setIncludePaidParticipants(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Include participants who have already paid
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {priceReduced
                    ? "Unavailable while the quotation price is reduced — paid amounts stay unchanged."
                    : priceIncreased
                      ? "Re-divide the new total across everyone. Anyone who already paid keeps that credit and only owes any top-up difference."
                      : "Increase the quotation total above the current amount to enable this option."}
                </span>
              </span>
            </label>
          ) : null}

          {usesNamedParticipants ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Current collected: <Money amount={metrics.totalCollected} />
              </p>
            <p className="mt-1">
              Available to allocate (max):{" "}
              <Money amount={redistributionPool} />
            </p>
            <p className="mt-1 text-slate-500">
              Manual allocation can be partial — any unallocated remainder stays
              on the booking balance.
            </p>
              <p className="mt-1">
                {willIncludePaid
                  ? `Participants included: ${redistributionTargets.length} (all paid + pending)`
                  : `Pending participants: ${pendingParticipants.length} · Paid kept unchanged: ${paidParticipants.length}`}
              </p>
            </div>
          ) : null}

          {usesNamedParticipants && strategy === "manual" ? (
            <div className="space-y-3">
              {redistributionTargets.map((participant) => {
                const alreadyPaid = getParticipantPaidAmount(participant);

                return (
                  <Field
                    key={participant.id}
                    hint={
                      willIncludePaid && alreadyPaid > 0
                        ? `Already paid ${formatCurrency(alreadyPaid)} — enter their full new share`
                        : undefined
                    }
                    htmlFor={`amount-${participant.id}`}
                    label={`${participant.name} allocation${
                      participant.status === "PAID" ? " (already paid)" : ""
                    }`}
                  >
                    <Input
                      id={`amount-${participant.id}`}
                      min="0"
                      onChange={(event) =>
                        setManualAmounts((current) => ({
                          ...current,
                          [participant.id]: event.target.value,
                        }))
                      }
                      step="0.01"
                      type="number"
                      value={manualAmounts[participant.id] ?? ""}
                    />
                  </Field>
                );
              })}
              {validationError ? (
                <p className="text-sm text-danger-600">{validationError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={handleRecalculate}>
              <RefreshCcw className="h-4 w-4" />
              Publish recalculated plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Recalculation triggers
          </h3>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Booking price changes</li>
            <li>Participants added or removed</li>
            <li>Contribution type switches (Equal / Open / Hybrid / Equal Share)</li>
            <li>Vehicle or route changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
