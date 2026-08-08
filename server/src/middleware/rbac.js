import { forbidden } from "../lib/errors.js";

// requireRole("ADMIN", "STAFF") — allows any of the listed User.role values.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
