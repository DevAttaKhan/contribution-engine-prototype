export type ContributionMode =
  | "EQUAL_SPLIT"
  | "OPEN"
  | "HYBRID"
  | "EQUAL_SHARE";
export type PlanStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";
export type ParticipantStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export type BookingUser = {
  id: number;
  name: string | null;
  contact_number: string | null;
  email: string;
  institute_name: string | null;
};

export type BookingTransaction = {
  id: number;
  payment_type: string;
  payment_id: string | null;
  total_amount: string;
  admin_message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  quotation: number;
};

export type Booking = {
  quote_id: number;
  created_at: string;
  school: string | null;
  pickup: string;
  dropoff: string;
  trip_date: string;
  pickup_time: string;
  passengers: number;
  price: number;
  status: string;
  sub_status: string | null;
  teacher_incharge: string | null;
  user: BookingUser;
  transactions: BookingTransaction[];
};

export type Participant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  allocatedAmount: number;
  status: ParticipantStatus;
  linkToken: string;
  paidAmount?: number;
  paidAt?: string;
  planVersion: number;
};

export type Contributor = {
  id: string;
  name: string;
  email: string;
  amount: number;
  paidAt: string;
  planVersion: number;
  paymentId: string;
  viaEqualShare?: boolean;
};

/** Immutable payment record — never deleted when contribution mode changes. */
export type PaymentLedgerEntry = {
  id: string;
  bookingId: number;
  amount: number;
  payerName: string;
  payerEmail: string;
  paidAt: string;
  method: "NAMED_PARTICIPANT" | "OPEN_LINK" | "EQUAL_SHARE";
  methodLabel: string;
  participantId?: string;
  planId: string;
  planVersion: number;
  planMode: ContributionMode;
  paymentId: string;
};

export type ContributionPlan = {
  id: string;
  bookingId: number;
  version: number;
  mode: ContributionMode;
  status: PlanStatus;
  bookingTotal: number;
  participants: Participant[];
  openLinkToken?: string;
  equalShareCount?: number;
  equalShareAmount?: number;
  equalShareLinkToken?: string;
  contributors: Contributor[];
  createdAt: string;
  publishedAt?: string;
};

export type ActivityType =
  | "PLAN_CREATED"
  | "PLAN_PUBLISHED"
  | "PARTICIPANT_ADDED"
  | "PARTICIPANT_REMOVED"
  | "RECALCULATION"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "LINK_GENERATED"
  | "LINK_INVALIDATED"
  | "BOOKING_UPDATED"
  | "REMINDER_SENT"
  | "INVITATION_SENT"
  | "MODE_CHANGED";

export type ActivityEvent = {
  id: string;
  bookingId: number;
  type: ActivityType;
  message: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
};

export type NotificationType = "INVITATION" | "REMINDER" | "RECEIPT";

export type AppNotification = {
  id: string;
  bookingId: number;
  recipient: string;
  type: NotificationType;
  message: string;
  sentAt: string;
  read: boolean;
};

export type Pagination = {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
};

export type LinkResolution =
  | {
      kind: "participant";
      bookingId: number;
      plan: ContributionPlan;
      participant: Participant;
    }
  | {
      kind: "open";
      bookingId: number;
      plan: ContributionPlan;
    }
  | {
      kind: "equal_share";
      bookingId: number;
      plan: ContributionPlan;
    }
  | null;

export type PlanMetrics = {
  bookingTotal: number;
  totalCollected: number;
  remainingBalance: number;
  contributionPercentage: number;
  paidParticipants: number;
  pendingParticipants: number;
  openContributions: number;
  equalSharePaidSlots?: number;
  equalShareTotalSlots?: number;
};

export type ParticipantInput = {
  name: string;
  email: string;
  phone?: string;
  allocatedAmount?: number;
};

export type ManualAllocation = {
  participantId: string;
  amount: number;
};
