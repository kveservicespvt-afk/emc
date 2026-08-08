import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { Logo } from "../ui/Logo.jsx";
import { ErrorBoundary } from "../ErrorBoundary.jsx";
import { useAdminAuth } from "../../hooks/useAdminAuth.jsx";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/leads", label: "Leads" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/amc-plans", label: "AMC Plans" },
  { to: "/admin/cities", label: "Cities" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/page-content", label: "Page Content" },
  { to: "/admin/settings", label: "Site Settings" },
];

export function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();

  if (loading) {
    return <div className="section text-center text-gray-500">Loading admin panel…</div>;
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-offwhite">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink text-white md:flex">
        <div className="border-b border-white/10 p-5">
          <Link to="/admin"><Logo height={34} /></Link>
          <p className="mt-1 text-xs text-white/50">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-forest text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-white/50">{admin.name}</p>
          <button onClick={logout} className="mt-1 text-sm font-medium text-sky hover:text-sky-light">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-6 lg:p-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
