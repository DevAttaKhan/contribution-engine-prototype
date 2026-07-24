import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { formatDate, formatTime } from "../../lib/format";
import { formatCurrency } from "../../lib/money";
import {
  getBookingById,
  getEqualShareSlotsRemaining,
  getOpenContributionAvailable,
  getParticipantRemainingDue,
  getPlanMetrics,
  resolveLinkToken,
  useContributionStore,
} from "../../store";
import { Money } from "../../components/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Field,
  Input,
} from "../../components/ui";

export const PreCheckoutPage = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { state } = useContributionStore();
  const resolution = resolveLinkToken(state, token);
  const [openAmount, setOpenAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");

  const booking = resolution
    ? getBookingById(state, resolution.bookingId)
    : null;

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

  const metrics = getPlanMetrics(resolution.plan);
  const openAvailable = getOpenContributionAvailable(resolution.plan);
  const isOpen = resolution.kind === "open";
  const isEqualShare = resolution.kind === "equal_share";
  const equalShareAmount = resolution.plan.equalShareAmount ?? 0;
  const equalSlotsRemaining = getEqualShareSlotsRemaining(resolution.plan);

  const contributionAmount =
    resolution.kind === "participant"
      ? getParticipantRemainingDue(resolution.participant)
      : isEqualShare
        ? equalShareAmount
        : metrics.remainingBalance;

  const amount = isOpen ? Number(openAmount) || 0 : contributionAmount;

  const handleContinue = () => {
    if (isEqualShare) {
      if (!payerName.trim() || !payerEmail.trim()) return;
      if (equalSlotsRemaining <= 0) return;
      navigate(`/contribute/${token}/checkout`, {
        state: {
          amount: equalShareAmount,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
        },
      });
      return;
    }

    if (isOpen) {
      if (amount <= 0 || amount > openAvailable) return;
      if (!payerName.trim() || !payerEmail.trim()) return;
      navigate(`/contribute/${token}/checkout`, {
        state: {
          amount,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim(),
        },
      });
      return;
    }

    navigate(`/contribute/${token}/checkout`, {
      state: { amount, payerName: "", payerEmail: "" },
    });
  };

  const continueDisabled = isEqualShare
    ? !payerName.trim() || !payerEmail.trim() || equalSlotsRemaining <= 0
    : isOpen
      ? amount <= 0 ||
        amount > openAvailable ||
        !payerName.trim() ||
        !payerEmail.trim()
      : contributionAmount <= 0;

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
              {formatDate(booking.trip_date)} at{" "}
              {formatTime(booking.pickup_time)}
            </p>
            <p className="mt-2">
              Outstanding balance: <Money amount={metrics.remainingBalance} />
            </p>
          </div>

          {isEqualShare ? (
            <>
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-sm text-primary-700">Equal share amount</p>
                <p className="mt-1 text-3xl font-bold text-primary-900">
                  {formatCurrency(equalShareAmount)}
                </p>
                <p className="mt-1 text-sm text-primary-700">
                  {equalSlotsRemaining} of {resolution.plan.equalShareCount}{" "}
                  slots remaining
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="equal-payer-name" label="Your name">
                  <Input
                    id="equal-payer-name"
                    onChange={(event) => setPayerName(event.target.value)}
                    required
                    value={payerName}
                  />
                </Field>
                <Field htmlFor="equal-payer-email" label="Email">
                  <Input
                    id="equal-payer-email"
                    onChange={(event) => setPayerEmail(event.target.value)}
                    required
                    type="email"
                    value={payerEmail}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {isOpen ? (
            <>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="open-payer-name" label="Your name">
                  <Input
                    id="open-payer-name"
                    onChange={(event) => setPayerName(event.target.value)}
                    required
                    value={payerName}
                  />
                </Field>
                <Field htmlFor="open-payer-email" label="Email">
                  <Input
                    id="open-payer-email"
                    onChange={(event) => setPayerEmail(event.target.value)}
                    required
                    type="email"
                    value={payerEmail}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {resolution.kind === "participant" ? (
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
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button disabled={continueDisabled} onClick={handleContinue}>
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
