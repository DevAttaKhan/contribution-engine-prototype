import type { ContributionPlan } from "../../types";
import { getPlanMetrics } from "../../store";
import { Money } from "../../components/shared";
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

type VersionHistoryPanelProps = {
  plans: ContributionPlan[];
};

export const VersionHistoryPanel = ({ plans }: VersionHistoryPanelProps) => (
  <Card>
    <CardHeader>
      <h3 className="text-lg font-semibold text-slate-900">Version history</h3>
      <p className="text-sm text-slate-500">
        Compare contribution allocations across every published plan version.
      </p>
    </CardHeader>
    <CardContent>
      {plans.length === 0 ? (
        <p className="text-sm text-slate-500">No contribution plans yet.</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Version</TableHeaderCell>
              <TableHeaderCell>Mode</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Collected</TableHeaderCell>
              <TableHeaderCell>Remaining</TableHeaderCell>
              <TableHeaderCell>Participants</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => {
              const metrics = getPlanMetrics(plan);

              return (
                <TableRow key={plan.id}>
                  <TableCell>v{plan.version}</TableCell>
                  <TableCell>{plan.mode.replaceAll("_", " ")}</TableCell>
                  <TableCell>{plan.status}</TableCell>
                  <TableCell>
                    <Money amount={metrics.totalCollected} />
                  </TableCell>
                  <TableCell>
                    <Money amount={metrics.remainingBalance} />
                  </TableCell>
                  <TableCell>{plan.participants.length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);
