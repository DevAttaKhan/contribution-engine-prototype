import { Link } from "react-router";
import { Button } from "../components/ui";

export const NotFoundPage = () => (
  <section className="mx-auto max-w-lg py-20 text-center">
    <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
      404 error
    </p>
    <h1 className="mt-2 text-4xl font-bold text-slate-900">Page not found</h1>
    <p className="mt-3 text-slate-600">
      The page you requested does not exist in this prototype.
    </p>
    <Link className="mt-6 inline-block" to="/">
      <Button>Return to bookings</Button>
    </Link>
  </section>
);
