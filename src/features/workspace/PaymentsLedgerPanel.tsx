import { formatCurrency } from "../../lib/money";
import { formatDateTime } from "../../lib/format";
import type { ContributionPlan } from "../../types";
import {
  getPlanMetrics,
  getUnifiedPaymentRows,
  useContributionStore,
} from "../../store";
import { Money, StatusBadge } from "../../components/shared";
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui";

type PaymentsLedgerPanelProps = {
  bookingId: number;
  plan: ContributionPlan | null;
};

export const PaymentsLedgerPanel = ({
  bookingId,
  plan,
}: PaymentsLedgerPanelProps) => {
  const { state } = useContributionStore();
  const rows = getUnifiedPaymentRows(state, bookingId, plan);
  const metrics = getPlanMetrics(plan);
  const completed = rows.filter((row) => row.status === "COMPLETED");
  const pending = rows.filter((row) => row.status === "PENDING");
  const cancelled = rows.filter((row) => row.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            Central payment ledger
          </h3>
          <p className="text-sm text-slate-500">
            Every completed payment is recorded here permanently — switching
            contribution type never deletes money history.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total collected</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                <Money amount={metrics.totalCollected} />
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Remaining</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                <Money amount={metrics.remainingBalance} />
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Completed payments</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {completed.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">
            All payers & participants
          </h3>
          <p className="text-sm text-slate-500">
            Named links, equal share links, and open contributions in one place.
            {pending.length > 0
              ? ` ${pending.length} awaiting payment.`
              : ""}
            {cancelled.length > 0
              ? ` ${cancelled.length} archived from earlier plan versions.`
              : ""}
          </p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No payments or participants recorded yet.
            </p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Payer</TableHeaderCell>
                  <TableHeaderCell>Method</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>When / plan</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900">
                        {row.payerName}
                      </p>
                      <p className="text-slate-500">{row.payerEmail}</p>
                    </TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell>
                      {row.amount > 0
                        ? formatCurrency(row.amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <p>
                        {row.paidAt ? formatDateTime(row.paidAt) : "—"}
                      </p>
                      <p className="text-slate-500">v{row.planVersion}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
