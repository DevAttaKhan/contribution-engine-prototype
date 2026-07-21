import { formatDateTime } from "../../lib/format";
import type { ActivityEvent } from "../../types";
import { cn } from "../../lib/cn";

type TimelineProps = {
  events: ActivityEvent[];
  className?: string;
};

export const Timeline = ({ events, className }: TimelineProps) => {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">No activity recorded yet.</p>
    );
  }

  return (
    <ol className={cn("space-y-4", className)}>
      {events.map((event) => (
        <li
          key={event.id}
          className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 pl-8"
        >
          <span
            aria-hidden="true"
            className="absolute left-3 top-5 h-2 w-2 rounded-full bg-primary-500"
          />
          <p className="text-sm font-medium text-slate-900">{event.message}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(event.timestamp)} · {event.type.replaceAll("_", " ")}
          </p>
        </li>
      ))}
    </ol>
  );
};
