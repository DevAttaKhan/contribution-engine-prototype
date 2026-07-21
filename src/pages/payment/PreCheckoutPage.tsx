import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { formatDate, formatTime } from "../../lib/format";
import { formatCurrency } from "../../lib/money";
import {
  getBookingById,
  getOpenContributionAvailable,
  getParticipantRemainingDue,
  getPlanMetrics,
  resolveLinkToken,
  useContributionStore,
} from "../../store";
import { Money } from "../../components/shared";
import { Button, Card, CardContent, CardHeader, EmptyState, Field, Input } from "../../components/ui";

export const PreCheckoutPage = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { state } = useContributionStore();
  const resolution = resolveLinkToken(state, token);
  const [openAmount, setOpenAmount] = useState("");

  const booking = resolution
    ? getBookingById(state, resolution.bookingId)
    : null;

  const contributionAmount =
    resolution?.kind === "participant"
      ? getParticipantRemainingDue(resolution.participant)
      : resolution
        ? getPlanMetrics(resolution.plan).remainingBalance
        : 0;

  if (!resolution || !booking) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
        <EmptyState
          description="This contribution link is invalid or has been superseded by a newer plan version."
          icon={ShieldCheck}
          title="Link unavailable"
        />
      </div>
    );
  }

  const isOpen = resolution.kind === "open";
  const amount = isOpen ? Number(openAmount) || 0 : contributionAmount;
  const metrics = getPlanMetrics(resolution.plan);
  const openAvailable = getOpenContributionAvailable(resolution.plan);

  const handleContinue = () => {
    if (isOpen && (amount <= 0 || amount > openAvailable)) return;
    navigate(`/contribute/${token}/checkout`, {
      state: { amount, payerName: "", payerEmail: "" },
    });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
            Pre-checkout
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Review your contribution
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Confirm the details below before proceeding to secure payment.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Booking summary</p>
            <p className="mt-2">
              {booking.pickup} → {booking.dropoff}
            </p>
            <p>
              {formatDate(booking.trip_date)} at {formatTime(booking.pickup_time)}
            </p>
            <p className="mt-2">
              Outstanding balance: <Money amount={metrics.remainingBalance} />
            </p>
          </div>

          {isOpen ? (
            <Field
              hint={`Maximum available through this link: ${formatCurrency(openAvailable)}`}
              htmlFor="open-amount"
              label="Contribution amount"
            >
              <Input
                id="open-amount"
                max={openAvailable}
                min="1"
                onChange={(event) => setOpenAmount(event.target.value)}
                step="0.01"
                type="number"
                value={openAmount}
              />
            </Field>
          ) : (
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm text-primary-700">
                {resolution.participant.paidAmount &&
                resolution.participant.paidAmount > 0
                  ? "Top-up due"
                  : "Your contribution"}
              </p>
              <p className="mt-1 text-3xl font-bold text-primary-900">
                {formatCurrency(contributionAmount)}
              </p>
              <p className="mt-1 text-sm text-primary-700">
                For {resolution.participant.name}
                {resolution.participant.paidAmount &&
                resolution.participant.paidAmount > 0
                  ? ` · already paid ${formatCurrency(resolution.participant.paidAmount)} of ${formatCurrency(resolution.participant.allocatedAmount)}`
                  : ""}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={
                isOpen &&
                (amount <= 0 || amount > openAvailable)
              }
              onClick={handleContinue}
            >
              Continue to payment
            </Button>
            <Link to="/">
              <Button variant="secondary">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
