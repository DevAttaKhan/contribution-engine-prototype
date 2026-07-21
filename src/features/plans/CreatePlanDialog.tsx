import { Users, Link2, Layers } from "lucide-react";
import type { ContributionMode } from "../../types";
import { Button, Dialog } from "../../components/ui";

type CreatePlanDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (mode: ContributionMode) => void;
};

const modes: {
  id: ContributionMode;
  title: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    id: "EQUAL_SPLIT",
    title: "Equal Split",
    description:
      "Add participants manually and divide the booking equally with individual payment links.",
    icon: Users,
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
      "Track selected participants with equal split while also accepting open contributions.",
    icon: Layers,
  },
];

export const CreatePlanDialog = ({
  open,
  onClose,
  onCreate,
}: CreatePlanDialogProps) => (
  <Dialog
    description="Choose how contributions will be collected for this booking."
    onClose={onClose}
    open={open}
    title="Create contribution plan"
  >
    <div className="space-y-3">
      {modes.map((mode) => {
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            className="flex w-full items-start gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50"
            onClick={() => onCreate(mode.id)}
            type="button"
          >
            <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{mode.title}</p>
              <p className="mt-1 text-sm text-slate-500">{mode.description}</p>
            </div>
          </button>
        );
      })}
      <div className="flex justify-end pt-2">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  </Dialog>
);
