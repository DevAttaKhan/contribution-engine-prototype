import { Outlet } from "react-router";

export const PublicLayout = () => (
  <div className="min-h-screen bg-slate-100">
    <Outlet />
  </div>
);
