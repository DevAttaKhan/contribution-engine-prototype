import { Copy, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContributionPlan, ParticipantStatus } from "../../types";
import { ContributionLink, Money, ParticipantStatusBadge } from "../../components/shared";
import { getParticipantPaidAmount, getParticipantRemainingDue } from "../../store";
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
  onRemoveParticipant: (participantId: string) => void;
  onRemovePublishedParticipant: (
    participantId: string,
    strategy: "equal" | "manual",
    allocations?: { participantId: string; amount: number }[],
  ) => void;
  onPublish: () => void;
  duplicateError?: string;
};

export const ParticipantsPanel = ({
  plan,
  isDraft,
  onAddParticipant,
  onRemoveParticipant,
  onRemovePublishedParticipant,
  onPublish,
  duplicateError,
}: ParticipantsPanelProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [amountError, setAmountError] = useState("");
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

    const amount = Number(allocatedAmount);
    if (plan?.mode === "HYBRID") {
      const allocatedTotal = plan.participants.reduce(
        (total, participant) => total + participant.allocatedAmount,
        0,
      );
      const openRemainder = plan.bookingTotal - allocatedTotal;

      if (!Number.isFinite(amount) || amount <= 0) {
        setAmountError("Enter an amount greater than €0.");
        return;
      }

      if (amount > openRemainder) {
        setAmountError(
          `Amount cannot exceed the unallocated balance of €${openRemainder.toFixed(2)}.`,
        );
        return;
      }
    }

    setAmountError("");
    onAddParticipant({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      allocatedAmount: plan?.mode === "HYBRID" ? amount : undefined,
    });

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

    if (Math.abs(allocationTotal - amountToRedistribute) > 0.01) {
      setRemovalError(
        `Custom amounts must total €${amountToRedistribute.toFixed(2)}.`,
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

  if (!plan || plan.mode === "OPEN") {
    return (
      <EmptyState
        description="Equal Split participants are not used in Open Contribution mode."
        icon={Users}
        title="No participant tracking"
      />
    );
  }

  return (
    <div className="space-y-6">
      {isDraft ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-900">
              Add participants
            </h3>
            <p className="text-sm text-slate-500">
              {plan.mode === "HYBRID"
                ? "Assign a fixed amount to each participant. The unallocated remainder is collected through the open link."
                : "Participants are manually managed and the booking total is divided equally."}{" "}
              Duplicate emails are prevented.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
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
              {plan.mode === "HYBRID" ? (
                <Field
                  error={amountError}
                  hint="The remaining booking balance stays available on the open link."
                  htmlFor="participant-amount"
                  label="Participant amount (€)"
                >
                  <Input
                    id="participant-amount"
                    min="0.01"
                    onChange={(event) => setAllocatedAmount(event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={allocatedAmount}
                  />
                </Field>
              ) : null}
              <div className="md:col-span-3 flex items-center justify-between gap-3">
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
              Participants
            </h3>
            <p className="text-sm text-slate-500">
              {
                plan.participants.filter(
                  (participant) =>
                    participant.status !== "CANCELLED" &&
                    participant.status !== "EXPIRED",
                ).length
              }{" "}
              active participant(s) ·{" "}
              {plan.mode === "HYBRID"
                ? "custom participant amounts"
                : "equal distribution"}
            </p>
          </div>
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
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <EmptyState
              description="Add participants to generate individual contribution links."
              icon={Users}
              title="No participants yet"
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Link</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium text-slate-900">
                      {participant.name}
                    </TableCell>
                    <TableCell>{participant.email}</TableCell>
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
                    <TableCell>
                      {plan.status === "PUBLISHED" &&
                      participant.status === "PENDING" ? (
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
                    <TableCell>
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
            disabled={plan.participants.length === 0}
            onClick={onPublish}
          >
            Publish contribution plan
          </Button>
        </div>
      ) : null}

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
