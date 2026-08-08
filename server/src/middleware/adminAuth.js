import { requireAuth } from "./auth.js";
import { requireRole } from "./rbac.js";

// Convenience wrapper combining Pass 1's requireAuth + requireRole for every
// admin-only route, so route files don't repeat the same two-middleware pair.
export const requireAdmin = [requireAuth, requireRole("ADMIN", "STAFF")];
