import { Copy, Plus, RefreshCcw, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContributionPlan, Participant, ParticipantStatus } from "../../types";
import { ContributionLink, Money, ParticipantStatusBadge } from "../../components/shared";
import { getParticipantPaidAmount, getParticipantRemainingDue } from "../../store";
import { ParticipantEditDialog } from "./ParticipantEditDialog";
import { ParticipantsRecalculateDialog } from "./ParticipantsRecalculateDialog";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui";

type ParticipantsPanelProps = {
  plan: ContributionPlan | null;
  isDraft: boolean;
  onAddParticipant: (participant: {
    name: string;
    email: string;
    phone?: string;
    allocatedAmount?: number;
  }) => void;
  onAddPublishedParticipant: (participant: {
    name: string;
    email: string;
    phone?: string;
    allocatedAmount?: number;
  }) => void;
  onRemoveParticipant: (participantId: string) => void;
  onRemovePublishedParticipant: (
    participantId: string,
    strategy: "equal" | "manual",
    allocations?: { participantId: string; amount: number }[],
  ) => void;
  onUpdateParticipantAmount: (
    participantId: string,
    amount: number,
    note?: string,
  ) => void;
  onRedistributeEqual: (includePaidParticipants: boolean) => void;
  onRedistributeManual: (
    allocations: { participantId: string; amount: number }[],
    includePaidParticipants: boolean,
  ) => void;
  onPublish: () => void;
  duplicateError?: string;
};

const getSourceLabel = (participant: Participant) => {
  switch (participant.source) {
    case "OPEN_LINK":
      return "Open link";
    case "EQUAL_SHARE":
      return "Equal share";
    case "NAMED_LINK":
      return "Named link";
    default:
      return "Manual";
  }
};

