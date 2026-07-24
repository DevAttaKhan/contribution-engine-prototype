import { Users, Link2, Layers, SplitSquareHorizontal } from "lucide-react";
import { useState } from "react";
import type { ContributionMode } from "../../types";
import { Button, Dialog, Field, Input } from "../../components/ui";

type CreatePlanDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (mode: ContributionMode, equalShareCount?: number) => void;
  bookingTotal: number;
};

const modes: {
  id: ContributionMode;
  title: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    id: "EQUAL_SPLIT",
    title: "Equal Split (named)",
    description:
      "Add participants manually and divide the booking equally with individual payment links.",
    icon: Users,
  },
  {
    id: "EQUAL_SHARE",
    title: "Equal Share Link",
    description:
      "Enter a headcount (e.g. €400 / 40). One shared link where everyone pays the same amount — organiser can track each payer.",
    icon: SplitSquareHorizontal,
  },
  {
    id: "OPEN",
    title: "Open Contribution",
    description:
      "Share one public link. Anyone can contribute any amount without pre-registration.",
    icon: Link2,
  },
  {
    id: "HYBRID",
    title: "Hybrid",
    description:
      "Assign fixed amounts to selected participants and collect the remainder via an open link.",
    icon: Layers,
  },
];

export const CreatePlanDialog = ({
  open,
  onClose,
  onCreate,
  bookingTotal,
}: CreatePlanDialogProps) => {
  const [selectedMode, setSelectedMode] = useState<ContributionMode | null>(
    null,
  );
  const [shareCount, setShareCount] = useState("40");
  const [countError, setCountError] = useState("");

  const handleClose = () => {
    setSelectedMode(null);
    setShareCount("40");
    setCountError("");
    onClose();
  };

  const handleSelectMode = (mode: ContributionMode) => {
    if (mode === "EQUAL_SHARE") {
      setSelectedMode(mode);
      return;
    }
    onCreate(mode);
    handleClose();
  };

  const handleCreateEqualShare = () => {
    const count = Number(shareCount);
    if (!Number.isFinite(count) || count < 1 || !Number.isInteger(count)) {
      setCountError("Enter a whole number of people (at least 1).");
      return;
    }
    onCreate("EQUAL_SHARE", count);
    handleClose();
  };

  const previewAmount =
    Number(shareCount) > 0
      ? bookingTotal / Number(shareCount)
      : 0;

  return (
    <Dialog
      description="Choose how contributions will be collected for this booking."
      onClose={handleClose}
      open={open}
      title="Create contribution plan"
    >
      {selectedMode === "EQUAL_SHARE" ? (
        <div className="space-y-4">
          <Field
            error={countError}
            hint={`Booking total €${bookingTotal.toFixed(2)} ÷ headcount = equal share each`}
            htmlFor="equal-share-count"
            label="Number of people (e.g. 40)"
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
            <p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
              Each person pays approximately{" "}
              <strong>€{previewAmount.toFixed(2)}</strong> via one shared link.
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button onClick={() => setSelectedMode(null)} variant="secondary">
              Back
            </Button>
            <Button onClick={handleCreateEqualShare}>Create equal share</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {modes.map((mode) => {
            const Icon = mode.icon;

            return (
              <button
                key={mode.id}
                className="flex w-full items-start gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50"
                onClick={() => handleSelectMode(mode.id)}
                type="button"
              >
                <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{mode.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button onClick={handleClose} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
