import {
  CircleDollarSign,
  Clock3,
  Percent,
  Users,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "../../lib/money";
import type { Booking, ContributionPlan } from "../../types";
import { getPlanMetrics } from "../../store";
import { Money, StatusBadge } from "../../components/shared";
import { Button, Card, CardContent, CardHeader, ProgressBar, StatCard } from "../../components/ui";

type BookingOverviewProps = {
  booking: Booking;
  plan: ContributionPlan | null;
  onSendReminders: () => void;
  onSendInvitations: () => void;
};

export const BookingOverview = ({
  booking,
  plan,
  onSendReminders,
  onSendInvitations,
}: BookingOverviewProps) => {
  const metrics = getPlanMetrics(plan);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Booking #{booking.quote_id}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {booking.pickup} → {booking.dropoff}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {booking.trip_date} at {booking.pickup_time} ·{" "}
                {booking.passengers} passengers
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Organiser</p>
              <p className="font-medium text-slate-900">
                {booking.user.name ?? booking.user.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">School</p>
              <p className="font-medium text-slate-900">
                {booking.school ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Teacher in charge</p>
              <p className="font-medium text-slate-900">
                {booking.teacher_incharge ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {plan ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              hint="Total booking value"
              icon={Wallet}
              label="Booking total"
              value={formatCurrency(metrics.bookingTotal)}
            />
            <StatCard
              hint="Immutable completed payments"
              icon={CircleDollarSign}
              label="Total collected"
              value={formatCurrency(metrics.totalCollected)}
            />
            <StatCard
              hint="Still outstanding"
              icon={Clock3}
              label="Remaining balance"
              value={formatCurrency(metrics.remainingBalance)}
            />
            <StatCard
              icon={Users}
              label="Paid participants"
              value={String(metrics.paidParticipants)}
            />
            <StatCard
              icon={Users}
              label="Pending participants"
              value={String(metrics.pendingParticipants)}
            />
            <StatCard
              icon={Percent}
              label="Contribution progress"
              value={`${metrics.contributionPercentage.toFixed(0)}%`}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Contribution progress
                </h3>
                <p className="text-sm text-slate-500">
                  Plan v{plan.version} · {plan.mode.replaceAll("_", " ")} ·{" "}
                  {plan.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onSendInvitations} variant="secondary">
                  Resend invitations
                </Button>
                <Button onClick={onSendReminders} variant="secondary">
                  Send reminders
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProgressBar
                label="Collection progress"
                value={metrics.contributionPercentage}
              />
              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                <span>
                  Collected: <Money amount={metrics.totalCollected} />
                </span>
                <span>
                  Remaining: <Money amount={metrics.remainingBalance} />
                </span>
                <span>Open contributions: {metrics.openContributions}</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};
