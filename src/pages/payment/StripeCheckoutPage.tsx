import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { formatCurrency } from "../../lib/money";
import {
  getParticipantRemainingDue,
  resolveLinkToken,
  useContributionStore,
} from "../../store";
import { Button, Card, CardContent, CardHeader, Field, Input } from "../../components/ui";

export const StripeCheckoutPage = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useContributionStore();
  const resolution = resolveLinkToken(state, token);

  const locationState = location.state as
    | { amount: number; payerName?: string; payerEmail?: string }
    | undefined;

  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [payerName, setPayerName] = useState(locationState?.payerName ?? "");
  const [payerEmail, setPayerEmail] = useState(locationState?.payerEmail ?? "");

  const amount =
    locationState?.amount ??
    (resolution?.kind === "participant"
      ? getParticipantRemainingDue(resolution.participant)
      : 0);

  const handlePay = () => {
    if (simulateFailure) {
      dispatch({ type: "PAYMENT_FAILED", payload: { token } });
      navigate(`/contribute/${token}/failed`);
      return;
    }

    dispatch({
      type: "PAYMENT_SUCCESS",
      payload: {
        token,
        amount,
        payerName: payerName || undefined,
        payerEmail: payerEmail || undefined,
      },
    });
    navigate(`/contribute/${token}/success`);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full overflow-hidden">
        <div className="bg-[#635bff] px-6 py-5 text-white">
          <p className="text-sm opacity-90">Stripe Checkout (demo)</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(amount)}</p>
        </div>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">
            Secure payment
          </h1>
          <p className="text-sm text-slate-500">
            This is a simulated Stripe experience for the prototype.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {resolution?.kind === "open" ? (
            <>
              <Field htmlFor="payer-name" label="Your name">
                <Input
                  id="payer-name"
                  onChange={(event) => setPayerName(event.target.value)}
                  value={payerName}
                />
              </Field>
              <Field htmlFor="payer-email" label="Email">
                <Input
                  id="payer-email"
                  onChange={(event) => setPayerEmail(event.target.value)}
                  type="email"
                  value={payerEmail}
                />
              </Field>
            </>
          ) : null}
          <Field htmlFor="card-number" label="Card number">
            <Input
              id="card-number"
              onChange={(event) => setCardNumber(event.target.value)}
              value={cardNumber}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              checked={simulateFailure}
              onChange={(event) => setSimulateFailure(event.target.checked)}
              type="checkbox"
            />
            Simulate failed payment
          </label>
          <Button className="w-full" onClick={handlePay}>
            Pay {formatCurrency(amount)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