export const ParticipantsPanel = ({
  plan,
  isDraft,
  onAddParticipant,
  onAddPublishedParticipant,
  onRemoveParticipant,
  onRemovePublishedParticipant,
  onUpdateParticipantAmount,
  onRedistributeEqual,
  onRedistributeManual,
  onPublish,
  duplicateError,
}: ParticipantsPanelProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [departingParticipantId, setDepartingParticipantId] = useState<
    string | null
  >(null);
  const [removalStrategy, setRemovalStrategy] = useState<"equal" | "manual">(
    "equal",
  );
  const [removalAllocations, setRemovalAllocations] = useState<
    Record<string, string>
  >({});
  const [removalError, setRemovalError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | "ALL">(
    "ALL",
  );
  const [editingParticipant, setEditingParticipant] =
    useState<Participant | null>(null);
  const [recalculateOpen, setRecalculateOpen] = useState(false);

  const participants = useMemo(() => {
    if (!plan) return [];
    if (statusFilter === "ALL") {
      return plan.participants.filter(
        (participant) =>
          participant.status !== "CANCELLED" &&
          participant.status !== "EXPIRED",
      );
    }
    return plan.participants.filter(
      (participant) => participant.status === statusFilter,
    );
  }, [plan, statusFilter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const amount = allocatedAmount.trim()
      ? Number(allocatedAmount)
      : undefined;

    if (amount != null && (!Number.isFinite(amount) || amount < 0)) return;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      allocatedAmount: amount,
    };

    if (isDraft) {
      onAddParticipant(payload);
    } else {
      onAddPublishedParticipant(payload);
    }

    setName("");
    setEmail("");
    setPhone("");
    setAllocatedAmount("");
  };

  const handleCopyLink = async (token: string) => {
    const href = `${window.location.origin}/contribute/${token}`;
    await navigator.clipboard.writeText(href);
  };

  const departingParticipant = plan?.participants.find(
    (participant) => participant.id === departingParticipantId,
  );
  const amountToRedistribute = departingParticipant
    ? getParticipantRemainingDue(departingParticipant)
    : 0;
  const remainingParticipants =
    plan?.participants.filter(
      (participant) =>
        participant.id !== departingParticipantId &&
        participant.status !== "CANCELLED" &&
        participant.status !== "EXPIRED",
    ) ?? [];

  const handleCloseRemoval = () => {
    setDepartingParticipantId(null);
    setRemovalStrategy("equal");
    setRemovalAllocations({});
    setRemovalError("");
  };

  const handleConfirmRemoval = () => {
    if (!departingParticipantId) return;

    if (removalStrategy === "equal") {
      onRemovePublishedParticipant(departingParticipantId, "equal");
      handleCloseRemoval();
      return;
    }

    const allocations = remainingParticipants.map((participant) => ({
      participantId: participant.id,
      amount: Number(removalAllocations[participant.id] ?? 0),
    }));
    const allocationTotal = allocations.reduce(
      (total, allocation) => total + allocation.amount,
      0,
    );

    if (allocations.some((allocation) => allocation.amount < 0)) {
      setRemovalError("Amounts cannot be negative.");
      return;
    }

    if (allocationTotal - amountToRedistribute > 0.01) {
      setRemovalError(
        `Custom amounts cannot exceed €${amountToRedistribute.toFixed(2)}. Partial allocation is allowed.`,
      );
      return;
    }

    onRemovePublishedParticipant(
      departingParticipantId,
      "manual",
      allocations,
    );
    handleCloseRemoval();
  };

  const handleRowClick = (participant: Participant) => {
    setEditingParticipant(participant);
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    participant: Participant,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setEditingParticipant(participant);
    }
  };

  if (!plan) {
    return (
      <EmptyState
        description="Create a contribution plan to manage participants."
        icon={Users}
        title="No participants yet"
      />
    );
  }

  return (
    <div className="space-y-6">
      {(isDraft || plan.status === "PUBLISHED") ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-900">
              Add participants
            </h3>
            <p className="text-sm text-slate-500">
              {plan.status === "PUBLISHED"
                ? "Adding after publish creates a new plan version and regenerates contribution links."
                : "Add people manually with an optional contribution amount. Open and equal share payers appear here automatically after payment."}{" "}
              Duplicate emails are prevented.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
              <Field htmlFor="participant-name" label="Name">
                <Input
                  id="participant-name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </Field>
              <Field htmlFor="participant-email" label="Email">
                <Input
                  id="participant-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Field htmlFor="participant-phone" hint="Optional" label="Phone">
                <Input
                  id="participant-phone"
                  onChange={(event) => setPhone(event.target.value)}
                  value={phone}
                />
              </Field>
              <Field
                hint="Optional — leave blank for €0 until you recalculate."
                htmlFor="participant-amount"
                label="Amount (€)"
              >
                <Input
                  id="participant-amount"
                  min="0"
                  onChange={(event) => setAllocatedAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={allocatedAmount}
                />
              </Field>
              <div className="md:col-span-4 flex items-center justify-between gap-3">
                {duplicateError ? (
                  <p className="text-sm text-danger-600">{duplicateError}</p>
                ) : (
                  <span />
                )}
                <Button type="submit">
                  <Plus className="h-4 w-4" />
                  Add participant
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              All payers
            </h3>
            <p className="text-sm text-slate-500">
              {
                plan.participants.filter(
                  (participant) =>
                    participant.status !== "CANCELLED" &&
                    participant.status !== "EXPIRED",
                ).length
              }{" "}
              active · manual entries and link payers in one list · click a row
              to edit amount
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-48" htmlFor="status-filter" label="Filter status">
              <Select
                id="status-filter"
                onChange={(event) =>
                  setStatusFilter(event.target.value as ParticipantStatus | "ALL")
                }
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </Select>
            </Field>
            <Button
              aria-label="Recalculate participant amounts"
              onClick={() => setRecalculateOpen(true)}
              variant="secondary"
            >
              <RefreshCcw className="h-4 w-4" />
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <EmptyState
              description="Add participants manually or share contribution links."
              icon={Users}
              title="No participants yet"
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Link</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow
                    key={participant.id}
                    aria-label={`Edit ${participant.name}`}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleRowClick(participant)}
                    onKeyDown={(event) => handleRowKeyDown(event, participant)}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell className="font-medium text-slate-900">
                      {participant.name}
                    </TableCell>
                    <TableCell>{participant.email}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {getSourceLabel(participant)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Money amount={participant.allocatedAmount} />
                        {getParticipantPaidAmount(participant) > 0 &&
                        getParticipantRemainingDue(participant) > 0 ? (
                          <p className="text-xs text-slate-500">
                            Paid{" "}
                            <Money
                              amount={getParticipantPaidAmount(participant)}
                            />{" "}
                            · due{" "}
                            <Money
                              amount={getParticipantRemainingDue(participant)}
                            />
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ParticipantStatusBadge status={participant.status} />
                    </TableCell>
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                    >
                      {plan.status === "PUBLISHED" &&
                      participant.status === "PENDING" &&
                      (participant.source === "MANUAL" ||
                        participant.source === "NAMED_LINK" ||
                        !participant.source) ? (
                        <div className="space-y-2">
                          <ContributionLink token={participant.linkToken} />
                          <Button
                            onClick={() => handleCopyLink(participant.linkToken)}
                            size="sm"
                            variant="ghost"
                          >
                            <Copy className="h-4 w-4" />
                            Copy link
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                    >
                      {participant.status !== "CANCELLED" &&
                      participant.status !== "EXPIRED" ? (
                        <Button
                          aria-label={`Remove ${participant.name}`}
                          onClick={() =>
                            isDraft
                              ? onRemoveParticipant(participant.id)
                              : setDepartingParticipantId(participant.id)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-danger-500" />
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
          <Button
            disabled={false}
            onClick={onPublish}
          >
            Publish contribution plan
          </Button>
        </div>
      ) : null}

      {editingParticipant ? (
        <ParticipantEditDialog
          bookingTotal={plan.bookingTotal}
          key={editingParticipant.id}
          onClose={() => setEditingParticipant(null)}
          onSave={onUpdateParticipantAmount}
          open
          participant={editingParticipant}
        />
      ) : null}

      <ParticipantsRecalculateDialog
        onClose={() => setRecalculateOpen(false)}
        onRecalculateEqual={onRedistributeEqual}
        onRecalculateManual={onRedistributeManual}
        open={recalculateOpen}
        plan={plan}
      />

      <Dialog
        description="A new plan version will be published and all previous contribution links will be invalidated."
        onClose={handleCloseRemoval}
        open={Boolean(departingParticipant)}
        title={`Remove ${departingParticipant?.name ?? "participant"} from trip`}
      >
        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {amountToRedistribute > 0 ? (
              <p>
                Unpaid amount to redistribute:{" "}
                <Money amount={amountToRedistribute} />
              </p>
            ) : (
              <p>
                This participant has fully paid. Their completed payment remains
                immutable, so there is no unpaid amount to redistribute.
              </p>
            )}
          </div>

          {amountToRedistribute > 0 ? (
            <Field
              htmlFor="removal-strategy"
              hint="For custom amounts, you can assign only part of the unpaid balance."
              label="Redistribute their unpaid amount"
            >
              <Select
                id="removal-strategy"
                onChange={(event) =>
                  setRemovalStrategy(event.target.value as "equal" | "manual")
                }
                value={removalStrategy}
              >
                <option value="equal">Equally across everyone remaining</option>
                <option value="manual">Custom amounts</option>
              </Select>
            </Field>
          ) : null}

          {amountToRedistribute > 0 && removalStrategy === "manual" ? (
            <div className="space-y-3">
              {remainingParticipants.map((participant) => (
                <Field
                  key={participant.id}
                  hint={
                    getParticipantPaidAmount(participant) > 0
                      ? `Already paid €${getParticipantPaidAmount(participant).toFixed(2)}; this becomes a top-up`
                      : undefined
                  }
                  htmlFor={`removal-${participant.id}`}
                  label={participant.name}
                >
                  <Input
                    id={`removal-${participant.id}`}
                    min="0"
                    onChange={(event) =>
                      setRemovalAllocations((current) => ({
                        ...current,
                        [participant.id]: event.target.value,
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={removalAllocations[participant.id] ?? ""}
                  />
                </Field>
              ))}
              {removalError ? (
                <p className="text-sm text-danger-600">{removalError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button onClick={handleCloseRemoval} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={
                amountToRedistribute > 0 &&
                remainingParticipants.length === 0
              }
              onClick={handleConfirmRemoval}
              variant="danger"
            >
              Remove and publish new plan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
