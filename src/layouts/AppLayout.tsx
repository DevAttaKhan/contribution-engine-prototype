import { NavLink, Outlet } from "react-router";

const navigationLinkClasses =
  "rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export const AppLayout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4"
      >
        <NavLink className={navigationLinkClasses} to="/">
          Home
        </NavLink>
        <NavLink className={navigationLinkClasses} to="/about">
          About
        </NavLink>
      </nav>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Outlet />
    </main>
  </div>
);
