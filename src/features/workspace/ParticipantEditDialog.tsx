import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { Participant } from "../../types";
import { getParticipantPaidAmount, getParticipantRemainingDue } from "../../store";
import { Money } from "../../components/shared";
import { Button, Dialog, Field, Input } from "../../components/ui";

type ParticipantEditDialogProps = {
  open: boolean;
  participant: Participant;
  bookingTotal: number;
  onClose: () => void;
  onSave: (participantId: string, amount: number, note?: string) => void;
};

export const ParticipantEditDialog = ({
  open,
  participant,
  bookingTotal,
  onClose,
  onSave,
}: ParticipantEditDialogProps) => {
  const paidAmount = getParticipantPaidAmount(participant);
  const hasPaidPortion = paidAmount > 0.001;
  const currentDue = getParticipantRemainingDue(participant);

  const [amount, setAmount] = useState(() =>
    hasPaidPortion ? "" : String(participant.allocatedAmount),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const amountValue = Number(amount);
  const previewTotal = hasPaidPortion
    ? paidAmount + (Number.isFinite(amountValue) ? amountValue : 0)
    : Number.isFinite(amountValue)
      ? amountValue
      : 0;
  const previewDue = Math.max(previewTotal - paidAmount, 0);
  const isAboveBooking =
    Number.isFinite(amountValue) && previewTotal > bookingTotal + 0.001;
  const isZeroTopUp = hasPaidPortion && amountValue === 0;

  const handleSave = () => {
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setError("Enter a valid amount of €0 or more.");
      return;
    }

    if (!hasPaidPortion && amountValue < 0) {
      setError("Enter a valid amount of €0 or more.");
      return;
    }

    setError("");
    onSave(participant.id, amountValue, note.trim() || undefined);
    onClose();
  };

  return (
    <Dialog
      description={
        hasPaidPortion
          ? "Enter an additional amount to charge. Their paid amount stays unchanged and a new payment link is created for the outstanding top-up."
          : "Set this participant's contribution amount. A payment link is generated when there is an outstanding balance."
      }
      onClose={onClose}
      open={open}
      title={`Edit ${participant.name}`}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            Current allocation: <Money amount={participant.allocatedAmount} />
          </p>
          {hasPaidPortion ? (
            <p className="mt-1">
              Paid so far: <Money amount={paidAmount} /> · Current due:{" "}
              <Money amount={currentDue} />
            </p>
          ) : null}
        </div>

        <Field
          error={error}
          hint={
            hasPaidPortion
              ? "This becomes a new outstanding payment on top of what they already paid."
              : "Sets their contribution allocation."
          }
          htmlFor="edit-participant-amount"
          label={
            hasPaidPortion
              ? "Additional amount to charge (€)"
              : "Contribution amount (€)"
          }
        >
          <Input
            id="edit-participant-amount"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            placeholder={hasPaidPortion ? "e.g. 20" : undefined}
            step="0.01"
            type="number"
            value={amount}
          />
        </Field>

        {hasPaidPortion && Number.isFinite(amountValue) && amountValue >= 0 ? (
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900">
            <p>
              New total allocation: <Money amount={previewTotal} />
            </p>
            <p className="mt-1">
              New outstanding due: <Money amount={previewDue} /> (status →
              Pending, new payment link)
            </p>
            <p className="mt-1 text-primary-700">
              Example: paid €20 + enter €20 → total €40, pay additional €20.
            </p>
          </div>
        ) : null}

        {isAboveBooking || isZeroTopUp ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {isAboveBooking ? (
                <p>
                  New total exceeds the booking total (€
                  {bookingTotal.toFixed(2)}). Saving is still allowed.
                </p>
              ) : null}
              {isZeroTopUp ? (
                <p>
                  Entering €0 clears outstanding due and keeps their paid
                  amount.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Field
          hint="Optional note stored in amount change history."
          htmlFor="edit-participant-note"
          label="Note"
        >
          <Input
            id="edit-participant-note"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </Field>

        {(participant.amountHistory?.length ?? 0) > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Amount history</p>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm text-slate-600">
              {[...(participant.amountHistory ?? [])]
                .reverse()
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <p>
                      €{entry.previousAmount.toFixed(2)} → €
                      {entry.newAmount.toFixed(2)}
                      {entry.additionalAmount != null
                        ? ` (+€${entry.additionalAmount.toFixed(2)} top-up)`
                        : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(entry.changedAt), "PPp")}
                      {entry.previousPaidAmount != null
                        ? ` · paid €${entry.previousPaidAmount.toFixed(2)}`
                        : ""}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {hasPaidPortion
              ? "Create top-up payment link"
              : "Save amount"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
