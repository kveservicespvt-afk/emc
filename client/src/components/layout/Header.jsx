import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Logo } from "../ui/Logo.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/amc-plans", label: "AMC Plans" },
  { to: "/health-audit", label: "Health Audit" },
  { to: "/about", label: "About Us" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact Us" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition hover:text-forest ${isActive ? "text-forest" : "text-gray-700"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to={user ? "/dashboard" : "/login"}
            className="text-sm font-medium text-gray-700 hover:text-forest"
          >
            {user ? `Hi, ${user.name?.split(" ")[0]}` : "Login"}
          </Link>
          <Link to="/book" className="btn-primary !px-5 !py-2.5 text-sm">
            Book a Service
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 5h16M2 10h16M2 15h16" stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-forest"
              >
                {link.label}
              </NavLink>
            ))}
            <Link to={user ? "/dashboard" : "/login"} onClick={() => setOpen(false)} className="text-sm font-medium text-gray-700">
              {user ? "My Dashboard" : "Login"}
            </Link>
            <Link to="/book" onClick={() => setOpen(false)} className="btn-primary text-sm">
              Book a Service
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
