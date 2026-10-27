import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoChat } from "./Social";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("requests media only after a click and releases tracks when leaving", async () => {
  const stop = vi.fn();
  const tracks = [{ stop, enabled: true }];
  const getUserMedia = vi
    .fn()
    .mockResolvedValue({
      getTracks: () => tracks,
      getAudioTracks: () => tracks,
      getVideoTracks: () => tracks,
    });
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VideoChat />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(getUserMedia).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Start local preview" }),
  );
  await waitFor(() =>
    expect(
      screen.getByText(
        "DEMO · Local camera preview only. No remote participant.",
      ),
    ).toBeVisible(),
  );
  expect(getUserMedia).toHaveBeenCalledOnce();
  unmount();
  expect(stop).toHaveBeenCalledOnce();
  client.clear();
});
