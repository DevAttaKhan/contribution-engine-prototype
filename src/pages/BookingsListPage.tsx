import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { samplePagination } from "../data/sampleLeads";
import { formatDate, formatTime } from "../lib/format";
import { formatCurrency } from "../lib/money";
import {
  getActivePlan,
  getPlanMetrics,
  useContributionStore,
} from "../store";
import { StatusBadge } from "../components/shared";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/ui";
import { Bus } from "lucide-react";

const PAGE_SIZE = 10;

export const BookingsListPage = () => {
  const { state } = useContributionStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const filteredBookings = useMemo(() => {
    return state.bookings.filter((booking) => {
      const matchesSearch =
        search.trim() === "" ||
        [
          String(booking.quote_id),
          booking.pickup,
          booking.dropoff,
          booking.user.name,
          booking.user.email,
          booking.school,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(search.toLowerCase()),
          );

      const matchesStatus =
        statusFilter === "ALL" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, state.bookings, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
          Organiser dashboard
        </p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">Bookings</h2>
        <p className="mt-2 text-slate-600">
          Select a booking to create or manage its contribution plan.
        </p>
      </div>

      <Card>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_220px]">
          <Field htmlFor="booking-search" label="Search bookings">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id="booking-search"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by route, organiser, or quote ID"
                value={search}
              />
            </div>
          </Field>
          <Field htmlFor="booking-status" label="Status filter">
            <Select
              id="booking-status"
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
            </Select>
          </Field>
        </CardHeader>
        <CardContent>
          {paginatedBookings.length === 0 ? (
            <EmptyState
              description="Try adjusting your search or status filter."
              icon={Bus}
              title="No bookings found"
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Quote</TableHeaderCell>
                  <TableHeaderCell>Route</TableHeaderCell>
                  <TableHeaderCell>Trip</TableHeaderCell>
                  <TableHeaderCell>Organiser</TableHeaderCell>
                  <TableHeaderCell>Price</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Contribution</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBookings.map((booking) => {
                  const plan = getActivePlan(state, booking.quote_id);
                  const metrics = getPlanMetrics(plan);
                  const displayPrice =
                    booking.price > 0
                      ? booking.price
                      : Number(booking.transactions[0]?.total_amount ?? 0);

                  return (
                    <TableRow key={booking.quote_id}>
                      <TableCell>
                        <Link
                          className="font-semibold text-primary-600 hover:text-primary-700"
                          to={`/bookings/${booking.quote_id}`}
                        >
                          #{booking.quote_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">
                          {booking.pickup}
                        </p>
                        <p className="text-slate-500">→ {booking.dropoff}</p>
                      </TableCell>
                      <TableCell>
                        <p>{formatDate(booking.trip_date)}</p>
                        <p className="text-slate-500">
                          {formatTime(booking.pickup_time)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{booking.user.name ?? "—"}</p>
                        <p className="text-slate-500">{booking.user.email}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(displayPrice)}</TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="min-w-48">
                        {plan ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="info">
                                {plan.mode.replaceAll("_", " ")}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                v{plan.version}
                              </span>
                            </div>
                            <ProgressBar value={metrics.contributionPercentage} />
                          </div>
                        ) : (
                          <span className="text-slate-400">No plan</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} of{" "}
              {filteredBookings.length} bookings (demo total{" "}
              {samplePagination.totalItems})
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => value - 1)}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
