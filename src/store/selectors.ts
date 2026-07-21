import type {
  ActivityEvent,
  AppNotification,
  Booking,
  ContributionPlan,
  Contributor,
  LinkResolution,
  Participant,
  PlanMetrics,
} from "../types";

export type AppState = {
  bookings: Booking[];
  plans: ContributionPlan[];
  activities: ActivityEvent[];
  notifications: AppNotification[];
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

export const getOpenContributionAvailable = (plan: ContributionPlan) => {
  const openCollected = getCollectedFromContributors(plan.contributors);

  if (plan.mode === "OPEN") {
    return Math.max(plan.bookingTotal - openCollected, 0);
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

  const participantCollected = getCollectedFromParticipants(plan.participants);
  const openCollected = getCollectedFromContributors(plan.contributors);
  const totalCollected = participantCollected + openCollected;
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
    openContributions: plan.contributors.length,
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
