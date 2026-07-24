import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { CreatePlanDialog } from "../features/plans/CreatePlanDialog";
import { BookingOverview } from "../features/workspace/BookingOverview";
import { ContributionLinksPanel } from "../features/workspace/ContributionLinksPanel";
import { HistoryPanel } from "../features/workspace/HistoryPanel";
import { ParticipantsPanel } from "../features/workspace/ParticipantsPanel";
import { PaymentsLedgerPanel } from "../features/workspace/PaymentsLedgerPanel";
import { RecalculatePanel } from "../features/workspace/RecalculatePanel";
import { VersionHistoryPanel } from "../features/workspace/VersionHistoryPanel";
import {
  getActivePlan,
  getActivitiesForBooking,
  getBookingById,
  getBookingTotal,
  getDraftPlan,
  getPlansForBooking,
  useContributionStore,
} from "../store";
import { Button, EmptyState, Tabs } from "../components/ui";

const workspaceTabs = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "participants", label: "Participants" },
  { id: "links", label: "Links" },
  { id: "recalculate", label: "Recalculate" },
  { id: "history", label: "History" },
];

export const BookingWorkspacePage = () => {
  const { quoteId } = useParams();
  const bookingId = Number(quoteId);
  const { state, dispatch } = useContributionStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  const booking = getBookingById(state, bookingId);
  const draftPlan = getDraftPlan(state, bookingId);
  const activePlan = getActivePlan(state, bookingId);
  const workingPlan = draftPlan ?? activePlan;
  const allPlans = getPlansForBooking(state, bookingId);
  const activities = getActivitiesForBooking(state, bookingId);

  const isDraft = workingPlan?.status === "DRAFT";

  const handleCreatePlan = (equalShareCount?: number) => {
    dispatch({
      type: "CREATE_PLAN",
      payload: { bookingId, equalShareCount },
    });
    setCreatePlanOpen(false);
    setActiveTab("links");
  };

  const handleAddParticipant = (participant: {
    name: string;
    email: string;
    phone?: string;
    allocatedAmount?: number;
  }) => {
    const email = participant.email.trim().toLowerCase();
    const duplicate = workingPlan?.participants.some(
      (entry) =>
        entry.email === email &&
        entry.status !== "CANCELLED" &&
        entry.status !== "EXPIRED",
    );

    if (duplicate) {
      setDuplicateError("A participant with this email already exists.");
      return;
    }

    setDuplicateError("");
    dispatch({
      type: "ADD_PARTICIPANT",
      payload: { bookingId, participant },
    });
  };

  const handleAddPublishedParticipant = (participant: {
    name: string;
    email: string;
    phone?: string;
    allocatedAmount?: number;
  }) => {
    const email = participant.email.trim().toLowerCase();
    const duplicate = workingPlan?.participants.some(
      (entry) =>
        entry.email === email &&
        entry.status !== "CANCELLED" &&
        entry.status !== "EXPIRED",
    );

    if (duplicate) {
      setDuplicateError("A participant with this email already exists.");
      return;
    }

    setDuplicateError("");
    dispatch({
      type: "ADD_PUBLISHED_PARTICIPANT",
      payload: { bookingId, participant },
    });
  };

  if (!booking) {
    return (
      <EmptyState
        action={
          <Link to="/">
            <Button>Back to bookings</Button>
          </Link>
        }
        description="The booking you requested does not exist in the demo dataset."
        icon={Wallet}
        title="Booking not found"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            to="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            Booking workspace
          </h2>
          <p className="mt-1 text-slate-600">
            Manage contribution plans for quote #{booking.quote_id}
          </p>
        </div>
        {!workingPlan ? (
          <Button onClick={() => setCreatePlanOpen(true)}>
            <Plus className="h-4 w-4" />
            Create contribution plan
          </Button>
        ) : null}
      </div>

      {!workingPlan ? (
        <EmptyState
          action={
            <Button onClick={() => setCreatePlanOpen(true)}>
              <Plus className="h-4 w-4" />
              Create contribution plan
            </Button>
          }
          description="One plan includes open, equal share, and named participant links. Add people and track all payers in one place."
          icon={Wallet}
          title="No contribution plan yet"
        />
      ) : (
        <>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={workspaceTabs}
          />

          {activeTab === "overview" ? (
            <BookingOverview
              booking={booking}
              onSendInvitations={() =>
                dispatch({ type: "SEND_INVITATIONS", payload: { bookingId } })
              }
              onSendReminders={() =>
                dispatch({ type: "SEND_REMINDERS", payload: { bookingId } })
              }
              plan={workingPlan}
            />
          ) : null}

          {activeTab === "payments" ? (
            <PaymentsLedgerPanel bookingId={bookingId} plan={workingPlan} />
          ) : null}

          {activeTab === "participants" ? (
            <ParticipantsPanel
              duplicateError={duplicateError}
              isDraft={isDraft}
              onAddParticipant={handleAddParticipant}
              onAddPublishedParticipant={handleAddPublishedParticipant}
              onPublish={() =>
                dispatch({ type: "PUBLISH_PLAN", payload: { bookingId } })
              }
              onRedistributeEqual={(includePaidParticipants) =>
                dispatch({
                  type: "REDISTRIBUTE_PARTICIPANTS_EQUAL",
                  payload: { bookingId, includePaidParticipants },
                })
              }
              onRedistributeManual={(allocations, includePaidParticipants) =>
                dispatch({
                  type: "REDISTRIBUTE_PARTICIPANTS_MANUAL",
                  payload: { bookingId, allocations, includePaidParticipants },
                })
              }
              onRemoveParticipant={(participantId) =>
                dispatch({
                  type: "REMOVE_PARTICIPANT",
                  payload: { bookingId, participantId },
                })
              }
              onRemovePublishedParticipant={(
                participantId,
                strategy,
                allocations,
              ) =>
                dispatch({
                  type: "REMOVE_PUBLISHED_PARTICIPANT",
                  payload: {
                    bookingId,
                    participantId,
                    strategy,
                    allocations,
                  },
                })
              }
              onUpdateParticipantAmount={(participantId, amount, note) =>
                dispatch({
                  type: "UPDATE_PARTICIPANT_AMOUNT",
                  payload: { bookingId, participantId, amount, note },
                })
              }
              plan={workingPlan}
            />
          ) : null}

          {activeTab === "links" ? (
            <ContributionLinksPanel
              isDraft={isDraft}
              onPublish={() =>
                dispatch({ type: "PUBLISH_PLAN", payload: { bookingId } })
              }
              onSetShareAmount={(amount) =>
                dispatch({
                  type: "SET_EQUAL_SHARE_AMOUNT",
                  payload: { bookingId, equalShareAmount: amount },
                })
              }
              onSetShareCount={(count) =>
                dispatch({
                  type: "SET_EQUAL_SHARE_COUNT",
                  payload: { bookingId, equalShareCount: count },
                })
              }
              plan={workingPlan}
            />
          ) : null}

          {activeTab === "recalculate" ? (
            <div className="space-y-6">
              <RecalculatePanel
                currentPrice={getBookingTotal(booking)}
                onRedistributeEqual={(includePaidParticipants) =>
                  dispatch({
                    type: "REDISTRIBUTE_PARTICIPANTS_EQUAL",
                    payload: { bookingId, includePaidParticipants },
                  })
                }
                onUpdateBookingPrice={(newBookingTotal) =>
                  dispatch({
                    type: "UPDATE_BOOKING",
                    payload: { bookingId, price: newBookingTotal },
                  })
                }
                plan={activePlan}
              />
              <VersionHistoryPanel plans={allPlans} />
            </div>
          ) : null}

          {activeTab === "history" ? (
            <HistoryPanel activities={activities} />
          ) : null}
        </>
      )}

      <CreatePlanDialog
        bookingTotal={getBookingTotal(booking)}
        onClose={() => setCreatePlanOpen(false)}
        onCreate={handleCreatePlan}
        open={createPlanOpen}
      />
    </div>
  );
};
