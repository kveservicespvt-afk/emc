import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// Centralized error-handling middleware — every route funnels errors here via
// `next(err)` so API error responses always share one JSON shape (Section 5B).
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details ?? null },
    });
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  return res.status(500).json({
    error: { message: "Internal server error", details: null },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}
