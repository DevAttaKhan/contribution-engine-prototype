import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import type { ContributionPlan } from "../../types";
import { getPlanMetrics } from "../../store";
import { Money } from "../../components/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Field,
  Input,
} from "../../components/ui";

type RecalculatePanelProps = {
  plan: ContributionPlan | null;
  currentPrice: number;
  onUpdateBookingPrice: (newBookingTotal: number) => void;
  onRedistributeEqual: (includePaidParticipants: boolean) => void;
};

export const RecalculatePanel = ({
  plan,
  currentPrice,
  onUpdateBookingPrice,
  onRedistributeEqual,
}: RecalculatePanelProps) => {
  const [newPrice, setNewPrice] = useState(String(currentPrice));
  const [includePaidParticipants, setIncludePaidParticipants] = useState(false);
  const [alsoRedistribute, setAlsoRedistribute] = useState(false);

  const metrics = getPlanMetrics(plan);
  const priceValue = Number(newPrice) || 0;
  const previousTotal = plan?.bookingTotal ?? currentPrice;
  const priceIncreased = priceValue > previousTotal;
  const priceReduced = priceValue < previousTotal;

  const handleUpdatePrice = () => {
    const price = Number(newPrice);
    if (!plan || Number.isNaN(price) || price < 0) return;
    onUpdateBookingPrice(price);
    if (alsoRedistribute) {
      onRedistributeEqual(includePaidParticipants);
    }
  };

  if (!plan) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-slate-500">
            Create and publish a contribution plan before updating the booking
            total.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Update booking total
          </h3>
          <p className="text-sm text-slate-500">
            Change the quotation price when the booking total changes. Optionally
            redistribute participant amounts afterwards.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field htmlFor="new-price" label="Updated booking total (€)">
            <Input
              id="new-price"
              min="0"
              onChange={(event) => setNewPrice(event.target.value)}
              step="0.01"
              type="number"
              value={newPrice}
            />
          </Field>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Current collected: <Money amount={metrics.totalCollected} />
            </p>
            <p className="mt-1">
              Remaining balance after update:{" "}
              <Money amount={Math.max(priceValue - metrics.totalCollected, 0)} />
            </p>
            {priceReduced ? (
              <p className="mt-2 text-slate-500">
                When the price is reduced, completed payments stay unchanged.
              </p>
            ) : null}
            {priceIncreased ? (
              <p className="mt-2 text-slate-500">
                When the price increases, enable redistribute below to divide the
                new total across participants.
              </p>
            ) : null}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              checked={alsoRedistribute}
              className="mt-1"
              onChange={(event) => setAlsoRedistribute(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">
                Also redistribute participant amounts equally
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                After updating the booking total, divide amounts across
                participants.
              </span>
            </span>
          </label>

          {alsoRedistribute ? (
            <label className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4">
              <input
                checked={includePaidParticipants}
                className="mt-1"
                onChange={(event) =>
                  setIncludePaidParticipants(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Include participants who have already paid
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  Re-divide across everyone. Paid amounts stay as credit — they
                  only owe any top-up difference via a new payment link.
                </span>
              </span>
            </label>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={handleUpdatePrice}>
              <RefreshCcw className="h-4 w-4" />
              {alsoRedistribute
                ? "Update total and redistribute"
                : "Update booking total"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            When to use this tab
          </h3>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Quotation price changes after the plan is published</li>
            <li>Vehicle or route updates that affect the booking total</li>
            <li>
              For manual or advanced redistribution, use Participants →
              Recalculate
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
