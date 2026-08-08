import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardBookings } from "../pages/dashboard/DashboardBookings.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          bookings: [
            {
              id: "b1",
              status: "COMPLETED",
              priceAmount: 749,
              scheduledDate: "2020-01-01",
              slotStart: "06:00",
              slotEnd: "09:00",
              service: { name: "Rooftop Solar Cleaning" },
              technician: null,
            },
          ],
        },
      })
    ),
  },
  apiErrorMessage: () => "error",
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardBookings />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DashboardBookings", () => {
  it("renders bookings returned from the API without crashing", async () => {
    renderPage();
    expect(await screen.findByText("Rooftop Solar Cleaning")).toBeInTheDocument();
    expect(screen.getByText("₹749")).toBeInTheDocument();
  });
});
