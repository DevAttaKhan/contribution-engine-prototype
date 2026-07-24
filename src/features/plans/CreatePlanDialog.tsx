import { Link2 } from "lucide-react";
import { useState } from "react";
import { Button, Dialog, Field, Input } from "../../components/ui";

type CreatePlanDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (equalShareCount?: number) => void;
  bookingTotal: number;
};

export const CreatePlanDialog = ({
  open,
  onClose,
  onCreate,
  bookingTotal,
}: CreatePlanDialogProps) => {
  const [shareCount, setShareCount] = useState("40");
  const [countError, setCountError] = useState("");

  const handleClose = () => {
    setShareCount("40");
    setCountError("");
    onClose();
  };

  const handleCreate = () => {
    const count = Number(shareCount);
    if (!Number.isFinite(count) || count < 1 || !Number.isInteger(count)) {
      setCountError("Enter a whole number of people (at least 1).");
      return;
    }
    onCreate(count);
    handleClose();
  };

  const previewAmount =
    Number(shareCount) > 0 ? bookingTotal / Number(shareCount) : 0;

  return (
    <Dialog
      description="Creates one plan with open, equal share, and named participant links ready to use."
      onClose={handleClose}
      open={open}
      title="Create contribution plan"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Unified collection</p>
            <p className="mt-1 text-sm text-slate-600">
              Open link, equal share link, and named participant links are all
              available from the start. Add people and share links from the
              workspace tabs.
            </p>
          </div>
        </div>

        <Field
          error={countError}
          hint={`Booking total €${bookingTotal.toFixed(2)} ÷ headcount = equal share each`}
          htmlFor="equal-share-count"
          label="Equal share headcount (e.g. 40)"
        >
          <Input
            id="equal-share-count"
            min="1"
            onChange={(event) => setShareCount(event.target.value)}
            step="1"
            type="number"
            value={shareCount}
          />
        </Field>

        {Number(shareCount) >= 1 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Each equal-share payer pays approximately{" "}
            <strong>€{previewAmount.toFixed(2)}</strong> via one shared link.
            Open link amount is flexible.
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create plan</Button>
        </div>
      </div>
    </Dialog>
  );
};
