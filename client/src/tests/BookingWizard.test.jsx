import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookingWizard } from "../components/booking/BookingWizard.jsx";

vi.mock("../hooks/useAuth.jsx", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Test User" }, loading: false }),
}));

vi.mock("../api/client.js", () => ({
  api: {
    get: vi.fn((url) => {
      if (url === "/services") {
        return Promise.resolve({ data: { services: [{ id: "s1", name: "Rooftop Solar Cleaning", basePrice: 499, pricePerKw: 50 }] } });
      }
      if (url === "/amc-plans") {
        return Promise.resolve({ data: { amcPlans: [] } });
      }
      if (url === "/sites") {
        return Promise.resolve({ data: { sites: [{ id: "site1", label: "Home", plantCapacityKw: 5, mountType: "ROOFTOP", addressJson: { city: "Hisar" } }] } });
      }
      if (url === "/cities?status=LIVE") {
        return Promise.resolve({ data: { cities: [{ id: "city1", name: "Hisar", state: "Haryana" }] } });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(),
  },
  apiErrorMessage: () => "error",
}));

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookingWizard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BookingWizard", () => {
  it("walks to the slot step and only offers SOP-allowed slots (never the 11-3 blocked window)", async () => {
    renderWizard();

    // Step 1: select a service
    const serviceOption = await screen.findByText("Rooftop Solar Cleaning");
    fireEvent.click(serviceOption);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: select the existing site
    const siteOption = await screen.findByText("Home");
    fireEvent.click(siteOption);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3: slot picker
    await waitFor(() => {
      expect(screen.getByText(/Morning \(6 AM/i)).toBeInTheDocument();
      expect(screen.getByText(/Evening \(4 PM/i)).toBeInTheDocument();
    });

    // The blocked 11:00-15:00 window must never be offered as an option.
    expect(screen.queryByText(/11 AM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/12 PM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 PM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 PM/i)).not.toBeInTheDocument();
  });
});
