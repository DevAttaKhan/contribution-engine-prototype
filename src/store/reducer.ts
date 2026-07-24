import { createId, createToken } from "../lib/id";
import { computeEqualShareAmount, distributeEqually } from "../lib/money";
import type {
  ActivityEvent,
  AppNotification,
  ContributionMode,
  ContributionPlan,
  ManualAllocation,
  Participant,
  ParticipantInput,
  ParticipantSource,
} from "../types";
import { createInitialState } from "./initialState";
import type { AppState } from "./selectors";
import {
  createLedgerEntry,
  getActivePlan,
  getBookingById,
  getBookingTotal,
  getCollectedFromContributors,
  getCollectedFromParticipants,
  getDraftPlan,
  getEqualSharePaidCount,
  getOpenContributionAvailable,
  getParticipantPaidAmount,
  getParticipantRemainingDue,
  getTotalCollectedForPlan,
} from "./selectors";

export type AppAction =
  | { type: "RESET_DEMO" }
  | {
      type: "CREATE_PLAN";
      payload: {
        bookingId: number;
        equalShareCount?: number;
      };
    }
  | {
      type: "SET_EQUAL_SHARE_COUNT";
      payload: { bookingId: number; equalShareCount: number };
    }
  | {
      type: "SET_EQUAL_SHARE_AMOUNT";
      payload: { bookingId: number; equalShareAmount: number };
    }
  | {
      type: "ADD_PARTICIPANT";
      payload: { bookingId: number; participant: ParticipantInput };
    }
  | {
      type: "ADD_PUBLISHED_PARTICIPANT";
      payload: {
        bookingId: number;
        participant: ParticipantInput;
        strategy?: "equal" | "keep";
      };
    }
  | {
      type: "REMOVE_PARTICIPANT";
      payload: { bookingId: number; participantId: string };
    }
  | {
      type: "REMOVE_PUBLISHED_PARTICIPANT";
      payload: {
        bookingId: number;
        participantId: string;
        strategy: "equal" | "manual";
        allocations?: ManualAllocation[];
      };
    }
  | { type: "PUBLISH_PLAN"; payload: { bookingId: number } }
  | {
      type: "RECALCULATE_EQUAL";
      payload: {
        bookingId: number;
        newBookingTotal?: number;
        includePaidParticipants?: boolean;
        newMode?: ContributionMode;
        equalShareCount?: number;
      };
    }
  | {
      type: "RECALCULATE_MANUAL";
      payload: {
        bookingId: number;
        allocations: ManualAllocation[];
        newBookingTotal?: number;
        includePaidParticipants?: boolean;
        newMode?: ContributionMode;
        equalShareCount?: number;
      };
    }
  | {
      type: "UPDATE_BOOKING";
      payload: {
        bookingId: number;
        price?: number;
        passengers?: number;
        pickup?: string;
        dropoff?: string;
      };
    }
  | {
      type: "PAYMENT_SUCCESS";
      payload: {
        token: string;
        payerName?: string;
        payerEmail?: string;
        amount?: number;
      };
    }
  | { type: "PAYMENT_FAILED"; payload: { token: string } }
  | { type: "SEND_REMINDERS"; payload: { bookingId: number } }
  | { type: "SEND_INVITATIONS"; payload: { bookingId: number } }
  | { type: "MARK_NOTIFICATION_READ"; payload: { notificationId: string } }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | {
      type: "UPDATE_PARTICIPANT_AMOUNT";
      payload: {
        bookingId: number;
        participantId: string;
        /** Absolute allocation when unpaid; additional top-up when already paid. */
        amount: number;
        note?: string;
      };
    }
  | {
      type: "REDISTRIBUTE_PARTICIPANTS_EQUAL";
      payload: {
        bookingId: number;
        includePaidParticipants?: boolean;
      };
    }
  | {
      type: "REDISTRIBUTE_PARTICIPANTS_MANUAL";
      payload: {
        bookingId: number;
        allocations: ManualAllocation[];
        includePaidParticipants?: boolean;
      };
    };

const now = () => new Date().toISOString();

const planHasOpenLink = (mode: ContributionMode) =>
  mode === "OPEN" || mode === "HYBRID" || mode === "UNIFIED";

const planHasEqualShare = (mode: ContributionMode) =>
  mode === "EQUAL_SHARE" || mode === "UNIFIED";

const planSupportsNamedParticipants = (mode: ContributionMode) =>
  mode === "EQUAL_SPLIT" || mode === "HYBRID" || mode === "UNIFIED";

const isLegacyNamedOnlyMode = (mode: ContributionMode) =>
  mode === "EQUAL_SPLIT" || mode === "HYBRID";

const addActivity = (
  activities: ActivityEvent[],
  bookingId: number,
  type: ActivityEvent["type"],
  message: string,
  metadata?: ActivityEvent["metadata"],
): ActivityEvent[] => [
  {
    id: createId(),
    bookingId,
    type,
    message,
    timestamp: now(),
    metadata,
  },
  ...activities,
];

const addNotification = (
  notifications: AppNotification[],
  notification: Omit<AppNotification, "id" | "sentAt" | "read">,
): AppNotification[] => [
  {
    id: createId(),
    sentAt: now(),
    read: false,
    ...notification,
  },
  ...notifications,
];

const supersedePublishedPlans = (
  plans: ContributionPlan[],
  bookingId: number,
) =>
  plans.map((plan) =>
    plan.bookingId === bookingId && plan.status === "PUBLISHED"
      ? { ...plan, status: "SUPERSEDED" as const }
      : plan,
  );

const createParticipant = (
  input: ParticipantInput,
  amount: number,
  version: number,
  source: ParticipantSource = "MANUAL",
): Participant => ({
  id: createId(),
  name: input.name.trim(),
  email: input.email.trim().toLowerCase(),
  phone: input.phone?.trim(),
  allocatedAmount: amount,
  status: "PENDING",
  linkToken: createToken(),
  planVersion: version,
  source,
  amountHistory: [],
});

const upsertLinkPayerParticipant = (
  plan: ContributionPlan,
  payerName: string,
  payerEmail: string,
  amount: number,
  source: "OPEN_LINK" | "EQUAL_SHARE",
): Participant[] => {
  const email = payerEmail.trim().toLowerCase();
  const existing = plan.participants.find(
    (participant) =>
      participant.email === email &&
      participant.status !== "CANCELLED" &&
      participant.status !== "EXPIRED",
  );

  if (existing) {
    const previousPaid = getParticipantPaidAmount(existing);
    const nextPaid = previousPaid + amount;
    const allocatedAmount = Math.max(existing.allocatedAmount, nextPaid);
    const remainingDue = Math.max(allocatedAmount - nextPaid, 0);

    return plan.participants.map((participant) =>
      participant.id === existing.id
        ? {
            ...participant,
            allocatedAmount,
            paidAmount: nextPaid,
            paidAt: now(),
            status: remainingDue > 0 ? ("PENDING" as const) : ("PAID" as const),
            source: participant.source ?? source,
          }
        : participant,
    );
  }

  return [
    ...plan.participants,
    {
      id: createId(),
      name: payerName.trim(),
      email,
      allocatedAmount: amount,
      paidAmount: amount,
      paidAt: now(),
      status: "PAID" as const,
      linkToken: createToken(),
      planVersion: plan.version,
      source,
      amountHistory: [],
    },
  ];
};

