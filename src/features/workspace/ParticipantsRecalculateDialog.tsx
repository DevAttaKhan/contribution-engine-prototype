import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContributionPlan } from "../../types";
import {
  getCollectedFromContributors,
  getCollectedFromParticipants,
  getParticipantPaidAmount,
} from "../../store";
import { Money } from "../../components/shared";
import { Button, Dialog, Field, Input, Select } from "../../components/ui";

type ParticipantsRecalculateDialogProps = {
  open: boolean;
  plan: ContributionPlan;
  onClose: () => void;
  onRecalculateEqual: (includePaidParticipants: boolean) => void;
  onRecalculateManual: (
    allocations: { participantId: string; amount: number }[],
    includePaidParticipants: boolean,
  ) => void;
};

export const ParticipantsRecalculateDialog = ({
  open,
  plan,
  onClose,
  onRecalculateEqual,
  onRecalculateManual,
}: ParticipantsRecalculateDialogProps) => {
  const [strategy, setStrategy] = useState<"equal" | "manual">("equal");
  const [includePaidParticipants, setIncludePaidParticipants] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    {},
  );
  const [validationError, setValidationError] = useState("");

  const activeParticipants = useMemo(
    () =>
      plan.participants.filter(
        (participant) =>
          participant.status !== "CANCELLED" &&
          participant.status !== "EXPIRED",
      ),
    [plan.participants],
  );

  const pendingParticipants = activeParticipants.filter(
    (participant) => participant.status === "PENDING",
  );
  const paidParticipants = activeParticipants.filter(
    (participant) => participant.status === "PAID",
  );

  const openCollected = getCollectedFromContributors(plan.contributors);
  const paidCollected = getCollectedFromParticipants(activeParticipants);

  const redistributionTargets = includePaidParticipants
    ? activeParticipants
    : pendingParticipants;

  const redistributionPool = includePaidParticipants
    ? Math.max(plan.bookingTotal - openCollected, 0)
    : Math.max(plan.bookingTotal - paidCollected - openCollected, 0);

  const handleRecalculate = () => {
    if (redistributionTargets.length === 0) return;
    if (!includePaidParticipants && redistributionPool <= 0) return;

    if (strategy === "equal") {
      onRecalculateEqual(includePaidParticipants);
      onClose();
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
        `Allocated total cannot exceed €${redistributionPool.toFixed(2)}. Partial allocation is allowed.`,
      );
      return;
    }

    setValidationError("");
    onRecalculateManual(allocations, includePaidParticipants);
    onClose();
  };

  const canApply =
    redistributionTargets.length > 0 &&
    (includePaidParticipants || redistributionPool > 0);

  return (
    <Dialog
      description="Redistribute contribution amounts. Choose pending only, or include participants who already paid (they keep payment credit and only owe any top-up)."
      onClose={onClose}
      open={open}
      title="Recalculate participant amounts"
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            Available to allocate: <Money amount={redistributionPool} />
          </p>
          <p className="mt-1">
            Targets: {redistributionTargets.length} · Pending:{" "}
            {pendingParticipants.length} · Already paid:{" "}
            {paidParticipants.length}
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <input
            checked={includePaidParticipants}
            className="mt-1"
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
              Re-divide across everyone. Paid amounts stay as credit — anyone
              who already paid only owes the top-up difference, with a new
              payment link.
            </span>
          </span>
        </label>

        {!canApply ? (
          <p className="text-sm text-slate-500">
            {activeParticipants.length === 0
              ? "No participants to redistribute."
              : includePaidParticipants
                ? "No active participants to redistribute."
                : "Nothing left to redistribute among pending participants. Enable “include already paid” to re-divide across everyone."}
          </p>
        ) : (
          <>
            <Field htmlFor="redistribute-strategy" label="Redistribution strategy">
              <Select
                id="redistribute-strategy"
                onChange={(event) =>
                  setStrategy(event.target.value as "equal" | "manual")
                }
                value={strategy}
              >
                <option value="equal">
                  {includePaidParticipants
                    ? "Divide equally among all (pending + paid)"
                    : "Divide equally among pending"}
                </option>
                <option value="manual">Custom amounts (partial allowed)</option>
              </Select>
            </Field>

            {strategy === "manual" ? (
              <div className="space-y-3">
                {redistributionTargets.map((participant) => {
                  const alreadyPaid = getParticipantPaidAmount(participant);

                  return (
                    <Field
                      key={participant.id}
                      hint={
                        alreadyPaid > 0
                          ? `Already paid €${alreadyPaid.toFixed(2)} — enter their full new share`
                          : undefined
                      }
                      htmlFor={`redistribute-${participant.id}`}
                      label={`${participant.name}${
                        participant.status === "PAID" ? " (paid)" : ""
                      }`}
                    >
                      <Input
                        id={`redistribute-${participant.id}`}
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
          </>
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!canApply} onClick={handleRecalculate}>
            <RefreshCcw className="h-4 w-4" />
            Apply redistribution
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
