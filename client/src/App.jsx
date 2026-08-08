import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./components/layout/PublicLayout.jsx";
import { DashboardLayout } from "./components/layout/DashboardLayout.jsx";
import { AdminLayout } from "./components/layout/AdminLayout.jsx";

import { Home } from "./pages/Home.jsx";
import { Services } from "./pages/Services.jsx";
import { AmcPricing } from "./pages/AmcPricing.jsx";
import { HealthAudit } from "./pages/HealthAudit.jsx";
import { About } from "./pages/About.jsx";
import { Contact } from "./pages/Contact.jsx";
import { Login } from "./pages/Login.jsx";
import { BookingWizard } from "./components/booking/BookingWizard.jsx";
import { NotFound } from "./pages/NotFound.jsx";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.jsx";
import { TermsOfService } from "./pages/TermsOfService.jsx";
import { Blog } from "./pages/Blog.jsx";
import { BlogPost } from "./pages/BlogPost.jsx";

import { DashboardProfile } from "./pages/dashboard/DashboardProfile.jsx";
import { DashboardBookings } from "./pages/dashboard/DashboardBookings.jsx";
import { DashboardBookingDetail } from "./pages/dashboard/DashboardBookingDetail.jsx";
import { DashboardPayments } from "./pages/dashboard/DashboardPayments.jsx";
import { DashboardAmc } from "./pages/dashboard/DashboardAmc.jsx";

import { AdminLogin } from "./pages/admin/AdminLogin.jsx";
import { AdminDashboard } from "./pages/admin/AdminDashboard.jsx";
import { AdminServices } from "./pages/admin/AdminServices.jsx";
import { AdminAmcPlans } from "./pages/admin/AdminAmcPlans.jsx";
import { AdminCities } from "./pages/admin/AdminCities.jsx";
import { AdminBookings } from "./pages/admin/AdminBookings.jsx";
import { AdminBookingDetail } from "./pages/admin/AdminBookingDetail.jsx";
import { AdminSettings } from "./pages/admin/AdminSettings.jsx";
import { AdminCustomers } from "./pages/admin/AdminCustomers.jsx";
import { AdminCustomerDetail } from "./pages/admin/AdminCustomerDetail.jsx";
import { AdminBlog } from "./pages/admin/AdminBlog.jsx";
import { AdminBlogEditor } from "./pages/admin/AdminBlogEditor.jsx";
import { AdminPageContent } from "./pages/admin/AdminPageContent.jsx";
import { AdminGeneralQueries } from "./pages/admin/AdminGeneralQueries.jsx";
import { AdminCommercialQueries } from "./pages/admin/AdminCommercialQueries.jsx";
import { AdminPayments } from "./pages/admin/AdminPayments.jsx";
import { AdminReports } from "./pages/admin/AdminReports.jsx";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/amc-plans" element={<AmcPricing />} />
        <Route path="/health-audit" element={<HealthAudit />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/book" element={<BookingWizard />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardProfile />} />
        <Route path="bookings" element={<DashboardBookings />} />
        <Route path="bookings/:id" element={<DashboardBookingDetail />} />
        <Route path="payments" element={<DashboardPayments />} />
        <Route path="amc" element={<DashboardAmc />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="bookings/:id" element={<AdminBookingDetail />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="amc-plans" element={<AdminAmcPlans />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/:id" element={<AdminCustomerDetail />} />
        <Route path="general-queries" element={<AdminGeneralQueries />} />
        <Route path="commercial-queries" element={<AdminCommercialQueries />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="blog/:id" element={<AdminBlogEditor />} />
        <Route path="page-content" element={<AdminPageContent />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