const publishDraftPlan = (
  state: AppState,
  bookingId: number,
  draft: ContributionPlan,
) => {
  const superseded = supersedePublishedPlans(state.plans, bookingId);
  const publishedPlan: ContributionPlan = {
    ...draft,
    status: "PUBLISHED",
    publishedAt: now(),
    openLinkToken: planHasOpenLink(draft.mode) ? createToken() : undefined,
    equalShareLinkToken: planHasEqualShare(draft.mode)
      ? createToken()
      : undefined,
    equalShareAmount:
      planHasEqualShare(draft.mode) && draft.equalShareCount
        ? computeEqualShareAmount(draft.bookingTotal, draft.equalShareCount)
        : draft.equalShareAmount,
    participants: draft.participants.map((participant) => ({
      ...participant,
      linkToken: createToken(),
    })),
  };

  return {
    plans: [
      ...superseded.filter((plan) => plan.id !== draft.id),
      publishedPlan,
    ],
    activities: addActivity(
      state.activities,
      bookingId,
      "PLAN_PUBLISHED",
      `Contribution plan v${publishedPlan.version} published.`,
      { version: publishedPlan.version },
    ),
    notifications: addNotification(state.notifications, {
      bookingId,
      recipient: "Organiser",
      type: "RECEIPT",
      message: `Plan v${publishedPlan.version} is now live with updated contribution links.`,
    }),
  };
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "RESET_DEMO":
      return createInitialState();

    case "CREATE_PLAN": {
      const booking = getBookingById(state, action.payload.bookingId);
      if (!booking) return state;

      const existingDraft = state.plans.find(
        (plan) =>
          plan.bookingId === action.payload.bookingId &&
          plan.status === "DRAFT",
      );
      if (existingDraft) return state;

      const version =
        state.plans.filter((plan) => plan.bookingId === action.payload.bookingId)
          .length + 1;

      const bookingTotal = getBookingTotal(booking);
      const equalShareCount = Math.max(1, action.payload.equalShareCount ?? 40);

      const plan: ContributionPlan = {
        id: createId(),
        bookingId: action.payload.bookingId,
        version,
        mode: "UNIFIED",
        status: "DRAFT",
        bookingTotal,
        participants: [],
        contributors: [],
        createdAt: now(),
        equalShareCount,
        equalShareAmount: computeEqualShareAmount(bookingTotal, equalShareCount),
        openLinkToken: createToken(),
      };

      return {
        ...state,
        plans: [...state.plans, plan],
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "PLAN_CREATED",
          `Contribution plan v${version} created.`,
          { version, mode: "UNIFIED" },
        ),
      };
    }

    case "SET_EQUAL_SHARE_COUNT": {
      const workingPlan =
        getDraftPlan(state, action.payload.bookingId) ??
        getActivePlan(state, action.payload.bookingId);
      if (!workingPlan || !planHasEqualShare(workingPlan.mode)) return state;

      const equalShareCount = Math.max(1, Math.floor(action.payload.equalShareCount));
      const equalShareAmount = computeEqualShareAmount(
        workingPlan.bookingTotal,
        equalShareCount,
      );

      if (workingPlan.status === "DRAFT") {
        return {
          ...state,
          plans: state.plans.map((plan) =>
            plan.id === workingPlan.id
              ? { ...plan, equalShareCount, equalShareAmount }
              : plan,
          ),
        };
      }

      const nextVersion = workingPlan.version + 1;
      const nextPlan: ContributionPlan = {
        ...workingPlan,
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        equalShareCount,
        equalShareAmount,
        equalShareLinkToken: createToken(),
        openLinkToken: planHasOpenLink(workingPlan.mode)
          ? createToken()
          : undefined,
      };

      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          published.activities,
          action.payload.bookingId,
          "RECALCULATION",
          `Equal share headcount updated to ${equalShareCount} (€${equalShareAmount.toFixed(2)} each) in plan v${nextVersion}.`,
          { version: nextVersion },
        ),
        notifications: published.notifications,
      };
    }

    case "SET_EQUAL_SHARE_AMOUNT": {
      const workingPlan =
        getDraftPlan(state, action.payload.bookingId) ??
        getActivePlan(state, action.payload.bookingId);
      if (!workingPlan || !planHasEqualShare(workingPlan.mode)) return state;

      const equalShareAmount = action.payload.equalShareAmount;
      if (!Number.isFinite(equalShareAmount) || equalShareAmount <= 0) {
        return state;
      }

      const equalShareCount = Math.max(
        1,
        Math.floor(workingPlan.bookingTotal / equalShareAmount) || 1,
      );

      if (workingPlan.status === "DRAFT") {
        return {
          ...state,
          plans: state.plans.map((plan) =>
            plan.id === workingPlan.id
              ? { ...plan, equalShareAmount, equalShareCount }
              : plan,
          ),
          activities: addActivity(
            state.activities,
            action.payload.bookingId,
            "RECALCULATION",
            `Equal share amount set to €${equalShareAmount.toFixed(2)} (${equalShareCount} slots).`,
          ),
        };
      }

      const nextVersion = workingPlan.version + 1;
      const nextPlan: ContributionPlan = {
        ...workingPlan,
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        equalShareAmount,
        equalShareCount,
        equalShareLinkToken: createToken(),
        openLinkToken: planHasOpenLink(workingPlan.mode)
          ? createToken()
          : undefined,
      };

      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          published.activities,
          action.payload.bookingId,
          "RECALCULATION",
          `Equal share amount updated to €${equalShareAmount.toFixed(2)} in plan v${nextVersion}. Previous equal share link invalidated.`,
          { version: nextVersion },
        ),
        notifications: published.notifications,
      };
    }

    case "ADD_PARTICIPANT": {
      const draft = state.plans.find(
        (plan) =>
          plan.bookingId === action.payload.bookingId &&
          plan.status === "DRAFT",
      );
      if (!draft || !planSupportsNamedParticipants(draft.mode)) {
        return state;
      }

      const email = action.payload.participant.email.trim().toLowerCase();
      const duplicate = draft.participants.some(
        (participant) => participant.email === email,
      );
      if (duplicate) return state;

      const amount = action.payload.participant.allocatedAmount ?? 0;

      if (draft.mode === "HYBRID") {
        if (amount <= 0) return state;
        const hybridAllocatedTotal =
          draft.participants.reduce(
            (total, participant) => total + participant.allocatedAmount,
            0,
          ) + amount;
        if (hybridAllocatedTotal > draft.bookingTotal) return state;
      }

      let updatedParticipants: Participant[];

      if (draft.mode === "EQUAL_SPLIT") {
        const participants = [
          ...draft.participants,
          createParticipant(action.payload.participant, 0, draft.version, "MANUAL"),
        ];
        const amounts = distributeEqually(draft.bookingTotal, participants.length);
        updatedParticipants = participants.map((participant, index) => ({
          ...participant,
          allocatedAmount: amounts[index] ?? 0,
        }));
      } else {
        updatedParticipants = [
          ...draft.participants,
          createParticipant(
            action.payload.participant,
            draft.mode === "HYBRID" ? amount : amount,
            draft.version,
            "MANUAL",
          ),
        ];
      }

      return {
        ...state,
        plans: state.plans.map((plan) =>
          plan.id === draft.id
            ? { ...plan, participants: updatedParticipants }
            : plan,
        ),
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "PARTICIPANT_ADDED",
          `${action.payload.participant.name} added to the contribution plan.`,
        ),
      };
    }

    case "REMOVE_PARTICIPANT": {
      const draft = state.plans.find(
        (plan) =>
          plan.bookingId === action.payload.bookingId &&
          plan.status === "DRAFT",
      );
      if (!draft) return state;

      const removed = draft.participants.find(
        (participant) => participant.id === action.payload.participantId,
      );
      if (!removed) return state;

      const remaining = draft.participants.filter(
        (participant) => participant.id !== action.payload.participantId,
      );
      const updatedParticipants =
        draft.mode === "HYBRID"
          ? remaining
          : (() => {
              const amounts = distributeEqually(
                draft.bookingTotal,
                remaining.length,
              );
              return remaining.map((participant, index) => ({
                ...participant,
                allocatedAmount: amounts[index] ?? 0,
              }));
            })();

      return {
        ...state,
        plans: state.plans.map((plan) =>
          plan.id === draft.id
            ? { ...plan, participants: updatedParticipants }
            : plan,
        ),
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "PARTICIPANT_REMOVED",
          `${removed.name} removed from the contribution plan.`,
        ),
      };
    }

    case "REMOVE_PUBLISHED_PARTICIPANT": {
      const activePlan = getActivePlan(state, action.payload.bookingId);
      if (!activePlan || activePlan.status !== "PUBLISHED") return state;

      const departingParticipant = activePlan.participants.find(
        (participant) => participant.id === action.payload.participantId,
      );
      if (
        !departingParticipant ||
        departingParticipant.status === "CANCELLED" ||
        departingParticipant.status === "EXPIRED"
      ) {
        return state;
      }

      const amountToRedistribute =
        getParticipantRemainingDue(departingParticipant);
      const remainingParticipants = activePlan.participants.filter(
        (participant) =>
          participant.id !== departingParticipant.id &&
          participant.status !== "CANCELLED" &&
          participant.status !== "EXPIRED",
      );

      if (amountToRedistribute > 0 && remainingParticipants.length === 0) {
        return state;
      }

      let redistributionAmounts: number[];
      if (action.payload.strategy === "manual") {
        const allocationMap = new Map(
          (action.payload.allocations ?? []).map((allocation) => [
            allocation.participantId,
            allocation.amount,
          ]),
        );
        redistributionAmounts = remainingParticipants.map(
          (participant) => allocationMap.get(participant.id) ?? 0,
        );
        const allocatedTotal = redistributionAmounts.reduce(
          (total, amount) => total + amount,
          0,
        );
        // Partial redistribution is allowed when a participant leaves.
        if (
          redistributionAmounts.some((amount) => amount < 0) ||
          allocatedTotal - amountToRedistribute > 0.01
        ) {
          return state;
        }
      } else {
        redistributionAmounts = distributeEqually(
          amountToRedistribute,
          remainingParticipants.length,
        );
      }

      const nextVersion = activePlan.version + 1;
      const redistributedParticipants = remainingParticipants.map(
        (participant, index) => {
          const additionalAmount = redistributionAmounts[index] ?? 0;
          const paidAmount = getParticipantPaidAmount(participant);
          const allocatedAmount =
            participant.allocatedAmount + additionalAmount;
          const remainingDue = Math.max(allocatedAmount - paidAmount, 0);

          return {
            ...participant,
            allocatedAmount,
            paidAmount: paidAmount > 0 ? paidAmount : undefined,
            status:
              remainingDue > 0 ? ("PENDING" as const) : ("PAID" as const),
            linkToken: remainingDue > 0 ? createToken() : participant.linkToken,
            planVersion: nextVersion,
          };
        },
      );
      const alreadyRemovedParticipants = activePlan.participants.filter(
        (participant) =>
          participant.id !== departingParticipant.id &&
          (participant.status === "CANCELLED" ||
            participant.status === "EXPIRED"),
      );
      const cancelledParticipant: Participant = {
        ...departingParticipant,
        allocatedAmount: getParticipantPaidAmount(departingParticipant),
        paidAmount:
          getParticipantPaidAmount(departingParticipant) > 0
            ? getParticipantPaidAmount(departingParticipant)
            : undefined,
        status: "CANCELLED",
        linkToken: createToken(),
        planVersion: nextVersion,
      };
      const nextPlan: ContributionPlan = {
        ...activePlan,
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        participants: [
          ...redistributedParticipants,
          ...alreadyRemovedParticipants,
          cancelledParticipant,
        ],
        openLinkToken: planHasOpenLink(activePlan.mode)
            ? createToken()
            : undefined,
        equalShareLinkToken: planHasEqualShare(activePlan.mode)
          ? createToken()
          : undefined,
      };
      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );
      const strategyLabel =
        action.payload.strategy === "equal" ? "equally" : "manually";
      const removalActivities = addActivity(
        published.activities,
        action.payload.bookingId,
        "PARTICIPANT_REMOVED",
        `${departingParticipant.name} left the trip. €${amountToRedistribute.toFixed(2)} was redistributed ${strategyLabel} across the remaining participants in plan v${nextVersion}.`,
        {
          participantId: departingParticipant.id,
          amountRedistributed: amountToRedistribute,
          version: nextVersion,
        },
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          removalActivities,
          action.payload.bookingId,
          "LINK_INVALIDATED",
          `Previous contribution links for v${activePlan.version} invalidated.`,
          { version: activePlan.version },
        ),
        notifications: published.notifications,
      };
    }

    case "ADD_PUBLISHED_PARTICIPANT": {
      const activePlan = getActivePlan(state, action.payload.bookingId);
      if (
        !activePlan ||
        activePlan.status !== "PUBLISHED" ||
        !planSupportsNamedParticipants(activePlan.mode)
      ) {
        return state;
      }

      const email = action.payload.participant.email.trim().toLowerCase();
      const duplicate = activePlan.participants.some(
        (participant) =>
          participant.email === email &&
          participant.status !== "CANCELLED" &&
          participant.status !== "EXPIRED",
      );
      if (duplicate) return state;

      const nextVersion = activePlan.version + 1;
      const paidParticipants = activePlan.participants.filter(
        (participant) => participant.status === "PAID",
      );
      const pendingParticipants = activePlan.participants.filter(
        (participant) => participant.status === "PENDING",
      );
      const otherParticipants = activePlan.participants.filter(
        (participant) =>
          participant.status === "CANCELLED" ||
          participant.status === "EXPIRED",
      );

      let newParticipant: Participant;
      let updatedPending: Participant[];

      if (activePlan.mode === "HYBRID") {
        const amount = action.payload.participant.allocatedAmount ?? 0;
        const reserved = [...paidParticipants, ...pendingParticipants].reduce(
          (total, participant) => total + participant.allocatedAmount,
          0,
        );
        if (amount <= 0 || reserved + amount > activePlan.bookingTotal) {
          return state;
        }

        newParticipant = createParticipant(
          action.payload.participant,
          amount,
          nextVersion,
          "MANUAL",
        );
        updatedPending = [
          ...pendingParticipants.map((participant) => ({
            ...participant,
            linkToken: createToken(),
            planVersion: nextVersion,
          })),
          newParticipant,
        ];
      } else if (activePlan.mode === "UNIFIED") {
        const amount = action.payload.participant.allocatedAmount ?? 0;
        newParticipant = createParticipant(
          action.payload.participant,
          amount,
          nextVersion,
          "MANUAL",
        );
        updatedPending = [
          ...pendingParticipants.map((participant) => ({
            ...participant,
            linkToken: createToken(),
            planVersion: nextVersion,
          })),
          newParticipant,
        ];
      } else {
        const paidCollected = getCollectedFromParticipants(paidParticipants);
        const openCollected = activePlan.contributors.reduce(
          (total, contributor) => total + contributor.amount,
          0,
        );
        const outstanding = Math.max(
          activePlan.bookingTotal - paidCollected - openCollected,
          0,
        );
        const pendingWithNew = [
          ...pendingParticipants,
          createParticipant(action.payload.participant, 0, nextVersion),
        ];
        const amounts = distributeEqually(outstanding, pendingWithNew.length);
        updatedPending = pendingWithNew.map((participant, index) => ({
          ...participant,
          allocatedAmount: amounts[index] ?? 0,
          linkToken: createToken(),
          planVersion: nextVersion,
          status: "PENDING" as const,
        }));
        newParticipant = updatedPending[updatedPending.length - 1]!;
      }

      const nextPlan: ContributionPlan = {
        ...activePlan,
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        participants: [
          ...paidParticipants.map((participant) => ({
            ...participant,
            paidAmount: getParticipantPaidAmount(participant),
            planVersion: nextVersion,
          })),
          ...updatedPending,
          ...otherParticipants,
        ],
        openLinkToken: planHasOpenLink(activePlan.mode)
          ? createToken()
          : undefined,
        equalShareLinkToken: planHasEqualShare(activePlan.mode)
          ? createToken()
          : undefined,
      };

      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          published.activities,
          action.payload.bookingId,
          "PARTICIPANT_ADDED",
          `${newParticipant.name} added after publish. Plan updated to v${nextVersion} and previous links invalidated.`,
          { version: nextVersion },
        ),
        notifications: addNotification(published.notifications, {
          bookingId: action.payload.bookingId,
          recipient: newParticipant.email,
          type: "INVITATION",
          message: `Contribution invitation sent to ${newParticipant.name}.`,
        }),
      };
    }

    case "PUBLISH_PLAN": {
      const draft = state.plans.find(
        (plan) =>
          plan.bookingId === action.payload.bookingId &&
          plan.status === "DRAFT",
      );
      if (!draft) return state;

      if (
        isLegacyNamedOnlyMode(draft.mode) &&
        draft.participants.length === 0
      ) {
        return state;
      }

      if (
        draft.mode === "EQUAL_SHARE" &&
        (!draft.equalShareCount || draft.equalShareCount < 1)
      ) {
        return state;
      }

      const published = publishDraftPlan(
        state,
        action.payload.bookingId,
        draft,
      );

      const invitationNotifications = draft.participants.reduce(
        (notifications, participant) =>
          addNotification(notifications, {
            bookingId: action.payload.bookingId,
            recipient: participant.email,
            type: "INVITATION",
            message: `Contribution invitation sent to ${participant.name} for €${participant.allocatedAmount.toFixed(2)}.`,
          }),
        published.notifications,
      );

      return {
        ...state,
        plans: published.plans,
        activities: [
          ...published.activities,
          ...draft.participants.map((participant) => ({
            id: createId(),
            bookingId: action.payload.bookingId,
            type: "LINK_GENERATED" as const,
            message: `Contribution link generated for ${participant.name}.`,
            timestamp: now(),
          })),
          ...(planHasOpenLink(draft.mode)
            ? [
                {
                  id: createId(),
                  bookingId: action.payload.bookingId,
                  type: "LINK_GENERATED" as const,
                  message: "Open contribution link generated.",
                  timestamp: now(),
                },
              ]
            : []),
          ...(planHasEqualShare(draft.mode)
            ? [
                {
                  id: createId(),
                  bookingId: action.payload.bookingId,
                  type: "LINK_GENERATED" as const,
                  message: `Equal share link generated (€${(draft.equalShareAmount ?? 0).toFixed(2)} × ${draft.equalShareCount}).`,
                  timestamp: now(),
                },
              ]
            : []),
        ],
        notifications: invitationNotifications,
      };
    }

    case "UPDATE_BOOKING": {
      const booking = getBookingById(state, action.payload.bookingId);
      if (!booking) return state;

      const updatedBookings = state.bookings.map((entry) =>
        entry.quote_id === action.payload.bookingId
          ? {
              ...entry,
              price: action.payload.price ?? entry.price,
              passengers: action.payload.passengers ?? entry.passengers,
              pickup: action.payload.pickup ?? entry.pickup,
              dropoff: action.payload.dropoff ?? entry.dropoff,
            }
          : entry,
      );

      const activePlan = getActivePlan(state, action.payload.bookingId);
      const updatedPlans = activePlan
        ? state.plans.map((plan) =>
            plan.id === activePlan.id
              ? {
                  ...plan,
                  bookingTotal:
                    action.payload.price ?? getBookingTotal(booking),
                  equalShareAmount:
                    plan.equalShareCount != null
                      ? computeEqualShareAmount(
                          action.payload.price ?? getBookingTotal(booking),
                          plan.equalShareCount,
                        )
                      : plan.equalShareAmount,
                }
              : plan,
          )
        : state.plans;

      return {
        ...state,
        bookings: updatedBookings,
        plans: updatedPlans,
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "BOOKING_UPDATED",
          "Booking details updated. Recalculation may be required.",
        ),
      };
    }

    case "RECALCULATE_EQUAL":
    case "RECALCULATE_MANUAL": {
      const activePlan = getActivePlan(state, action.payload.bookingId);
      const booking = getBookingById(state, action.payload.bookingId);
      if (!activePlan || !booking || activePlan.status !== "PUBLISHED") {
        return state;
      }

      const newTotal =
        action.payload.newBookingTotal ?? getBookingTotal(booking);
      const openCollected = activePlan.contributors.reduce(
        (total, contributor) => total + contributor.amount,
        0,
      );
      const paidCollected = getCollectedFromParticipants(
        activePlan.participants,
      );

      // Paid amounts stay fixed when price is reduced. Including paid
      // participants in a re-split is only allowed when the quotation increases.
      const priceIncreased = newTotal > activePlan.bookingTotal;
      const includePaidParticipants =
        Boolean(action.payload.includePaidParticipants) && priceIncreased;

      const eligibleParticipants = activePlan.participants.filter(
        (participant) =>
          participant.status === "PENDING" || participant.status === "PAID",
      );
      const unpaidOnly = eligibleParticipants.filter(
        (participant) => participant.status === "PENDING",
      );
      const paidOnly = eligibleParticipants.filter(
        (participant) => participant.status === "PAID",
      );

      const redistributionTargets = includePaidParticipants
        ? eligibleParticipants
        : unpaidOnly;

      if (redistributionTargets.length === 0 && !includePaidParticipants) {
        // Nothing left to redistribute among unpaid; keep paid as-is
        if (action.type === "RECALCULATE_MANUAL") return state;
      }

      const redistributionPool = includePaidParticipants
        ? Math.max(newTotal - openCollected, 0)
        : Math.max(newTotal - paidCollected - openCollected, 0);

      let updatedTargets: Participant[];

      if (action.type === "RECALCULATE_MANUAL") {
        const allocationMap = new Map(
          action.payload.allocations.map((allocation) => [
            allocation.participantId,
            allocation.amount,
          ]),
        );
        const manualTotal = action.payload.allocations.reduce(
          (total, allocation) => total + allocation.amount,
          0,
        );

        // Partial allocation is allowed; organiser may leave some balance unassigned.
        if (
          action.payload.allocations.some((allocation) => allocation.amount < 0) ||
          manualTotal - redistributionPool > 0.01
        ) {
          return state;
        }

        updatedTargets = redistributionTargets.map((participant) => {
          const allocatedAmount =
            allocationMap.get(participant.id) ?? participant.allocatedAmount;
          const paidAmount = getParticipantPaidAmount(participant);
          const hasPaidBefore = paidAmount > 0;

          if (includePaidParticipants && hasPaidBefore) {
            const remainingDue = Math.max(allocatedAmount - paidAmount, 0);
            return {
              ...participant,
              allocatedAmount,
              paidAmount,
              status: remainingDue > 0 ? ("PENDING" as const) : ("PAID" as const),
              linkToken:
                remainingDue > 0 ? createToken() : participant.linkToken,
              planVersion: activePlan.version + 1,
            };
          }

          return {
            ...participant,
            allocatedAmount,
            linkToken: createToken(),
            planVersion: activePlan.version + 1,
            status: "PENDING" as const,
          };
        });
      } else {
        if (redistributionTargets.length === 0) {
          updatedTargets = [];
        } else {
          const amounts = distributeEqually(
            redistributionPool,
            redistributionTargets.length,
          );
          updatedTargets = redistributionTargets.map((participant, index) => {
            const allocatedAmount = amounts[index] ?? 0;
            const paidAmount = getParticipantPaidAmount(participant);
            const hasPaidBefore = paidAmount > 0;

            if (includePaidParticipants && hasPaidBefore) {
              const remainingDue = Math.max(allocatedAmount - paidAmount, 0);
              return {
                ...participant,
                allocatedAmount,
                paidAmount,
                status:
                  remainingDue > 0 ? ("PENDING" as const) : ("PAID" as const),
                linkToken:
                  remainingDue > 0 ? createToken() : participant.linkToken,
                planVersion: activePlan.version + 1,
              };
            }

            return {
              ...participant,
              allocatedAmount,
              linkToken: createToken(),
              planVersion: activePlan.version + 1,
              status: "PENDING" as const,
            };
          });
        }
      }

      const preservedPaid = includePaidParticipants
        ? []
        : paidOnly.map((participant) => ({
            ...participant,
            // Keep paid amount unchanged when quotation price is reduced
            paidAmount: getParticipantPaidAmount(participant),
            status: "PAID" as const,
          }));

      const nextVersion = activePlan.version + 1;
      const otherParticipants = activePlan.participants.filter(
        (participant) =>
          participant.status === "CANCELLED" ||
          participant.status === "EXPIRED",
      );

      const newMode = action.payload.newMode ?? activePlan.mode;
      const modeChanged = newMode !== activePlan.mode;
      const equalShareCount =
        newMode === "EQUAL_SHARE"
          ? Math.max(
              1,
              action.payload.equalShareCount ??
                activePlan.equalShareCount ??
                1,
            )
          : activePlan.mode === "EQUAL_SHARE"
            ? activePlan.equalShareCount
            : undefined;

      // Always preserve every completed payment. Pending named participants are
      // kept when staying on named modes; otherwise archived as CANCELLED so
      // history remains visible without affecting the outstanding balance.
      const archivedPending =
        newMode === "EQUAL_SPLIT" || newMode === "HYBRID"
          ? []
          : unpaidOnly.map((participant) => ({
              ...participant,
              status: "CANCELLED" as const,
              allocatedAmount: getParticipantPaidAmount(participant),
              paidAmount:
                getParticipantPaidAmount(participant) > 0
                  ? getParticipantPaidAmount(participant)
                  : undefined,
              planVersion: nextVersion,
            }));

      // Materialise equal-share / open payers as named PAID participants when
      // switching into a named mode, so tracking stays visible in one place.
      const contributorAsParticipants: Participant[] =
        newMode === "EQUAL_SPLIT" || newMode === "HYBRID"
          ? activePlan.contributors
              .filter((contributor) => {
                const email = contributor.email.toLowerCase();
                return ![...paidOnly, ...unpaidOnly].some(
                  (participant) => participant.email === email,
                );
              })
              .map((contributor) => ({
                id: createId(),
                name: contributor.name,
                email: contributor.email.toLowerCase(),
                allocatedAmount: contributor.amount,
                paidAmount: contributor.amount,
                paidAt: contributor.paidAt,
                status: "PAID" as const,
                linkToken: createToken(),
                planVersion: nextVersion,
              }))
          : [];

      const convertedEmails = new Set(
        contributorAsParticipants.map((participant) => participant.email),
      );

      // Move converted link payers into named participants without double-counting.
      const carriedContributors = activePlan.contributors.filter(
        (contributor) =>
          !convertedEmails.has(contributor.email.toLowerCase()),
      );

      const draftParticipants =
        newMode === "EQUAL_SPLIT" || newMode === "HYBRID"
          ? [
              ...preservedPaid,
              ...contributorAsParticipants,
              ...updatedTargets,
              ...otherParticipants,
            ]
          : [
              ...paidOnly.map((participant) => ({
                ...participant,
                paidAmount: getParticipantPaidAmount(participant),
                status: "PAID" as const,
                planVersion: nextVersion,
              })),
              ...archivedPending,
              ...otherParticipants,
            ];

      // Equal share amount is calculated from remaining balance so prior
      // collections are never overwritten when switching modes.
      const remainingForNewShares = Math.max(
        newTotal -
          getCollectedFromParticipants(draftParticipants) -
          getCollectedFromContributors(carriedContributors),
        0,
      );
      const equalShareAmount =
        newMode === "EQUAL_SHARE" && equalShareCount
          ? computeEqualShareAmount(remainingForNewShares, equalShareCount)
          : newMode !== "EQUAL_SHARE"
            ? undefined
            : activePlan.equalShareAmount;

      const draftPlan: ContributionPlan = {
        id: createId(),
        bookingId: action.payload.bookingId,
        version: nextVersion,
        mode: newMode,
        status: "DRAFT",
        bookingTotal: newTotal,
        participants: draftParticipants,
        contributors: carriedContributors,
        createdAt: now(),
        equalShareCount: newMode === "EQUAL_SHARE" ? equalShareCount : undefined,
        equalShareAmount,
        openLinkToken:
          newMode === "OPEN" || newMode === "HYBRID"
            ? createToken()
            : undefined,
      };

      const superseded = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      ).map((plan) =>
        plan.id === activePlan.id
          ? { ...plan, status: "SUPERSEDED" as const }
          : plan,
      );

      const published = publishDraftPlan(
        { ...state, plans: [...superseded, draftPlan] },
        action.payload.bookingId,
        draftPlan,
      );

      const recalcMessage = modeChanged
        ? `Contribution plan switched to ${newMode.replaceAll("_", " ").toLowerCase()} as v${nextVersion}. Previous links invalidated.`
        : includePaidParticipants
          ? `Contribution plan recalculated to v${nextVersion}. Amounts re-divided across all participants (including those who already paid). Previous links invalidated.`
          : `Contribution plan recalculated to v${nextVersion}. Paid amounts kept unchanged; only outstanding balances redistributed. Previous links invalidated.`;

      return {
        ...state,
        bookings: state.bookings.map((entry) =>
          entry.quote_id === action.payload.bookingId
            ? { ...entry, price: newTotal }
            : entry,
        ),
        plans: published.plans,
        activities: [
          ...addActivity(
            state.activities,
            action.payload.bookingId,
            modeChanged ? "MODE_CHANGED" : "RECALCULATION",
            recalcMessage,
            {
              version: nextVersion,
              includePaidParticipants,
              priceIncreased,
              mode: newMode,
            },
          ),
          ...addActivity(
            published.activities,
            action.payload.bookingId,
            "LINK_INVALIDATED",
            `Previous contribution links for v${activePlan.version} invalidated.`,
            { version: activePlan.version },
          ),
        ],
        notifications: published.notifications,
      };
    }

    case "PAYMENT_SUCCESS": {
      const resolution = state.plans
        .filter((plan) => plan.status === "PUBLISHED")
        .reduce<{
          plan: ContributionPlan;
          participant?: Participant;
          kind: "participant" | "open" | "equal_share";
        } | null>((found, plan) => {
          if (found) return found;

          const participant = plan.participants.find(
            (entry) => entry.linkToken === action.payload.token,
          );
          if (participant) return { plan, participant, kind: "participant" };

          if (plan.equalShareLinkToken === action.payload.token) {
            return { plan, kind: "equal_share" };
          }

          if (plan.openLinkToken === action.payload.token) {
            return { plan, kind: "open" };
          }

          return null;
        }, null);

      if (!resolution) return state;

      const { plan, participant, kind } = resolution;

      if (kind === "participant" && participant) {
        const remainingDue = getParticipantRemainingDue(participant);
        if (remainingDue <= 0 || participant.status === "PAID") return state;

        const previousPaid = getParticipantPaidAmount(participant);
        const paymentAmount = action.payload.amount ?? remainingDue;
        const nextPaidAmount = Math.min(
          participant.allocatedAmount,
          previousPaid + paymentAmount,
        );
        const isFullyPaid = nextPaidAmount >= participant.allocatedAmount - 0.001;

        const updatedPlans = state.plans.map((entry) =>
          entry.id === plan.id
            ? {
                ...entry,
                participants: entry.participants.map((entryParticipant) =>
                  entryParticipant.id === participant.id
                    ? {
                        ...entryParticipant,
                        status: isFullyPaid
                          ? ("PAID" as const)
                          : ("PENDING" as const),
                        paidAmount: nextPaidAmount,
                        paidAt: now(),
                      }
                    : entryParticipant,
                ),
              }
            : entry,
        );

        const recordedAmount = Math.min(paymentAmount, remainingDue);
        const paymentId = `pi_demo_${createToken()}`;
        const ledgerEntry = createLedgerEntry({
          bookingId: plan.bookingId,
          amount: recordedAmount,
          payerName: participant.name,
          payerEmail: participant.email,
          method: "NAMED_PARTICIPANT",
          methodLabel: "Named participant link",
          participantId: participant.id,
          plan,
          paymentId,
        });

        return {
          ...state,
          plans: updatedPlans,
          paymentLedger: [ledgerEntry, ...state.paymentLedger],
          activities: addActivity(
            state.activities,
            plan.bookingId,
            "PAYMENT_SUCCESS",
            previousPaid > 0
              ? `${participant.name} paid a top-up of €${recordedAmount.toFixed(2)} (total paid €${nextPaidAmount.toFixed(2)}).`
              : `${participant.name} paid €${nextPaidAmount.toFixed(2)}.`,
          ),
          notifications: addNotification(state.notifications, {
            bookingId: plan.bookingId,
            recipient: participant.email,
            type: "RECEIPT",
            message: `Payment receipt sent to ${participant.name}.`,
          }),
        };
      }

      if (kind === "equal_share") {
        const slotsRemaining =
          (plan.equalShareCount ?? 0) - getEqualSharePaidCount(plan);
        const remainingBalance =
          plan.bookingTotal - getTotalCollectedForPlan(plan);
        if (
          slotsRemaining <= 0 ||
          !plan.equalShareAmount ||
          plan.equalShareAmount > remainingBalance + 0.001
        ) {
          return state;
        }

        const amount = plan.equalShareAmount;
        const payerName =
          action.payload.payerName?.trim() || "Anonymous payer";
        const payerEmail =
          action.payload.payerEmail?.trim() || "anonymous@demo.local";
        const paymentId = `pi_demo_${createToken()}`;

        const contributor = {
          id: createId(),
          name: payerName,
          email: payerEmail,
          amount,
          paidAt: now(),
          planVersion: plan.version,
          paymentId,
          viaEqualShare: true as const,
        };

        const ledgerEntry = createLedgerEntry({
          bookingId: plan.bookingId,
          amount,
          payerName,
          payerEmail,
          method: "EQUAL_SHARE",
          methodLabel: "Equal share link",
          plan,
          paymentId,
        });

        const updatedPlans = state.plans.map((entry) =>
          entry.id === plan.id
            ? {
                ...entry,
                contributors: [...entry.contributors, contributor],
                participants: upsertLinkPayerParticipant(
                  entry,
                  payerName,
                  payerEmail,
                  amount,
                  "EQUAL_SHARE",
                ),
              }
            : entry,
        );

        return {
          ...state,
          plans: updatedPlans,
          paymentLedger: [ledgerEntry, ...state.paymentLedger],
          activities: addActivity(
            state.activities,
            plan.bookingId,
            "PAYMENT_SUCCESS",
            `${contributor.name} paid equal share €${amount.toFixed(2)} (${getEqualSharePaidCount(plan) + 1}/${plan.equalShareCount}).`,
          ),
          notifications: addNotification(state.notifications, {
            bookingId: plan.bookingId,
            recipient: contributor.email,
            type: "RECEIPT",
            message: `Payment receipt sent to ${contributor.name}.`,
          }),
        };
      }

      const openAvailable = getOpenContributionAvailable(plan);
      const amount = action.payload.amount ?? openAvailable;
      if (amount <= 0 || amount > openAvailable) return state;
      const paymentId = `pi_demo_${createToken()}`;
      const contributor = {
        id: createId(),
        name: action.payload.payerName?.trim() || "Anonymous Contributor",
        email: action.payload.payerEmail?.trim() || "anonymous@demo.local",
        amount,
        paidAt: now(),
        planVersion: plan.version,
        paymentId,
      };

      const ledgerEntry = createLedgerEntry({
        bookingId: plan.bookingId,
        amount,
        payerName: contributor.name,
        payerEmail: contributor.email,
        method: "OPEN_LINK",
        methodLabel: "Open contribution link",
        plan,
        paymentId,
      });

      const updatedPlans = state.plans.map((entry) =>
        entry.id === plan.id
          ? {
              ...entry,
              contributors: [...entry.contributors, contributor],
              participants: upsertLinkPayerParticipant(
                entry,
                contributor.name,
                contributor.email,
                amount,
                "OPEN_LINK",
              ),
            }
          : entry,
      );

      return {
        ...state,
        plans: updatedPlans,
        paymentLedger: [ledgerEntry, ...state.paymentLedger],
        activities: addActivity(
          state.activities,
          plan.bookingId,
          "PAYMENT_SUCCESS",
          `${contributor.name} contributed €${amount.toFixed(2)} via open link.`,
        ),
        notifications: addNotification(state.notifications, {
          bookingId: plan.bookingId,
          recipient: contributor.email,
          type: "RECEIPT",
          message: `Payment receipt sent to ${contributor.name}.`,
        }),
      };
    }

    case "PAYMENT_FAILED": {
      const plan = state.plans.find(
        (entry) =>
          entry.status === "PUBLISHED" &&
          (entry.participants.some(
            (participant) => participant.linkToken === action.payload.token,
          ) ||
            entry.openLinkToken === action.payload.token ||
            entry.equalShareLinkToken === action.payload.token),
      );
      if (!plan) return state;

      return {
        ...state,
        activities: addActivity(
          state.activities,
          plan.bookingId,
          "PAYMENT_FAILED",
          "A payment attempt failed. Outstanding balance unchanged.",
        ),
      };
    }

    case "SEND_REMINDERS": {
      const plan = getActivePlan(state, action.payload.bookingId);
      if (!plan) return state;

      const pending = plan.participants.filter(
        (participant) => participant.status === "PENDING",
      );
      if (pending.length === 0) return state;

      return {
        ...state,
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "REMINDER_SENT",
          `Reminders sent to ${pending.length} pending participant(s).`,
        ),
        notifications: pending.reduce(
          (notifications, participant) =>
            addNotification(notifications, {
              bookingId: action.payload.bookingId,
              recipient: participant.email,
              type: "REMINDER",
              message: `Payment reminder sent to ${participant.name}.`,
            }),
          state.notifications,
        ),
      };
    }

    case "SEND_INVITATIONS": {
      const plan = getActivePlan(state, action.payload.bookingId);
      if (!plan) return state;

      return {
        ...state,
        activities: addActivity(
          state.activities,
          action.payload.bookingId,
          "INVITATION_SENT",
          `Invitations resent to ${plan.participants.length} participant(s).`,
        ),
        notifications: plan.participants.reduce(
          (notifications, participant) =>
            addNotification(notifications, {
              bookingId: action.payload.bookingId,
              recipient: participant.email,
              type: "INVITATION",
              message: `Contribution invitation resent to ${participant.name}.`,
            }),
          state.notifications,
        ),
      };
    }

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload.notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      };

    case "UPDATE_PARTICIPANT_AMOUNT": {
      const workingPlan =
        getDraftPlan(state, action.payload.bookingId) ??
        getActivePlan(state, action.payload.bookingId);
      if (!workingPlan) return state;

      const participant = workingPlan.participants.find(
        (entry) => entry.id === action.payload.participantId,
      );
      if (
        !participant ||
        participant.status === "CANCELLED" ||
        participant.status === "EXPIRED"
      ) {
        return state;
      }

      const inputAmount = action.payload.amount;
      if (!Number.isFinite(inputAmount) || inputAmount < 0) return state;

      const previousAmount = participant.allocatedAmount;
      const paidAmount = getParticipantPaidAmount(participant);
      const hasPaidPortion = paidAmount > 0.001;

      // Already paid (fully or partially): entered amount is an ADDITIONAL
      // top-up. Paid credit stays; new outstanding = entered amount.
      // Example: paid €20, enter €20 → allocation €40, due €20, new link.
      const additionalAmount = hasPaidPortion ? inputAmount : undefined;
      const newAmount = hasPaidPortion
        ? paidAmount + inputAmount
        : inputAmount;

      if (Math.abs(previousAmount - newAmount) < 0.001 && !hasPaidPortion) {
        return state;
      }

      // Re-charging the same additional amount is allowed even if totals match.
      if (
        hasPaidPortion &&
        Math.abs(previousAmount - newAmount) < 0.001 &&
        inputAmount <= 0
      ) {
        return state;
      }

      const remainingDue = Math.max(newAmount - paidAmount, 0);
      const historyEntry = {
        id: createId(),
        previousAmount,
        newAmount,
        previousPaidAmount: paidAmount > 0 ? paidAmount : undefined,
        additionalAmount,
        changedAt: now(),
        note: action.payload.note,
      };

      const updatedParticipant: Participant = {
        ...participant,
        allocatedAmount: newAmount,
        paidAmount: paidAmount > 0 ? paidAmount : undefined,
        status: remainingDue > 0.001 ? "PENDING" : "PAID",
        linkToken:
          remainingDue > 0.001 ? createToken() : participant.linkToken,
        source: participant.source ?? "MANUAL",
        amountHistory: [...(participant.amountHistory ?? []), historyEntry],
      };

      const applyAmountUpdate = (plan: ContributionPlan): ContributionPlan => ({
        ...plan,
        participants: plan.participants.map((entry) =>
          entry.id === participant.id ? updatedParticipant : entry,
        ),
      });

      const activityMessage = hasPaidPortion
        ? `${participant.name}: additional €${inputAmount.toFixed(2)} outstanding created (paid €${paidAmount.toFixed(2)} kept; new total €${newAmount.toFixed(2)}).`
        : `${participant.name}'s contribution amount changed from €${previousAmount.toFixed(2)} to €${newAmount.toFixed(2)}.`;

      if (workingPlan.status === "DRAFT") {
        return {
          ...state,
          plans: state.plans.map((plan) =>
            plan.id === workingPlan.id ? applyAmountUpdate(plan) : plan,
          ),
          activities: addActivity(
            state.activities,
            action.payload.bookingId,
            "AMOUNT_CHANGED",
            activityMessage,
            { participantId: participant.id },
          ),
        };
      }

      const nextVersion = workingPlan.version + 1;
      const nextPlan: ContributionPlan = {
        ...applyAmountUpdate(workingPlan),
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        participants: workingPlan.participants.map((entry) =>
          entry.id === participant.id
            ? { ...updatedParticipant, planVersion: nextVersion }
            : {
                ...entry,
                planVersion: nextVersion,
                linkToken:
                  entry.status === "PENDING" ? createToken() : entry.linkToken,
              },
        ),
        openLinkToken: planHasOpenLink(workingPlan.mode)
          ? createToken()
          : undefined,
        equalShareLinkToken: planHasEqualShare(workingPlan.mode)
          ? createToken()
          : undefined,
      };

      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          published.activities,
          action.payload.bookingId,
          "AMOUNT_CHANGED",
          `${activityMessage} Plan updated to v${nextVersion} with a new payment link.`,
          { participantId: participant.id, version: nextVersion },
        ),
        notifications: published.notifications,
      };
    }

    case "REDISTRIBUTE_PARTICIPANTS_EQUAL":
    case "REDISTRIBUTE_PARTICIPANTS_MANUAL": {
      const workingPlan =
        getDraftPlan(state, action.payload.bookingId) ??
        getActivePlan(state, action.payload.bookingId);
      if (!workingPlan || !planSupportsNamedParticipants(workingPlan.mode)) {
        return state;
      }

      const activeParticipants = workingPlan.participants.filter(
        (participant) =>
          participant.status !== "CANCELLED" &&
          participant.status !== "EXPIRED",
      );
      const pendingParticipants = activeParticipants.filter(
        (participant) => participant.status === "PENDING",
      );
      const paidParticipants = activeParticipants.filter(
        (participant) => participant.status === "PAID",
      );
      const includePaid = Boolean(action.payload.includePaidParticipants);
      const openCollected = getCollectedFromContributors(
        workingPlan.contributors,
      );
      const paidCollected = getCollectedFromParticipants(activeParticipants);

      const redistributionTargets = includePaid
        ? activeParticipants
        : pendingParticipants;

      const redistributionPool = includePaid
        ? Math.max(workingPlan.bookingTotal - openCollected, 0)
        : Math.max(workingPlan.bookingTotal - paidCollected - openCollected, 0);

      if (redistributionTargets.length === 0 || redistributionPool < 0) {
        return state;
      }

      if (!includePaid && redistributionPool <= 0) {
        return state;
      }

      let updatedTargets: Participant[];

      if (action.type === "REDISTRIBUTE_PARTICIPANTS_MANUAL") {
        const allocationMap = new Map(
          action.payload.allocations.map((allocation) => [
            allocation.participantId,
            allocation.amount,
          ]),
        );
        const manualTotal = action.payload.allocations.reduce(
          (total, allocation) => total + allocation.amount,
          0,
        );

        if (
          action.payload.allocations.some((allocation) => allocation.amount < 0) ||
          manualTotal - redistributionPool > 0.01
        ) {
          return state;
        }

        updatedTargets = redistributionTargets.map((participant) => {
          const allocatedAmount =
            allocationMap.get(participant.id) ?? participant.allocatedAmount;
          const paidAmount = getParticipantPaidAmount(participant);
          const remainingDue = Math.max(allocatedAmount - paidAmount, 0);
          const previousAmount = participant.allocatedAmount;
          const historyEntry =
            Math.abs(previousAmount - allocatedAmount) > 0.001
              ? {
                  id: createId(),
                  previousAmount,
                  newAmount: allocatedAmount,
                  previousPaidAmount: paidAmount > 0 ? paidAmount : undefined,
                  changedAt: now(),
                  note: includePaid
                    ? "Redistributed (including paid participants)"
                    : "Redistributed among pending participants",
                }
              : null;

          return {
            ...participant,
            allocatedAmount,
            paidAmount: paidAmount > 0 ? paidAmount : undefined,
            status: remainingDue > 0.001 ? ("PENDING" as const) : ("PAID" as const),
            linkToken: remainingDue > 0.001 ? createToken() : participant.linkToken,
            amountHistory: historyEntry
              ? [...(participant.amountHistory ?? []), historyEntry]
              : participant.amountHistory,
          };
        });
      } else {
        const amounts = distributeEqually(
          redistributionPool,
          redistributionTargets.length,
        );
        updatedTargets = redistributionTargets.map((participant, index) => {
          const allocatedAmount = amounts[index] ?? 0;
          const paidAmount = getParticipantPaidAmount(participant);
          const remainingDue = Math.max(allocatedAmount - paidAmount, 0);
          const previousAmount = participant.allocatedAmount;
          const historyEntry =
            Math.abs(previousAmount - allocatedAmount) > 0.001
              ? {
                  id: createId(),
                  previousAmount,
                  newAmount: allocatedAmount,
                  previousPaidAmount: paidAmount > 0 ? paidAmount : undefined,
                  changedAt: now(),
                  note: includePaid
                    ? "Equal redistribute (including paid)"
                    : "Equal redistribute (pending only)",
                }
              : null;

          return {
            ...participant,
            allocatedAmount,
            paidAmount: paidAmount > 0 ? paidAmount : undefined,
            status: remainingDue > 0.001 ? ("PENDING" as const) : ("PAID" as const),
            linkToken: remainingDue > 0.001 ? createToken() : participant.linkToken,
            amountHistory: historyEntry
              ? [...(participant.amountHistory ?? []), historyEntry]
              : participant.amountHistory,
          };
        });
      }

      const targetIds = new Set(updatedTargets.map((participant) => participant.id));
      const preservedPaid = includePaid
        ? []
        : paidParticipants;
      const nextParticipants = [
        ...preservedPaid,
        ...updatedTargets,
        ...workingPlan.participants.filter(
          (participant) =>
            (participant.status === "CANCELLED" ||
              participant.status === "EXPIRED") &&
            !targetIds.has(participant.id),
        ),
      ];

      // Keep original order where possible for active participants.
      const nextById = new Map(
        nextParticipants.map((participant) => [participant.id, participant]),
      );
      const orderedParticipants = workingPlan.participants.map(
        (participant) => nextById.get(participant.id) ?? participant,
      );

      const scopeLabel = includePaid
        ? "all participants (including those who already paid)"
        : "pending participants";

      if (workingPlan.status === "DRAFT") {
        return {
          ...state,
          plans: state.plans.map((plan) =>
            plan.id === workingPlan.id
              ? { ...plan, participants: orderedParticipants }
              : plan,
          ),
          activities: addActivity(
            state.activities,
            action.payload.bookingId,
            "RECALCULATION",
            `Participant amounts redistributed across ${scopeLabel}.`,
          ),
        };
      }

      const nextVersion = workingPlan.version + 1;
      const nextPlan: ContributionPlan = {
        ...workingPlan,
        id: createId(),
        version: nextVersion,
        status: "DRAFT",
        createdAt: now(),
        publishedAt: undefined,
        participants: orderedParticipants.map((participant) => ({
          ...participant,
          planVersion: nextVersion,
        })),
        openLinkToken: planHasOpenLink(workingPlan.mode)
          ? createToken()
          : undefined,
        equalShareLinkToken: planHasEqualShare(workingPlan.mode)
          ? createToken()
          : undefined,
      };

      const supersededPlans = supersedePublishedPlans(
        state.plans,
        action.payload.bookingId,
      );
      const published = publishDraftPlan(
        { ...state, plans: [...supersededPlans, nextPlan] },
        action.payload.bookingId,
        nextPlan,
      );

      return {
        ...state,
        plans: published.plans,
        activities: addActivity(
          published.activities,
          action.payload.bookingId,
          "RECALCULATION",
          `Participant amounts redistributed across ${scopeLabel} in plan v${nextVersion}. Previous links invalidated.`,
          { version: nextVersion, includePaidParticipants: includePaid },
        ),
        notifications: published.notifications,
      };
    }

    default:
      return state;
  }
};
