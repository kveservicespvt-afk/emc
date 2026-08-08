import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { Logo } from "../ui/Logo.jsx";
import { WhatsAppButton } from "./WhatsAppButton.jsx";
import { ErrorBoundary } from "../ErrorBoundary.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";

const LINKS = [
  { to: "/dashboard", label: "Profile", end: true },
  { to: "/dashboard/bookings", label: "My Bookings" },
  { to: "/dashboard/payments", label: "Payment History" },
  { to: "/dashboard/amc", label: "AMC Plans" },
];

export function DashboardLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="section text-center text-gray-500">Loading your dashboard…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/"><Logo /></Link>
          <button onClick={logout} className="text-sm font-medium text-gray-600 hover:text-maroon">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="card sticky top-8 space-y-1 p-3">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-forest text-white" : "text-gray-700 hover:bg-offwhite"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/book" className="btn-primary mt-2 w-full text-sm">
              + New Booking
            </Link>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>

      <WhatsAppButton message="Hi EaseMyClean, I need help with my booking/dashboard." />
    </div>
  );
}
