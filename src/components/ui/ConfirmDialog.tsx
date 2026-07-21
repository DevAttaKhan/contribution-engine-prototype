import { Button } from "./Button";
import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Dialog description={description} onClose={onClose} open={open} title={title}>
    <div className="flex justify-end gap-3">
      <Button onClick={onClose} variant="secondary">
        Cancel
      </Button>
      <Button onClick={onConfirm} variant="danger">
        {confirmLabel}
      </Button>
    </div>
  </Dialog>
);
