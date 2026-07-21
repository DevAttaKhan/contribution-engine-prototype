import { Link } from "react-router";

export const NotFoundPage = () => (
  <section className="space-y-4">
    <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
      404 error
    </p>
    <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
    <p className="text-lg text-slate-600">
      The page you requested does not exist.
    </p>
    <Link
      className="inline-flex rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      to="/"
    >
      Return home
    </Link>
  </section>
);
