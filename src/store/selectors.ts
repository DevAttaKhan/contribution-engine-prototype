import { createId } from "../lib/id";
import type {
  ActivityEvent,
  AppNotification,
  Booking,
  ContributionPlan,
  Contributor,
  LinkResolution,
  Participant,
  PaymentLedgerEntry,
  PlanMetrics,
} from "../types";

export type AppState = {
  bookings: Booking[];
  plans: ContributionPlan[];
  activities: ActivityEvent[];
  notifications: AppNotification[];
  /** Append-only payment ledger across all plan versions and modes. */
  paymentLedger: PaymentLedgerEntry[];
};

export const getBookingById = (state: AppState, bookingId: number) =>
  state.bookings.find((booking) => booking.quote_id === bookingId);

export const getPlansForBooking = (state: AppState, bookingId: number) =>
  state.plans
    .filter((plan) => plan.bookingId === bookingId)
    .sort((left, right) => right.version - left.version);

export const getActivePlan = (state: AppState, bookingId: number) => {
  const plans = getPlansForBooking(state, bookingId);
  return (
    plans.find((plan) => plan.status === "PUBLISHED") ??
    plans.find((plan) => plan.status === "DRAFT") ??
    null
  );
};

export const getDraftPlan = (state: AppState, bookingId: number) =>
  getPlansForBooking(state, bookingId).find((plan) => plan.status === "DRAFT") ??
  null;

export const getParticipantPaidAmount = (participant: Participant) =>
  participant.paidAmount ??
  (participant.status === "PAID" ? participant.allocatedAmount : 0);

export const getParticipantRemainingDue = (participant: Participant) =>
  Math.max(participant.allocatedAmount - getParticipantPaidAmount(participant), 0);

export const getCollectedFromParticipants = (participants: Participant[]) =>
  participants.reduce(
    (total, participant) => total + getParticipantPaidAmount(participant),
    0,
  );

export const getCollectedFromContributors = (contributors: Contributor[]) =>
  contributors.reduce((total, contributor) => total + contributor.amount, 0);

export const getLedgerCollected = (
  ledger: PaymentLedgerEntry[],
  bookingId: number,
) =>
  ledger
    .filter((entry) => entry.bookingId === bookingId)
    .reduce((total, entry) => total + entry.amount, 0);

export const getBookingPaymentLedger = (
  state: AppState,
  bookingId: number,
) =>
  state.paymentLedger
    .filter((entry) => entry.bookingId === bookingId)
    .sort(
      (left, right) =>
        new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime(),
    );

export type UnifiedPaymentRow = {
  id: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  paidAt: string;
  method: string;
  planVersion: number;
  source: "ledger" | "participant" | "contributor";
  status: "COMPLETED" | "PENDING" | "CANCELLED";
};

/**
 * Centralised payment + participant view for organisers.
 * Prefers the immutable ledger; also surfaces pending/cancelled named participants.
 */
export const getUnifiedPaymentRows = (
  state: AppState,
  bookingId: number,
  plan: ContributionPlan | null,
): UnifiedPaymentRow[] => {
  const ledgerRows: UnifiedPaymentRow[] = getBookingPaymentLedger(
    state,
    bookingId,
  ).map((entry) => ({
    id: entry.id,
    payerName: entry.payerName,
    payerEmail: entry.payerEmail,
    amount: entry.amount,
    paidAt: entry.paidAt,
    method: entry.methodLabel,
    planVersion: entry.planVersion,
    source: "ledger" as const,
    status: "COMPLETED" as const,
  }));

  if (!plan) return ledgerRows;

  const ledgerEmailsPaid = new Set(
    ledgerRows.map((row) => `${row.payerEmail.toLowerCase()}|${row.amount}`),
  );

  const pendingRows: UnifiedPaymentRow[] = plan.participants
    .filter((participant) => participant.status === "PENDING")
    .map((participant) => ({
      id: `pending-${participant.id}`,
      payerName: participant.name,
      payerEmail: participant.email,
      amount: getParticipantRemainingDue(participant),
      paidAt: "",
      method: "Named participant (awaiting payment)",
      planVersion: participant.planVersion,
      source: "participant" as const,
      status: "PENDING" as const,
    }));

  const cancelledRows: UnifiedPaymentRow[] = plan.participants
    .filter(
      (participant) =>
        participant.status === "CANCELLED" ||
        participant.status === "EXPIRED",
    )
    .map((participant) => ({
      id: `cancelled-${participant.id}`,
      payerName: participant.name,
      payerEmail: participant.email,
      amount: getParticipantPaidAmount(participant),
      paidAt: participant.paidAt ?? "",
      method: "Named participant (removed / superseded)",
      planVersion: participant.planVersion,
      source: "participant" as const,
      status: "CANCELLED" as const,
    }));

  const contributorFallback: UnifiedPaymentRow[] = plan.contributors
    .filter(
      (contributor) =>
        !ledgerEmailsPaid.has(
          `${contributor.email.toLowerCase()}|${contributor.amount}`,
        ),
    )
    .map((contributor) => ({
      id: `contributor-${contributor.id}`,
      payerName: contributor.name,
      payerEmail: contributor.email,
      amount: contributor.amount,
      paidAt: contributor.paidAt,
      method: contributor.viaEqualShare
        ? "Equal share link"
        : "Open contribution link",
      planVersion: contributor.planVersion,
      source: "contributor" as const,
      status: "COMPLETED" as const,
    }));

  const paidParticipantFallback: UnifiedPaymentRow[] = plan.participants
    .filter((participant) => {
      const paid = getParticipantPaidAmount(participant);
      return (
        paid > 0 &&
        !ledgerEmailsPaid.has(`${participant.email.toLowerCase()}|${paid}`)
      );
    })
    .map((participant) => ({
      id: `paid-${participant.id}`,
      payerName: participant.name,
      payerEmail: participant.email,
      amount: getParticipantPaidAmount(participant),
      paidAt: participant.paidAt ?? "",
      method: "Named participant link",
      planVersion: participant.planVersion,
      source: "participant" as const,
      status: "COMPLETED" as const,
    }));

  return [
    ...ledgerRows,
    ...contributorFallback,
    ...paidParticipantFallback,
    ...pendingRows,
    ...cancelledRows,
  ];
};

