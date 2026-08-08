import { verifyToken } from "../lib/jwt.js";
import { unauthorized } from "../lib/errors.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(unauthorized("Missing auth token"));
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role, staffRole: payload.staffRole };
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

// Attaches req.user if a valid token is present, but never rejects the request.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role, staffRole: payload.staffRole };
  } catch {
    // ignore invalid token — treat as anonymous
  }
  next();
}
