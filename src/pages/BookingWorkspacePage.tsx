import { ArrowLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { ContributionMode } from "../types";
import { CreatePlanDialog } from "../features/plans/CreatePlanDialog";
import { BookingOverview } from "../features/workspace/BookingOverview";
import { HistoryPanel } from "../features/workspace/HistoryPanel";
import { OpenContributionPanel } from "../features/workspace/OpenContributionPanel";
import { ParticipantsPanel } from "../features/workspace/ParticipantsPanel";
import { RecalculatePanel } from "../features/workspace/RecalculatePanel";
import { VersionHistoryPanel } from "../features/workspace/VersionHistoryPanel";
import {
  getActivePlan,
  getActivitiesForBooking,
  getBookingById,
  getDraftPlan,
  getPlansForBooking,
  useContributionStore,
} from "../store";
import { Button, EmptyState, Tabs } from "../components/ui";
import { Wallet } from "lucide-react";

const workspaceTabs = [
  { id: "overview", label: "Overview" },
  { id: "participants", label: "Participants" },
  { id: "open", label: "Open Link" },
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

  const visibleTabs = useMemo(() => {
    if (!workingPlan) return workspaceTabs.filter((tab) => tab.id === "overview");

    if (workingPlan.mode === "OPEN") {
      return workspaceTabs.filter((tab) => tab.id !== "participants");
    }

    return workspaceTabs;
  }, [workingPlan]);

  const handleCreatePlan = (mode: ContributionMode) => {
    dispatch({ type: "CREATE_PLAN", payload: { bookingId, mode } });
    setCreatePlanOpen(false);
    setActiveTab(mode === "OPEN" ? "open" : "participants");
  };

  const handleAddParticipant = (participant: {
    name: string;
    email: string;
    phone?: string;
    allocatedAmount?: number;
  }) => {
    const email = participant.email.trim().toLowerCase();
    const duplicate = workingPlan?.participants.some(
      (entry) => entry.email === email,
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
          description="Choose Equal Split, Open Contribution, or Hybrid to start collecting payments."
          icon={Wallet}
          title="No contribution plan yet"
        />
      ) : (
        <>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={visibleTabs}
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

          {activeTab === "participants" ? (
            <ParticipantsPanel
              duplicateError={duplicateError}
              isDraft={isDraft}
              onAddParticipant={handleAddParticipant}
              onPublish={() =>
                dispatch({ type: "PUBLISH_PLAN", payload: { bookingId } })
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
              plan={workingPlan}
            />
          ) : null}

          {activeTab === "open" ? (
            <div className="space-y-6">
              <OpenContributionPanel plan={workingPlan} />
              {isDraft && workingPlan.mode === "OPEN" ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      dispatch({ type: "PUBLISH_PLAN", payload: { bookingId } })
                    }
                  >
                    Publish open contribution plan
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "recalculate" ? (
            <div className="space-y-6">
              <RecalculatePanel
                currentPrice={booking.price}
                onRecalculateEqual={(newBookingTotal, includePaidParticipants) =>
                  dispatch({
                    type: "RECALCULATE_EQUAL",
                    payload: {
                      bookingId,
                      newBookingTotal,
                      includePaidParticipants,
                    },
                  })
                }
                onRecalculateManual={(
                  allocations,
                  newBookingTotal,
                  includePaidParticipants,
                ) =>
                  dispatch({
                    type: "RECALCULATE_MANUAL",
                    payload: {
                      bookingId,
                      allocations,
                      newBookingTotal,
                      includePaidParticipants,
                    },
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
        onClose={() => setCreatePlanOpen(false)}
        onCreate={handleCreatePlan}
        open={createPlanOpen}
      />
    </div>
  );
};