export const createLedgerEntry = (input: {
  bookingId: number;
  amount: number;
  payerName: string;
  payerEmail: string;
  method: PaymentLedgerEntry["method"];
  methodLabel: string;
  participantId?: string;
  plan: ContributionPlan;
  paymentId: string;
  paidAt?: string;
}): PaymentLedgerEntry => ({
  id: createId(),
  bookingId: input.bookingId,
  amount: input.amount,
  payerName: input.payerName,
  payerEmail: input.payerEmail,
  paidAt: input.paidAt ?? new Date().toISOString(),
  method: input.method,
  methodLabel: input.methodLabel,
  participantId: input.participantId,
  planId: input.plan.id,
  planVersion: input.plan.version,
  planMode: input.plan.mode,
  paymentId: input.paymentId,
});

export const getEqualSharePaidCount = (plan: ContributionPlan) =>
  plan.contributors.filter((contributor) => contributor.viaEqualShare).length;

export const getEqualShareSlotsRemaining = (plan: ContributionPlan) => {
  if (plan.mode !== "EQUAL_SHARE" || !plan.equalShareCount) return 0;
  return Math.max(plan.equalShareCount - getEqualSharePaidCount(plan), 0);
};

export const getTotalCollectedForPlan = (plan: ContributionPlan) =>
  getCollectedFromParticipants(plan.participants) +
  getCollectedFromContributors(plan.contributors);

export const getOpenContributionAvailable = (plan: ContributionPlan) => {
  const totalCollected = getTotalCollectedForPlan(plan);

  if (plan.mode === "OPEN" || plan.mode === "EQUAL_SHARE") {
    return Math.max(plan.bookingTotal - totalCollected, 0);
  }

  if (plan.mode !== "HYBRID") return 0;

  const reservedForParticipants = plan.participants
    .filter(
      (participant) =>
        participant.status !== "CANCELLED" &&
        participant.status !== "EXPIRED",
    )
    .reduce(
      (total, participant) => total + participant.allocatedAmount,
      0,
    );
  const paidByRemovedParticipants = plan.participants
    .filter(
      (participant) =>
        participant.status === "CANCELLED" ||
        participant.status === "EXPIRED",
    )
    .reduce(
      (total, participant) =>
        total + getParticipantPaidAmount(participant),
      0,
    );
  const openCollected = getCollectedFromContributors(
    plan.contributors.filter((contributor) => !contributor.viaEqualShare),
  );

  return Math.max(
    plan.bookingTotal -
      reservedForParticipants -
      paidByRemovedParticipants -
      openCollected,
    0,
  );
};

export const getPlanMetrics = (plan: ContributionPlan | null): PlanMetrics => {
  if (!plan) {
    return {
      bookingTotal: 0,
      totalCollected: 0,
      remainingBalance: 0,
      contributionPercentage: 0,
      paidParticipants: 0,
      pendingParticipants: 0,
      openContributions: 0,
    };
  }

  const totalCollected = getTotalCollectedForPlan(plan);
  const remainingBalance = Math.max(plan.bookingTotal - totalCollected, 0);
  const contributionPercentage =
    plan.bookingTotal > 0
      ? Math.min((totalCollected / plan.bookingTotal) * 100, 100)
      : 0;

  return {
    bookingTotal: plan.bookingTotal,
    totalCollected,
    remainingBalance,
    contributionPercentage,
    paidParticipants: plan.participants.filter(
      (participant) => participant.status === "PAID",
    ).length,
    pendingParticipants: plan.participants.filter(
      (participant) => participant.status === "PENDING",
    ).length,
    openContributions: plan.contributors.filter(
      (contributor) => !contributor.viaEqualShare,
    ).length,
    equalSharePaidSlots: getEqualSharePaidCount(plan),
    equalShareTotalSlots: plan.equalShareCount,
  };
};

export const getActivitiesForBooking = (state: AppState, bookingId: number) =>
  state.activities
    .filter((activity) => activity.bookingId === bookingId)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );

export const getNotifications = (state: AppState) =>
  [...state.notifications].sort(
    (left, right) =>
      new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime(),
  );

export const getUnreadNotificationCount = (state: AppState) =>
  state.notifications.filter((notification) => !notification.read).length;

export const resolveLinkToken = (
  state: AppState,
  token: string,
): LinkResolution => {
  for (const plan of state.plans) {
    if (plan.status !== "PUBLISHED") continue;

    const participant = plan.participants.find(
      (entry) => entry.linkToken === token,
    );

    if (participant) {
      return {
        kind: "participant",
        bookingId: plan.bookingId,
        plan,
        participant,
      };
    }

    if (plan.equalShareLinkToken === token) {
      return { kind: "equal_share", bookingId: plan.bookingId, plan };
    }

    if (plan.openLinkToken === token) {
      return { kind: "open", bookingId: plan.bookingId, plan };
    }
  }

  return null;
};

export const getBookingTotal = (booking: Booking) => {
  if (booking.price > 0) return booking.price;

  const transactionTotal = booking.transactions.reduce(
    (total, transaction) => total + Number(transaction.total_amount),
    0,
  );

  return transactionTotal;
};
