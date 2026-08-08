import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { UPLOADS_ROOT } from "./lib/upload.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import amcPlansRoutes from "./routes/amcPlans.routes.js";
import leadsRoutes from "./routes/leads.routes.js";
import roiCalculatorRoutes from "./routes/roiCalculator.routes.js";
import sitesRoutes from "./routes/sites.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import subscriptionsRoutes from "./routes/subscriptions.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import citiesRoutes from "./routes/cities.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import pageContentRoutes from "./routes/pageContent.routes.js";

import adminServicesRoutes from "./routes/admin/services.routes.js";
import adminAmcPlansRoutes from "./routes/admin/amcPlans.routes.js";
import adminCitiesRoutes from "./routes/admin/cities.routes.js";
import adminTechniciansRoutes from "./routes/admin/technicians.routes.js";
import adminDashboardRoutes from "./routes/admin/dashboard.routes.js";
import adminBookingsRoutes from "./routes/admin/bookings.routes.js";
import adminReportsRoutes from "./routes/admin/reports.routes.js";
import adminSettingsRoutes from "./routes/admin/settings.routes.js";
import adminCustomersRoutes from "./routes/admin/customers.routes.js";
import adminBlogRoutes from "./routes/admin/blog.routes.js";
import adminPageContentRoutes from "./routes/admin/pageContent.routes.js";
import adminLeadsRoutes from "./routes/admin/leads.routes.js";
import adminNotesRoutes from "./routes/admin/notes.routes.js";
import adminBadgeCountsRoutes from "./routes/admin/badgeCounts.routes.js";
import adminPaymentsRoutes from "./routes/admin/payments.routes.js";
import adminAnalyticsRoutes from "./routes/admin/analytics.routes.js";

// Exported as a factory (not auto-started) so integration tests can import the app
// without binding a port.
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  app.use("/uploads", express.static(UPLOADS_ROOT));

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/services", servicesRoutes);
  app.use("/api/amc-plans", amcPlansRoutes);
  app.use("/api/leads", leadsRoutes);
  app.use("/api/roi-calculator", roiCalculatorRoutes);
  app.use("/api/sites", sitesRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/subscriptions", subscriptionsRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/cities", citiesRoutes);
  app.use("/api/gallery", galleryRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/page-content", pageContentRoutes);

  app.use("/api/admin/services", adminServicesRoutes);
  app.use("/api/admin/amc-plans", adminAmcPlansRoutes);
  app.use("/api/admin/cities", adminCitiesRoutes);
  app.use("/api/admin/technicians", adminTechniciansRoutes);
  app.use("/api/admin/dashboard-stats", adminDashboardRoutes);
  app.use("/api/admin/bookings", adminBookingsRoutes);
  app.use("/api/admin/bookings", adminReportsRoutes);
  app.use("/api/admin/settings", adminSettingsRoutes);
  app.use("/api/admin/customers", adminCustomersRoutes);
  app.use("/api/admin/blog", adminBlogRoutes);
  app.use("/api/admin/page-content", adminPageContentRoutes);
  app.use("/api/admin/leads", adminLeadsRoutes);
  app.use("/api/admin/notes", adminNotesRoutes);
  app.use("/api/admin/badge-counts", adminBadgeCountsRoutes);
  app.use("/api/admin/payments", adminPaymentsRoutes);
  app.use("/api/admin/analytics", adminAnalyticsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
