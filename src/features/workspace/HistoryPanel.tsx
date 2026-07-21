import type { ActivityEvent } from "../../types";
import { Card, CardContent, CardHeader, Timeline } from "../../components/ui";

type HistoryPanelProps = {
  activities: ActivityEvent[];
};

export const HistoryPanel = ({ activities }: HistoryPanelProps) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">
          Contribution timeline
        </h3>
        <p className="text-sm text-slate-500">
          Complete audit trail of plan changes, payments, and notifications.
        </p>
      </CardHeader>
      <CardContent>
        <Timeline events={activities} />
      </CardContent>
    </Card>
  </div>
);
