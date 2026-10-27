import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import routes from "./route-registry.json";
import { demo, resetDemoMemoryForTests } from "./services/demo";
import raw from "./data/catalog.json";
beforeEach(async () => {
  localStorage.clear();
  resetDemoMemoryForTests();
  await demo.progress.update("react-1", { completed: true });
  for (const l of raw.courses[1].lessons)
    await demo.progress.update(l.id, { completed: true });
  await demo.quizzes.submit(
    "react",
    Object.fromEntries(
      raw.courses[1].quiz.questions.map((q) => [q.id, q.correct]),
    ),
  );
  await demo.payments.checkout("design");
});
afterEach(() => cleanup());
describe("Screen rendering with meaningful state", () => {
  for (const route of routes) {
    it(`${route.number}: ${route.title}`, async () => {
      const url =
        (route.example || route.path) +
        (route.number === 19
          ? "?course=design"
          : route.number === 28
            ? "?course=react&lesson=react-1"
            : "");
      window.history.replaceState({}, "", url);
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      const { container } = render(
        <QueryClientProvider client={client}>
          <App />
        </QueryClientProvider>,
      );
      await waitFor(() =>
        expect(container.querySelector("h1,h2")).toBeTruthy(),
      );
      await waitFor(() =>
        expect(
          container.querySelector('[aria-label="Loading"]'),
        ).not.toBeInTheDocument(),
      );
      expect(container.textContent).not.toContain(
        "The page encountered an unexpected error.",
      );
      expect(
        container.querySelector("h1,h2")?.textContent?.length,
      ).toBeGreaterThan(1);
      client.clear();
    });
  }
});
